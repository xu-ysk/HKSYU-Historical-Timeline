import gsap from 'gsap';
import type { DisplayCard, SchoolEvent, ThemeId } from '../domain/timeline';
import { themes, themeIds } from '../config/themes';
import { sceneConfig } from '../config/scene';
import {
  anchor,
  browseStackZ,
  cardPose,
  direction,
  isOnscreen,
  lengths,
  normal,
  transform,
  type Viewport,
} from './layout';
import { clamp, timeScale, rebaseFocus } from './timeScale';
import { wheelPixels, dragProjection } from './input';
import { detailReducer, initialDetail, type DetailState } from './timelineReducer';
import { detailPhotoRects, detailPose, mixPose } from './detailLayout';

export class TimelineController {
  values: { focus: number; zoom: number; endYear: number };
  view: Viewport;
  focusedId: string;
  mode: 'overview' | 'browse' = 'overview';
  blocked = false;
  private disposed = false;
  private dirty = true;
  private nodes: { card: DisplayCard; el: HTMLButtonElement }[];
  private observer: ResizeObserver;
  private drag: { id: number; x: number; y: number; focus: number; moved: boolean } | null = null;
  private suppressClick = false;
  private lastYear = -1;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private events: SchoolEvent[];
  private themeScales: Record<ThemeId, number> = { A: 1, B: 1, C: 1, D: 1, E: 1 };
  private detailState: DetailState = initialDetail;
  private detail = { progress: 0 };
  private returnFocus: HTMLElement | null = null;
  private lastEventId = '';
  private restoreFrame = 0;
  private spot = { ordinal: 0 };
  private eventOrdinals = new Map<string, number>();
  constructor(
    private root: HTMLDivElement,
    cards: DisplayCard[],
    endYear: number,
    private onChange: (year: number, eventId: string) => void,
    private onMode: (mode: 'overview' | 'browse') => void,
    private onDetail: (state: DetailState) => void,
  ) {
    this.values = { focus: 0, zoom: 0, endYear };
    this.view = { width: root.clientWidth, height: root.clientHeight };
    this.events = [...new Map(cards.map((c) => [c.event.id, c.event])).values()];
    this.eventOrdinals = new Map(this.events.map((e, i) => [e.id, i]));
    this.focusedId = this.events[0].id;
    const elements = new Map(
      Array.from(root.querySelectorAll<HTMLButtonElement>('[data-card-id]')).map((el) => [
        el.dataset.cardId,
        el,
      ]),
    );
    this.nodes = cards.map((card) => ({ card, el: elements.get(card.id)! }));
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
    root.addEventListener('click', this.click, true);
    window.addEventListener('blur', this.cancel);
    gsap.ticker.add(this.tick);
    this.tick();
  }
  private animate(values: Partial<typeof this.values>, duration = 0.65) {
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
    const target = Object.fromEntries(
      themeIds.map((id) => [
        id,
        theme === null ? 1 : id === theme ? sceneConfig.themeLarge : sceneConfig.themeSmall,
      ]),
    );
    gsap.to(this.themeScales, {
      ...target,
      duration: this.reduced.matches ? 0 : 0.5,
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
  updateData(cards: DisplayCard[], endYear: number) {
    if (this.values.endYear !== endYear) this.rebase(endYear);
    this.events = [...new Map(cards.map((c) => [c.event.id, c.event])).values()];
    this.eventOrdinals = new Map(this.events.map((e, i) => [e.id, i]));
    const elements = new Map(
      Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-card-id]')).map((el) => [
        el.dataset.cardId,
        el,
      ]),
    );
    this.nodes = cards.map((card) => ({ card, el: elements.get(card.id)! }));
    this.dirty = true;
  }
  private setFocused(id: string) {
    this.focusedId = id;
    gsap.to(this.spot, {
      ordinal: this.eventOrdinals.get(id) ?? 0,
      duration: this.reduced.matches ? 0 : 0.4,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => {
        this.dirty = true;
      },
    });
  }
  open(eventId: string) {
    if (this.blocked || this.drag?.moved || !this.events.some((e) => e.id === eventId)) return;
    const next = detailReducer(this.detailState, { type: 'open', eventId });
    if (next === this.detailState) return;
    this.returnFocus = document.activeElement as HTMLElement;
    gsap.killTweensOf(this.values);
    gsap.killTweensOf(this.spot);
    this.root.dataset.targetFocus = String(this.values.focus);
    this.blocked = true;
    this.detailState = next;
    this.root.dataset.phase = next.phase;
    this.onDetail(next);
    const token = next.token;
    gsap.to(this.detail, {
      progress: 1,
      duration: this.reduced.matches ? 0 : 0.8,
      ease: 'power3.inOut',
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
    this.detailState = next;
    this.root.dataset.phase = next.phase;
    this.onDetail(next);
    const token = next.token;
    gsap.to(this.detail, {
      progress: 0,
      duration: this.reduced.matches ? 0 : 0.7,
      ease: 'power3.inOut',
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
    this.mode = mode;
    this.onMode(mode);
    this.animate({ zoom: mode === 'browse' ? 1 : 0 }, 0.8);
  }
  navigate(unit: number, id?: string) {
    if (this.blocked) return;
    this.setMode('browse');
    this.setFocused(id ?? this.nearest(unit).id);
    this.root.dataset.targetFocus = String(clamp(unit));
    this.animate({ focus: clamp(unit) });
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
    this.dirty = true;
  }
  private nearest(unit: number) {
    const year = timeScale(this.values.endYear).toYear(unit);
    return this.events.reduce((best, event) =>
      Math.abs(event.year - year) < Math.abs(best.year - year) ? event : best,
    );
  }
  private wheel = (e: WheelEvent) => {
    if (this.blocked || (e.target as HTMLElement).closest('.education-panel')) return;
    e.preventDefault();
    this.setMode('browse');
    const current = Number(this.root.dataset.targetFocus ?? this.values.focus);
    const target = clamp(
      current +
        wheelPixels(e.deltaX, e.deltaY, e.deltaMode, this.view.height) / lengths(this.view).browse,
    );
    this.root.dataset.targetFocus = String(target);
    this.setFocused(this.nearest(target).id);
    this.animate({ focus: target }, 0.45);
  };
  private down = (e: PointerEvent) => {
    if (
      this.blocked ||
      e.button !== 0 ||
      (e.target as HTMLElement).closest('.education-panel,.education-dot')
    )
      return;
    this.suppressClick = false;
    this.drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      focus: this.values.focus,
      moved: false,
    };
  };
  private move = (e: PointerEvent) => {
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      this.root.setPointerCapture(e.pointerId);
      this.setMode('browse');
      this.root.dataset.phase = 'dragging';
    }
    gsap.killTweensOf(this.values, 'focus');
    this.values.focus = clamp(drag.focus - dragProjection(dx, dy) / lengths(this.view).browse);
    this.root.dataset.targetFocus = String(this.values.focus);
    this.setFocused(this.nearest(this.values.focus).id);
    this.dirty = true;
  };
  private up = () => {
    if (this.drag?.moved) this.suppressClick = true;
    this.cancel();
  };
  private cancel = () => {
    const id = this.drag?.id;
    if (this.drag?.moved) this.suppressClick = true;
    this.drag = null;
    if (id !== undefined && this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    if (!this.blocked) this.root.dataset.phase = 'idle';
  };
  private click = (e: MouseEvent) => {
    if (this.suppressClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.suppressClick = false;
    }
  };
  private tick = () => {
    if (!this.dirty || this.disposed) return;
    this.dirty = false;
    this.root.dataset.focus = this.values.focus.toFixed(6);
    this.root.dataset.zoom = this.values.zoom.toFixed(4);
    const year = Math.round(timeScale(this.values.endYear).toYear(this.values.focus));
    if (year !== this.lastYear || this.focusedId !== this.lastEventId) {
      this.lastYear = year;
      this.lastEventId = this.focusedId;
      this.onChange(year, this.focusedId);
    }
    this.root.style.setProperty('--detail-progress', String(this.detail.progress));
    const selected = this.nodes.filter((n) => n.card.event.id === this.detailState.eventId),
      rects = detailPhotoRects(
        selected.map((n) => n.card),
        this.view,
      );
    const scrim = this.root.querySelector<HTMLElement>('.detail-scrim');
    if (scrim) scrim.hidden = !this.blocked;
    for (const { card, el } of this.nodes) {
      let p = cardPose(card, this.view, this.values);
      const focusYear = timeScale(this.values.endYear).toYear(this.values.focus);
      const proximity = Math.exp(
        -Math.pow(
          (card.event.year - timeScale(this.values.endYear).toYear(this.values.focus)) / 0.7,
          2,
        ),
      );
      const separation =
        Math.tanh(((this.eventOrdinals.get(card.event.id) ?? 0) - this.spot.ordinal) * 3) *
        300 *
        proximity *
        this.values.zoom;
      p.x += direction.x * separation;
      p.y += direction.y * separation;
      // Fan linked photographs slightly apart so each has a usable mouse target.
      if (card.event.photos.length > 1 && card.photo) {
        const photoIndex = card.event.photos.findIndex((photo) => photo.id === card.photo!.id);
        const pairOffset = (photoIndex - 0.5) * 44 * this.values.zoom;
        p.x += normal.x * pairOffset;
        p.y += normal.y * pairOffset;
      }
      const selectedIndex = selected.findIndex((n) => n.card.id === card.id),
        extracted = selectedIndex >= 0;
      const visible = extracted || isOnscreen(p, this.view);
      p.scale = this.themeScales[card.event.themeId];
      if (this.values.zoom > 0.01) p.z = browseStackZ(card, focusYear);
      const visibility = visible ? 'visible' : 'hidden',
        tabIndex = visible && !this.blocked ? 0 : -1,
        pointer = this.blocked ? 'none' : '';
      if (el.style.visibility !== visibility) {
        el.style.visibility = visibility;
        el.style.willChange = visible ? 'transform' : 'auto';
      }
      if (el.tabIndex !== tabIndex) el.tabIndex = tabIndex;
      if (el.style.pointerEvents !== pointer) el.style.pointerEvents = pointer;
      if (el.dataset.extracted !== String(extracted)) el.dataset.extracted = String(extracted);
      if (!visible) continue;
      if (card.event.id === this.focusedId && this.values.zoom > 0.01) {
        p.ry *= 1 - this.values.zoom * 0.28;
        p.z = Math.max(p.z, 1850);
      }
      if (extracted) p = mixPose(p, detailPose(rects[selectedIndex]), this.detail.progress);
      const width = Number(p.width.toFixed(2)) + 'px',
        height = Number(p.height.toFixed(2)) + 'px',
        letter = Number((p.width * 0.34).toFixed(2)) + 'px';
      if (el.style.width !== width) el.style.width = width;
      if (el.style.height !== height) el.style.height = height;
      el.style.transform = transform(p);
      if (el.style.zIndex !== String(p.z)) el.style.zIndex = String(p.z);
      if (el.style.getPropertyValue('--letter-size') !== letter)
        el.style.setProperty('--letter-size', letter);
    }
    this.root.querySelectorAll<HTMLElement>('[data-year],[data-education-year]').forEach((el) => {
      const lane = el.dataset.educationYear ? 'education' : 'axis',
        year = Number(el.dataset.educationYear ?? el.dataset.year),
        p = anchor(year, lane, this.view, this.values);
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
      const visible = p.x > 0 && p.x < this.view.width && p.y > 70 && p.y < this.view.height - 160;
      el.style.visibility = visible ? 'visible' : 'hidden';
      el.tabIndex = lane === 'education' && visible && !this.blocked ? 0 : -1;
      el.style.pointerEvents = this.blocked ? 'none' : '';
    });
    this.root.querySelectorAll<SVGLineElement>('[data-track]').forEach((el) => {
      const lane = el.dataset.track as 'axis' | 'education',
        a = anchor(1949, lane, this.view, this.values),
        b = anchor(this.values.endYear, lane, this.view, this.values);
      el.setAttribute('x1', String(a.x));
      el.setAttribute('y1', String(a.y));
      el.setAttribute('x2', String(b.x));
      el.setAttribute('y2', String(b.y));
    });
  };
  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.restoreFrame);
    gsap.killTweensOf(this.view);
    gsap.killTweensOf(this.spot);
    gsap.killTweensOf(this.detail);
    gsap.killTweensOf(this.values);
    gsap.killTweensOf(this.themeScales);
    gsap.killTweensOf(this.root.closest('.museum-app'));
    gsap.ticker.remove(this.tick);
    this.observer.disconnect();
    this.cancel();
    this.root.removeEventListener('wheel', this.wheel);
    this.root.removeEventListener('pointerdown', this.down);
    this.root.removeEventListener('pointermove', this.move);
    this.root.removeEventListener('pointerup', this.up);
    this.root.removeEventListener('pointercancel', this.cancel);
    this.root.removeEventListener('lostpointercapture', this.cancel);
    this.root.removeEventListener('click', this.click, true);
    window.removeEventListener('blur', this.cancel);
  }
}
