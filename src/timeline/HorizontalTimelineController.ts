import gsap from 'gsap';
import { sceneConfig } from '../config/scene';
import { wheelPixels } from './input';
import { clamp, START_YEAR } from './timeScale';
import { horizontalTimelineGeometry, nearestTimelineYear } from './horizontalTimeline';

/** Both rails share a single focus; photo layout and gestures are kept separate. */
export class HorizontalTimelineController {
  private geometry;
  private values;
  private target: number;
  private lastYear = -1;
  private observer: ResizeObserver;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private drag: { id: number; x: number; y: number; position: number; moved: boolean } | null =
    null;
  private contents: HTMLElement[];
  private markers: HTMLElement[];
  private suppressClick = false;

  constructor(
    private root: HTMLElement,
    private endYear: number,
    private years: readonly number[],
    initialYear: number,
    private onYear: (year: number) => void,
  ) {
    this.geometry = horizontalTimelineGeometry(root.clientWidth, endYear, years);
    this.values = { position: this.geometry.scale.toUnit(initialYear) };
    this.target = this.values.position;
    this.contents = [...root.querySelectorAll<HTMLElement>('[data-rail-content]')];
    this.markers = [...root.querySelectorAll<HTMLElement>('[data-timeline-year]')];
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(root);
    root.addEventListener('wheel', this.wheel, { passive: false });
    root.addEventListener('pointerdown', this.down);
    root.addEventListener('pointermove', this.move);
    root.addEventListener('pointerup', this.up);
    root.addEventListener('pointercancel', this.cancel);
    root.addEventListener('lostpointercapture', this.cancel);
    root.addEventListener('click', this.click, true);
    root.addEventListener('keydown', this.key);
    window.addEventListener('blur', this.cancel);
    this.resize();
  }

  private resize = () => {
    this.geometry = horizontalTimelineGeometry(this.root.clientWidth, this.endYear, this.years);
    for (const marker of this.markers) {
      marker.style.left = `${this.geometry.scale.toUnit(Number(marker.dataset.timelineYear)) * this.geometry.length}px`;
    }
    this.draw();
  };

  private draw = () => {
    const shift = this.root.clientWidth / 2 - this.values.position * this.geometry.length;
    for (const content of this.contents) content.style.transform = `translate3d(${shift}px,0,0)`;
    for (const marker of this.markers) {
      const x = Number.parseFloat(marker.style.left) + shift;
      const visible = x >= 24 && x <= this.root.clientWidth - 24;
      marker.style.visibility = visible ? 'visible' : 'hidden';
      marker.tabIndex = visible && marker.tagName === 'BUTTON' ? 0 : -1;
    }
    const year = Math.round(this.geometry.scale.toYear(this.values.position));
    this.root.dataset.year = String(year);
    this.root.dataset.focus = this.values.position.toFixed(6);
    if (year !== this.lastYear) {
      this.lastYear = year;
      this.onYear(year);
    }
  };

  goYear = (year: number) => {
    this.target = this.geometry.scale.toUnit(year);
    this.animateTo(this.target);
  };

  private animateTo(position: number) {
    this.root.dataset.targetYear = String(Math.round(this.geometry.scale.toYear(position)));
    gsap.to(this.values, {
      position,
      duration: this.reduced.matches ? 0 : sceneConfig.wheelDuration,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: this.draw,
      onComplete: this.draw,
    });
  }

  private wheel = (event: WheelEvent) => {
    if ((event.target as Element).closest('[data-timeline-panel]')) return;
    event.preventDefault();
    this.target = clamp(
      this.target +
        (wheelPixels(event.deltaX, event.deltaY, event.deltaMode, this.root.clientHeight) *
          sceneConfig.wheelSensitivity) /
          this.geometry.length,
      this.geometry.min,
      this.geometry.max,
    );
    const year = nearestTimelineYear(this.geometry.scale.toYear(this.target), this.years);
    this.animateTo(this.geometry.scale.toUnit(year));
  };

  private down = (event: PointerEvent) => {
    this.suppressClick = false;
    if (
      event.button !== 0 ||
      this.drag ||
      (event.target as Element).closest('button,[data-timeline-panel]')
    )
      return;
    gsap.killTweensOf(this.values);
    this.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position: this.values.position,
      moved: false,
    };
  };

  private move = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (
      !drag.moved &&
      Math.hypot(dx, event.clientY - drag.y) < (event.pointerType === 'touch' ? 24 : 6)
    )
      return;
    if (!drag.moved) {
      drag.moved = true;
      this.root.setPointerCapture(event.pointerId);
      this.root.dataset.phase = 'dragging';
    }
    this.values.position = clamp(
      drag.position - (dx * sceneConfig.dragSensitivity) / this.geometry.length,
      this.geometry.min,
      this.geometry.max,
    );
    this.target = this.values.position;
    this.draw();
  };

  private up = (event: PointerEvent) => {
    if (this.drag?.id !== event.pointerId) return;
    const moved = this.drag.moved;
    this.suppressClick = moved;
    this.cancel();
    if (moved)
      this.goYear(
        nearestTimelineYear(this.geometry.scale.toYear(this.values.position), this.years),
      );
  };

  private cancel = () => {
    const id = this.drag?.id;
    this.drag = null;
    if (id !== undefined && this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    this.root.dataset.phase = 'idle';
  };

  private click = (event: MouseEvent) => {
    if (!this.suppressClick) return;
    this.suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private key = (event: KeyboardEvent) => {
    if ((event.target as Element).closest('[data-timeline-panel],.theme-home')) return;
    const year = this.geometry.scale.toYear(this.target);
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = this.years.find((item) => item > year + 0.01);
    if (event.key === 'ArrowLeft')
      next = [...this.years].reverse().find((item) => item < year - 0.01);
    if (event.key === 'Home') next = START_YEAR;
    if (event.key === 'End') next = this.endYear;
    if (next !== undefined) {
      event.preventDefault();
      this.goYear(next);
    }
  };

  destroy() {
    gsap.killTweensOf(this.values);
    this.observer.disconnect();
    this.cancel();
    this.root.removeEventListener('wheel', this.wheel);
    this.root.removeEventListener('pointerdown', this.down);
    this.root.removeEventListener('pointermove', this.move);
    this.root.removeEventListener('pointerup', this.up);
    this.root.removeEventListener('pointercancel', this.cancel);
    this.root.removeEventListener('lostpointercapture', this.cancel);
    this.root.removeEventListener('click', this.click, true);
    this.root.removeEventListener('keydown', this.key);
    window.removeEventListener('blur', this.cancel);
  }
}
