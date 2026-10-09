import gsap from 'gsap';
import type { DisplayCard, SchoolEvent, ThemeId } from '../domain/timeline';
import { themes, themeIds } from '../config/themes';
import { sceneConfig } from '../config/scene';
import {
  anchor,
  yearLabelOffsets,
  browseStackZ,
  cardPose,
  chronologicalStackZ,
  direction,
  isOnscreen,
  lengths,
  trackEndpoints,
  groupPhotoDisplacement,
  transform,
  type SceneValues,
  type Viewport,
  type Pose,
} from './layout';
import { clamp, timeScale, rebaseFocus } from './timeScale';
import { wheelPixels, dragProjection } from './input';
import { detailReducer, initialDetail, type DetailState } from './timelineReducer';
import { detailPhotoRects, detailPose, extractPose, smoothStep } from './detailLayout';
import {
  constrainPhotoPan,
  initialPhotoZoom,
  maxSharpScale,
  zoomPhotoAt,
  type PhotoSize,
  type PhotoZoomState,
} from './photoZoom';
import { eventPositions } from './albumTrack';

export class TimelineController {
  values: SceneValues;
  view: Viewport;
  focusedId: string;
  mode: 'overview' | 'browse' = 'overview';
  blocked = false;
  private disposed = false;
  private dirty = true;
  private nodes: { card: DisplayCard; el: HTMLButtonElement }[];
  private stackIndices = new Map<string, number>();
  private observer: ResizeObserver;
  private drag: {
    id: number;
    x: number;
    y: number;
    focus: number;
    moved: boolean;
    tappedEventId?: string;
  } | null = null;
  private suppressClick = false;
  private touchClick: { x: number; y: number; time: number } | null = null;
  private lastYear = -1;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private events: SchoolEvent[];
  private themeScales: Record<ThemeId, number> = { A: 1, B: 1, C: 1, D: 1, E: 1 };
  private activeTheme: ThemeId | null = null;
  private detailState: DetailState = initialDetail;
  private detail = { progress: 0 };
  private returnFocus: HTMLElement | null = null;
  private lastEventId = '';
  private restoreFrame = 0;
  private positions = new Map<string, number>();
  private wheelTarget: number | null = null;
  private rendered = new Map<string, Pose>();
  private openingSources = new Map<string, Pose>();
  private closingSources = new Map<string, Pose>();
  private closeStart = 1;
  private lastTrackPoseKey = '';
  private photoZooms = new Map<string, PhotoZoomState>();
  private photoPointers = new Map<number, { cardId: string; x: number; y: number }>();
  private photoGesture: {
    cardId: string;
    start: PhotoZoomState;
    centerX: number;
    centerY: number;
    distance: number;
  } | null = null;
  private groupForEvent(eventId: string | null) {
    return this.events.find((event) => event.id === eventId)?.photoGroupId;
  }
  constructor(
    private root: HTMLDivElement,
    cards: DisplayCard[],
    endYear: number,
    overviewYears: readonly number[],
    private onChange: (year: number, eventId: string) => void,
    private onMode: (mode: 'overview' | 'browse') => void,
    private onDetail: (state: DetailState) => void,
  ) {
    this.values = { focus: 0, zoom: 0, endYear, overviewYears };
    this.view = { width: root.clientWidth, height: root.clientHeight };
    this.events = [...new Map(cards.map((c) => [c.event.id, c.event])).values()];
    this.positions = eventPositions(this.events, endYear);
    this.focusedId = this.events[0].id;
    const elements = new Map(
      Array.from(root.querySelectorAll<HTMLButtonElement>('[data-card-id]')).map((el) => [
        el.dataset.cardId,
        el,
      ]),
    );
    this.nodes = cards.map((card) => ({ card, el: elements.get(card.id)! }));
    this.stackIndices = new Map(cards.map((card, index) => [card.id, index]));
    this.observer = new ResizeObserver(() => {
      gsap.to(this.view, {
        width: root.clientWidth,
        height: root.clientHeight,
        duration: this.reduced.matches ? 0 : 0.2,
        overwrite: true,
        onUpdate: () => {
          this.dirty = true;
        },
      });
    });
    this.observer.observe(root);
    root.addEventListener('wheel', this.wheel, { passive: false });
    root.addEventListener('pointerdown', this.down);
    root.addEventListener('pointermove', this.move);
    root.addEventListener('pointerup', this.up);
    root.addEventListener('pointercancel', this.cancel);
    root.addEventListener('lostpointercapture', this.cancel);
    window.addEventListener('click', this.click, true);
    window.addEventListener('blur', this.cancel);
    gsap.ticker.add(this.tick);
    this.tick();
  }
  private animate(values: Partial<typeof this.values>, duration = sceneConfig.wheelDuration) {
    gsap.to(this.values, {
      ...values,
      duration: this.reduced.matches ? 0 : duration,
      ease: 'power3.out',
      overwrite: 'auto',
      onUpdate: () => {
        this.dirty = true;
      },
    });
  }
  setTheme(theme: ThemeId | null) {
    this.activeTheme = theme;
    const target = Object.fromEntries(
      themeIds.map((id) => [
        id,
        theme === null ? 1 : id === theme ? sceneConfig.themeLarge : sceneConfig.themeSmall,
      ]),
    );
    gsap.to(this.themeScales, {
      ...target,
      duration: this.reduced.matches ? 0 : 0.7,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        this.dirty = true;
      },
    });
    this.root
      .closest<HTMLElement>('.museum-app')
      ?.style.setProperty('--theme-accent', theme ? themes[theme].color : '#796e5d');
  }
  updateData(cards: DisplayCard[], endYear: number, overviewYears: readonly number[]) {
    if (this.values.endYear !== endYear) this.rebase(endYear);
    this.values.overviewYears = overviewYears;
    this.events = [...new Map(cards.map((c) => [c.event.id, c.event])).values()];
    this.positions = eventPositions(this.events, endYear);
    const elements = new Map(
      Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-card-id]')).map((el) => [
        el.dataset.cardId,
        el,
      ]),
    );
    this.nodes = cards.map((card) => ({ card, el: elements.get(card.id)! }));
    this.stackIndices = new Map(cards.map((card, index) => [card.id, index]));
    this.lastTrackPoseKey = '';
    this.dirty = true;
  }
  open(eventId: string) {
    if (
      this.blocked ||
      this.drag?.moved ||
      !this.events.some((e) => e.id === eventId) ||
      (this.activeTheme && this.events.find((event) => event.id === eventId)?.themeId !== this.activeTheme)
    )
      return;
    const next = detailReducer(this.detailState, { type: 'open', eventId });
    if (next === this.detailState) return;
    this.resetPhotoZoom();
    this.returnFocus = document.activeElement as HTMLElement;
    gsap.killTweensOf(this.values);
    this.wheelTarget = null;
    this.root.dataset.targetFocus = String(this.values.focus);
    this.openingSources = new Map(
      this.nodes
        .filter((node) => node.card.event.photoGroupId === this.groupForEvent(eventId))
        .map(({ card }) => [card.id, { ...(this.rendered.get(card.id) ?? this.albumPose(card)) }]),
    );
    this.closingSources.clear();
    this.blocked = true;
    this.detailState = next;
    this.root.dataset.phase = next.phase;
    this.onDetail(next);
    const token = next.token;
    gsap.to(this.detail, {
      progress: 1,
      duration: this.reduced.matches ? 0 : 1.05,
      ease: 'none',
      overwrite: true,
      onUpdate: () => {
        this.dirty = true;
      },
      onComplete: () => {
        this.detailState = detailReducer(this.detailState, { type: 'opened', token });
        this.root.dataset.phase = this.detailState.phase;
        this.onDetail(this.detailState);
        this.dirty = true;
      },
    });
    this.dirty = true;
  }
  close() {
    const next = detailReducer(this.detailState, { type: 'close' });
    if (next === this.detailState) return;
    this.resetPhotoZoom();
    this.closeStart = this.detail.progress;
    this.closingSources = new Map(
      this.nodes
        .filter(
          (node) => node.card.event.photoGroupId === this.groupForEvent(this.detailState.eventId),
        )
        .map(({ card }) => [card.id, { ...(this.rendered.get(card.id) ?? this.albumPose(card)) }]),
    );
    this.detailState = next;
    this.root.dataset.phase = next.phase;
    this.onDetail(next);
    const token = next.token;
    gsap.to(this.detail, {
      progress: 0,
      duration: this.reduced.matches ? 0 : 0.85,
      ease: 'none',
      overwrite: true,
      onUpdate: () => {
        this.dirty = true;
      },
      onComplete: () => {
        this.detailState = detailReducer(this.detailState, { type: 'closed', token });
        this.root.dataset.phase = this.detailState.phase;
        this.blocked = false;
        this.onDetail(this.detailState);
        this.dirty = true;
        this.tick();
        this.restoreFrame = requestAnimationFrame(() => {
          if (this.disposed) return;
          const target =
            this.returnFocus?.isConnected &&
            getComputedStyle(this.returnFocus).visibility !== 'hidden'
              ? this.returnFocus
              : document.querySelector<HTMLElement>('[data-testid="view-browse"]');
          target?.focus({ preventScroll: true });
        });
        this.setMode(this.mode);
      },
    });
  }
  setMode(mode: 'overview' | 'browse') {
    if (this.blocked) return;
    if (mode === this.mode && this.values.zoom === (mode === 'browse' ? 1 : 0)) return;
    this.mode = mode;
    this.onMode(mode);
    this.animate({ zoom: mode === 'browse' ? 1 : 0 }, 0.8);
  }
  startMode(mode: 'overview' | 'browse') {
    if (this.blocked) return;
    this.wheelTarget = null;
    gsap.killTweensOf(this.values, 'focus');
    this.values.focus = 0;
    this.root.dataset.targetFocus = '0';
    this.lastYear = -1;
    this.dirty = true;
    this.setMode(mode);
    this.tick();
  }
  navigate(unit: number, id?: string) {
    if (this.blocked) return;
    this.wheelTarget = null;
    this.setMode('browse');
    const target = id
      ? timeScale(this.values.endYear).toUnit(this.positions.get(id)!)
      : clamp(unit);
    this.root.dataset.targetFocus = String(target);
    this.animate({ focus: target });
    this.lastYear = -1;
  }
  goYear(year: number) {
    this.navigate(timeScale(this.values.endYear).toUnit(year));
  }
  step(direction: number) {
    const i = this.events.findIndex((e) => e.id === this.focusedId);
    const event = this.events[clamp(i + direction, 0, this.events.length - 1)];
    this.navigate(timeScale(this.values.endYear).toUnit(event.year), event.id);
  }
  rebase(endYear: number) {
    gsap.killTweensOf(this.values);
    this.values.focus = rebaseFocus(this.values.focus, this.values.endYear, endYear);
    this.values.endYear = endYear;
    this.root.dataset.targetFocus = String(this.values.focus);
    this.wheelTarget = null;
    this.dirty = true;
  }
  private nearest(unit: number) {
    const year = timeScale(this.values.endYear).toYear(unit);
    return this.events.reduce((best, event) =>
      Math.abs(this.positions.get(event.id)! - year) < Math.abs(this.positions.get(best.id)! - year)
        ? event
        : best,
    );
  }
  private photoSize(card: HTMLButtonElement): PhotoSize | null {
    const image = card.querySelector<HTMLImageElement>('.photo-image');
    if (!image?.naturalWidth || !image.naturalHeight || !card.clientWidth || !card.clientHeight)
      return null;
    return {
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      viewportWidth: card.clientWidth,
      viewportHeight: card.clientHeight,
    };
  }
  private photoAnchor(card: HTMLButtonElement, x: number, y: number) {
    const rect = card.getBoundingClientRect();
    return { x: x - rect.left - rect.width / 2, y: y - rect.top - rect.height / 2 };
  }
  private applyPhotoZoom(card: HTMLButtonElement, state: PhotoZoomState) {
    this.photoZooms.set(card.dataset.cardId!, state);
    const image = card.querySelector<HTMLImageElement>('.photo-image');
    if (image) {
      if (state.scale > 1.001)
        image.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
      else image.style.removeProperty('transform');
    }
    card.dataset.photoScale = state.scale.toFixed(3);
    card.dataset.photoZoomed = String(state.scale > 1.001);
  }
  private resetPhotoZoom() {
    const pointerIds = [...this.photoPointers.keys()];
    this.photoPointers.clear();
    this.photoGesture = null;
    for (const id of pointerIds)
      if (this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    for (const { el } of this.nodes) {
      el.querySelector<HTMLElement>('.photo-image')?.style.removeProperty('transform');
      delete el.dataset.photoScale;
      delete el.dataset.photoZoomed;
      delete el.dataset.photoPanning;
    }
    this.photoZooms.clear();
  }
  private beginPhotoGesture(cardId: string) {
    const card = this.nodes.find(({ card }) => card.id === cardId)?.el;
    const points = [...this.photoPointers.values()].filter((point) => point.cardId === cardId);
    if (!card || !points.length) {
      this.photoGesture = null;
      return;
    }
    const center = this.photoAnchor(
      card,
      points.reduce((sum, point) => sum + point.x, 0) / points.length,
      points.reduce((sum, point) => sum + point.y, 0) / points.length,
    );
    this.photoGesture = {
      cardId,
      start: { ...(this.photoZooms.get(cardId) ?? initialPhotoZoom) },
      centerX: center.x,
      centerY: center.y,
      distance: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
    };
  }
  private startPhotoPointer(e: PointerEvent) {
    if (this.detailState.phase !== 'detail' || e.button !== 0 || !(e.target instanceof Element))
      return;
    const card = e.target.closest<HTMLButtonElement>('.photo-card-image[data-extracted="true"]');
    if (!card || !this.photoSize(card) || this.photoPointers.size >= 2) return;
    const cardId = card.dataset.cardId!;
    if ([...this.photoPointers.values()].some((point) => point.cardId !== cardId)) return;
    if (e.pointerType === 'mouse' && (this.photoZooms.get(cardId)?.scale ?? 1) <= 1) return;
    this.photoPointers.set(e.pointerId, { cardId, x: e.clientX, y: e.clientY });
    this.root.setPointerCapture(e.pointerId);
    this.beginPhotoGesture(cardId);
    card.dataset.photoPanning = String((this.photoZooms.get(cardId)?.scale ?? 1) > 1);
    e.preventDefault();
  }
  private movePhotoPointer(e: PointerEvent) {
    const pointer = this.photoPointers.get(e.pointerId);
    if (!pointer) return false;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    const card = this.nodes.find(({ card }) => card.id === pointer.cardId)?.el;
    const size = card && this.photoSize(card);
    const gesture = this.photoGesture;
    if (!card || !size || !gesture || gesture.cardId !== pointer.cardId) return true;
    const points = [...this.photoPointers.values()].filter((point) => point.cardId === pointer.cardId);
    const center = this.photoAnchor(
      card,
      points.reduce((sum, point) => sum + point.x, 0) / points.length,
      points.reduce((sum, point) => sum + point.y, 0) / points.length,
    );
    let state: PhotoZoomState;
    if (points.length === 2 && gesture.distance > 0) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const zoomed = zoomPhotoAt(
        gesture.start,
        (gesture.start.scale * distance) / gesture.distance,
        gesture.centerX,
        gesture.centerY,
        size,
        window.devicePixelRatio || 1,
      );
      state = constrainPhotoPan(
        {
          ...zoomed,
          x: zoomed.x + center.x - gesture.centerX,
          y: zoomed.y + center.y - gesture.centerY,
        },
        size,
      );
    } else {
      state = constrainPhotoPan(
        {
          scale: gesture.start.scale,
          x: gesture.start.x + center.x - gesture.centerX,
          y: gesture.start.y + center.y - gesture.centerY,
        },
        size,
      );
    }
    this.applyPhotoZoom(card, state);
    e.preventDefault();
    return true;
  }
  private endPhotoPointer(id: number) {
    const pointer = this.photoPointers.get(id);
    if (!pointer) return false;
    this.photoPointers.delete(id);
    if (this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    const card = this.nodes.find(({ card }) => card.id === pointer.cardId)?.el;
    if (card) card.dataset.photoPanning = 'false';
    this.beginPhotoGesture(pointer.cardId);
    return true;
  }
  private wheel = (e: WheelEvent) => {
    if (this.blocked) {
      const card =
        this.detailState.phase === 'detail' && e.target instanceof Element
          ? e.target.closest<HTMLButtonElement>('.photo-card-image[data-extracted="true"]')
          : null;
      if (card) {
        e.preventDefault();
        const size = this.photoSize(card);
        if (!size) return;
        const previous = this.photoZooms.get(card.dataset.cardId!) ?? initialPhotoZoom;
        const anchor = this.photoAnchor(card, e.clientX, e.clientY);
        this.applyPhotoZoom(
          card,
          zoomPhotoAt(
            previous,
            previous.scale * Math.exp(-wheelPixels(0, e.deltaY, e.deltaMode, this.view.height) * 0.002),
            anchor.x,
            anchor.y,
            size,
            window.devicePixelRatio || 1,
          ),
        );
      }
      return;
    }
    if ((e.target as HTMLElement).closest('.education-panel')) return;
    e.preventDefault();
    this.setMode('browse');
    const current = this.wheelTarget ?? Number(this.root.dataset.targetFocus ?? this.values.focus);
    this.wheelTarget = clamp(
      current +
        (wheelPixels(e.deltaX, e.deltaY, e.deltaMode, this.view.height) *
          sceneConfig.wheelSensitivity) /
          lengths(this.view).browse,
    );
    const target = timeScale(this.values.endYear).toUnit(
      this.positions.get(this.nearest(this.wheelTarget).id)!,
    );
    this.root.dataset.targetFocus = String(target);
    this.animate({ focus: target }, sceneConfig.wheelDuration);
  };
  private down = (e: PointerEvent) => {
    if (this.blocked) {
      this.startPhotoPointer(e);
      return;
    }
    if (
      e.button !== 0 ||
      (e.target as HTMLElement).closest('.education-panel,.education-dot,.upper-rail-marker')
    )
      return;
    this.suppressClick = false;
    this.touchClick = null;
    this.wheelTarget = null;
    this.drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      focus: this.values.focus,
      moved: false,
      tappedEventId:
        e.pointerType === 'touch'
          ? (e.target instanceof Element ? e.target.closest<HTMLElement>('.photo-card') : null)
              ?.dataset.eventId
          : undefined,
    };
  };
  private move = (e: PointerEvent) => {
    if (this.movePhotoPointer(e)) return;
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < (e.pointerType === 'touch' ? 24 : 6)) return;
    if (!drag.moved) {
      drag.moved = true;
      this.root.setPointerCapture(e.pointerId);
      this.setMode('browse');
      this.root.dataset.phase = 'dragging';
    }
    gsap.killTweensOf(this.values, 'focus');
    this.values.focus = clamp(
      drag.focus -
        (dragProjection(dx, dy) * sceneConfig.dragSensitivity) / lengths(this.view).browse,
    );
    this.root.dataset.targetFocus = String(this.values.focus);
    this.dirty = true;
  };
  private up = (e: PointerEvent) => {
    if (this.endPhotoPointer(e.pointerId) || this.blocked) return;
    const tappedEventId =
      e.pointerType === 'touch' && this.drag?.id === e.pointerId && !this.drag.moved
        ? this.drag.tappedEventId
        : undefined;
    if (this.drag?.moved) this.suppressClick = true;
    this.cancel();
    if (tappedEventId) {
      this.touchClick = { x: e.clientX, y: e.clientY, time: performance.now() };
      this.open(tappedEventId);
    }
  };
  private cancel = (e?: Event) => {
    if (e && 'pointerId' in e && this.endPhotoPointer(Number(e.pointerId))) return;
    if (!e || e.type === 'blur') {
      for (const id of [...this.photoPointers.keys()]) this.endPhotoPointer(id);
    }
    const id = this.drag?.id;
    if (this.drag?.moved) this.suppressClick = true;
    this.drag = null;
    if (id !== undefined && this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    if (!this.blocked) this.root.dataset.phase = 'idle';
  };
  private click = (e: MouseEvent) => {
    const touchClick = this.touchClick;
    this.touchClick = null;
    if (
      (touchClick &&
        performance.now() - touchClick.time < 600 &&
        Math.hypot(e.clientX - touchClick.x, e.clientY - touchClick.y) < 32) ||
      (this.suppressClick && e.target instanceof Node && this.root.contains(e.target))
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.suppressClick = false;
    }
  };
  private albumPose(card: DisplayCard): Pose {
    const position = this.positions.get(card.event.id)!;
    const p = cardPose(card, this.view, this.values, position);
    p.scale = this.themeScales[card.event.themeId];
    const smallestScale = Math.min(...themeIds.map((id) => this.themeScales[id]));
    const lineMix = clamp((1 - smallestScale) / (1 - sceneConfig.themeSmall));
    if (card.event.photos.length > 1 && card.photo) {
      const index = card.event.photos.findIndex((photo) => photo.id === card.photo!.id);
      const displacement = groupPhotoDisplacement(
        index,
        card.event.photos.length,
        this.values.zoom,
        p.scale,
        lineMix,
      );
      p.x += displacement.x;
      p.y += displacement.y;
    }
    if (this.values.zoom > 0.01) {
      p.z = browseStackZ(card, timeScale(this.values.endYear).toYear(this.values.focus), position);
    }
    if (lineMix > 0) p.z = chronologicalStackZ(this.stackIndices.get(card.id)!);
    return p;
  }
  private placeUpperYearLabels() {
    const markers = Array.from(this.root.querySelectorAll<HTMLElement>('[data-upper-year]'));
    if (this.values.zoom < 0.9 || this.blocked) {
      markers.forEach((marker) => (marker.dataset.labelVisible = 'true'));
      return;
    }
    const visibleCards = this.nodes.filter(({ el }) => el.style.visibility === 'visible');
    const cardBoxes = new Map<HTMLElement, DOMRect>();
    type Box = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
    const placedLabels: Box[] = [];
    const updates: { marker: HTMLElement; offset: number; visible: boolean }[] = [];
    const overlaps = (a: Box, b: Box) =>
      a.left < b.right + 2 && a.right + 2 > b.left && a.top < b.bottom + 2 && a.bottom + 2 > b.top;
    for (const marker of markers) {
      if (marker.style.visibility !== 'visible') continue;
      const label = marker.querySelector<HTMLElement>('.upper-year-label');
      if (!label) continue;
      const x = Number.parseFloat(marker.style.left);
      const y = Number.parseFloat(marker.style.top);
      const nearby = visibleCards.filter(({ card }) => {
        const pose = this.rendered.get(card.id);
        return pose && Math.abs(pose.x - x) < 260 && Math.abs(pose.y - y) < 260;
      });
      const preferred = Number.parseFloat(marker.style.getPropertyValue('--year-label-y'));
      const offsets = [...new Set([preferred, -20, -38, -56, -74, -92, -110])];
      // Measure once, then test translated boxes without forcing a layout after each candidate.
      const original = label.getBoundingClientRect();
      let placed = false;
      for (const offset of offsets) {
        const delta = offset - preferred;
        const box = {
          left: original.left,
          right: original.right,
          top: original.top + delta,
          bottom: original.bottom + delta,
        };
        if (box.top < 0 || box.bottom > this.view.height) continue;
        if (placedLabels.some((other) => overlaps(box, other))) continue;
        if (nearby.some(({ el }) => {
          let cardBox = cardBoxes.get(el);
          if (!cardBox) {
            cardBox = el.getBoundingClientRect();
            cardBoxes.set(el, cardBox);
          }
          return overlaps(box, cardBox);
        })) continue;
        placedLabels.push(box);
        placed = true;
        updates.push({ marker, offset, visible: true });
        break;
      }
      if (!placed) updates.push({ marker, offset: preferred, visible: false });
    }
    for (const marker of markers)
      if (marker.style.visibility !== 'visible') marker.dataset.labelVisible = 'true';
    for (const { marker, offset, visible } of updates) {
      marker.style.setProperty('--year-label-y', `${offset}px`);
      marker.dataset.labelVisible = String(visible);
    }
  }
  private tick = () => {
    if (!this.dirty || this.disposed) return;
    this.dirty = false;
    this.root.dataset.focus = this.values.focus.toFixed(6);
    this.root.dataset.zoom = this.values.zoom.toFixed(4);
    this.focusedId = this.nearest(this.values.focus).id;
    this.root.dataset.focusedEvent = this.focusedId;
    const year = Math.round(timeScale(this.values.endYear).toYear(this.values.focus));
    if (year !== this.lastYear || this.focusedId !== this.lastEventId) {
      this.lastYear = year;
      this.lastEventId = this.focusedId;
      this.onChange(year, this.focusedId);
    }
    this.root
      .closest<HTMLElement>('.museum-app')
      ?.style.setProperty('--detail-progress', String(this.detail.progress));
    this.root.dataset.detailProgress = this.detail.progress.toFixed(4);
    const selected = this.nodes.filter(
        (n) => n.card.event.photoGroupId === this.groupForEvent(this.detailState.eventId),
      ),
      selectedEvent = this.events.find((event) => event.id === this.detailState.eventId),
      hasPhotoSurface = Boolean(
        selectedEvent?.photos.some((photo) => photo.kind !== 'placeholder'),
      ),
      showDetailText = Boolean(
        hasPhotoSurface &&
        selectedEvent &&
        [...Object.values(selectedEvent.title), ...Object.values(selectedEvent.body)].some(
          (value) => value?.trim(),
        ),
      ),
      rects = detailPhotoRects(
        selected.map((n) => n.card),
        this.view,
        showDetailText,
        window.devicePixelRatio || 1,
      );
    const scrim = this.root.querySelector<HTMLElement>('.detail-scrim');
    if (scrim) scrim.hidden = !this.blocked;
    for (const { card, el } of this.nodes) {
      let p = this.albumPose(card);
      const selectedIndex = selected.findIndex((n) => n.card.id === card.id),
        extracted = selectedIndex >= 0;
      if (extracted) {
        if (this.detailState.phase === 'closing') {
          const progress = this.closeStart > 0 ? this.detail.progress / this.closeStart : 0;
          p = extractPose(p, this.closingSources.get(card.id)!, progress);
        } else {
          p = extractPose(
            this.openingSources.get(card.id)!,
            detailPose(rects[selectedIndex]),
            this.detail.progress,
          );
        }
      } else if (selected.length) {
        const side = Math.sign(
          this.positions.get(card.event.id)! - this.positions.get(selected[0].card.event.id)!,
        );
        const retreat =
          side * Math.min(190, this.view.width * 0.13) * smoothStep(this.detail.progress);
        p.x += direction.x * retreat;
        p.y += direction.y * retreat;
      }
      const visible = extracted || isOnscreen(p, this.view);
      const themeVisible = !this.activeTheme || card.event.themeId === this.activeTheme,
        visibility = visible ? 'visible' : 'hidden',
        tabIndex = visible && themeVisible && !this.blocked ? 0 : -1,
        pointer = (this.blocked && !(extracted && this.detailState.phase === 'detail' && card.photo?.kind === 'image')) || !themeVisible ? 'none' : '';
      if (el.style.visibility !== visibility) {
        el.style.visibility = visibility;
        el.style.willChange = visible ? 'transform' : 'auto';
      }
      if (el.tabIndex !== tabIndex) el.tabIndex = tabIndex;
      if (el.style.pointerEvents !== pointer) el.style.pointerEvents = pointer;
      if (el.dataset.extracted !== String(extracted)) el.dataset.extracted = String(extracted);
      if (!visible) continue;
      const width = Number(p.width.toFixed(2)) + 'px',
        height = Number(p.height.toFixed(2)) + 'px',
        letter = Number((p.width * 0.34).toFixed(2)) + 'px';
      if (el.style.width !== width) el.style.width = width;
      if (el.style.height !== height) el.style.height = height;
      const zoom = this.photoZooms.get(card.id);
      if (zoom && extracted && this.detailState.phase === 'detail') {
        const size = this.photoSize(el);
        if (size) {
          const adjusted = constrainPhotoPan(
            { ...zoom, scale: Math.min(zoom.scale, maxSharpScale(size, window.devicePixelRatio || 1)) },
            size,
          );
          if (adjusted.scale !== zoom.scale || adjusted.x !== zoom.x || adjusted.y !== zoom.y)
            this.applyPhotoZoom(el, adjusted);
        }
      }
      el.style.transform = transform(p);
      this.rendered.set(card.id, { ...p });
      const zIndex = extracted && this.detailState.phase === 'detail' && card.photo?.kind === 'image' ? 2075 : p.z;
      if (el.style.zIndex !== String(zIndex)) el.style.zIndex = String(zIndex);
      if (el.style.getPropertyValue('--letter-size') !== letter)
        el.style.setProperty('--letter-size', letter);
    }
    const trackPoseKey = [
      this.values.focus,
      this.values.zoom,
      this.values.endYear,
      this.view.width,
      this.view.height,
      this.blocked,
      this.activeTheme,
    ].join(':');
    if (trackPoseKey !== this.lastTrackPoseKey) {
      this.lastTrackPoseKey = trackPoseKey;
      const upperOffsets = yearLabelOffsets(
        Array.from(this.root.querySelectorAll<HTMLElement>('[data-upper-year]'), (el) =>
          Number(el.dataset.upperYear),
        ),
        'upper',
        this.view,
        this.values,
      );
      const educationOffsets = yearLabelOffsets(
        Array.from(
          this.root.querySelectorAll<HTMLElement>('[data-education-year],[data-education-label]'),
          (el) => Number(el.dataset.educationYear ?? el.dataset.educationLabel),
        ),
        'education',
        this.view,
        this.values,
      );
      this.root
        .querySelectorAll<HTMLElement>(
          '[data-education-label],[data-education-year],[data-upper-year]',
        )
        .forEach((el) => {
          const lane = el.dataset.upperYear
              ? 'upper'
              : el.dataset.educationYear || el.dataset.educationLabel
                ? 'education'
                : 'axis',
            year = Number(
              el.dataset.upperYear ?? el.dataset.educationYear ?? el.dataset.educationLabel,
            ),
            p = anchor(year, lane, this.view, this.values);
          el.style.left = p.x + 'px';
          el.style.top = p.y + 'px';
          el.style.setProperty(
            '--year-label-y',
            `${lane === 'upper' ? (upperOffsets.get(year) ?? -20) : (educationOffsets.get(year) ?? 20)}px`,
          );
          el.style.setProperty(
            '--year-label-x',
            `${Math.min(this.view.width - 15, Math.max(15, p.x)) - p.x}px`,
          );
          const visible = p.x >= 0 && p.x <= this.view.width && p.y >= 0 && p.y <= this.view.height;
          el.style.visibility = visible ? 'visible' : 'hidden';
          const interactive = Boolean(el.dataset.upperYear || el.dataset.educationYear);
          el.tabIndex = interactive && visible && !this.blocked ? 0 : -1;
          el.style.pointerEvents = this.blocked ? 'none' : '';
        });
      this.root.querySelectorAll<SVGLineElement>('[data-track]').forEach((el) => {
        const lane = el.dataset.track as 'axis' | 'upper' | 'education',
          { first: a, last: b } = trackEndpoints(lane, this.view, this.values);
        el.setAttribute('x1', String(a.x));
        el.setAttribute('y1', String(a.y));
        el.setAttribute('x2', String(b.x));
        el.setAttribute('y2', String(b.y));
      });
      this.placeUpperYearLabels();
    }
  };
  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.restoreFrame);
    gsap.killTweensOf(this.view);
    gsap.killTweensOf(this.detail);
    gsap.killTweensOf(this.values);
    gsap.killTweensOf(this.themeScales);
    gsap.killTweensOf(this.root.closest('.museum-app'));
    gsap.ticker.remove(this.tick);
    this.observer.disconnect();
    this.resetPhotoZoom();
    this.cancel();
    this.root.removeEventListener('wheel', this.wheel);
    this.root.removeEventListener('pointerdown', this.down);
    this.root.removeEventListener('pointermove', this.move);
    this.root.removeEventListener('pointerup', this.up);
    this.root.removeEventListener('pointercancel', this.cancel);
    this.root.removeEventListener('lostpointercapture', this.cancel);
    window.removeEventListener('click', this.click, true);
    window.removeEventListener('blur', this.cancel);
  }
}
