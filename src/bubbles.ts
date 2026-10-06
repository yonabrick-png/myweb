import { createTimeline, cubicBezier, onScroll, splitText, stagger, type Timeline } from 'animejs';
import * as THREE from 'three';
import type { Stage } from './scene';

/**
 * Callout bubbles. The <p role="note"> elements are already in the chapter HTML (reading order,
 * no-JS fallback). In float mode they become fixed plates pinned beside a 3D anchor:
 * each frame the anchor is projected to screen and the plate follows, clamped to the viewport.
 * Each bubble owns a scroll range (a hidden marker element), not a time.
 */
const EASE = cubicBezier(0.23, 1, 0.32, 1);
const MARGIN = 16;
const OFFSET_X = 34;
const OFFSET_Y = 58;
const NOTCH = 14;

interface Bubble {
  el: HTMLElement;
  plate: HTMLElement;
  marker: HTMLElement;
  line: SVGLineElement;
  anchorKey: string;
  anchor: THREE.Vector3 | null;
  active: boolean;
  tl: Timeline | null;
  w: number;
  h: number;
}

export function setupBubbles(stage: Stage) {
  if (!stage.env.floatBubbles) return;
  const { camera } = stage;
  const svg = document.getElementById('leaders') as unknown as SVGSVGElement;
  const v = new THREE.Vector3();

  const bubbles: Bubble[] = [...document.querySelectorAll<HTMLElement>('.bubble')].map((el) => {
    const section = el.closest<HTMLElement>('.chapter')!;
    const from = Number(el.dataset.from);
    const to = Number(el.dataset.to);
    const marker = document.createElement('div');
    marker.className = 'bubble-range';
    marker.style.top = `${from}vh`;
    marker.style.height = `${to - from}vh`;
    section.appendChild(marker);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    svg.appendChild(line);
    return {
      el,
      plate: el.querySelector<HTMLElement>('.bubble__plate')!,
      marker,
      line,
      anchorKey: el.dataset.anchor!,
      anchor: null,
      active: false,
      tl: null,
      w: 0,
      h: 0,
    };
  });

  const resolveAnchor = (b: Bubble) => {
    b.anchor = stage.anchors.get(b.anchorKey)?.[0] ?? null;
  };

  const place = (b: Bubble) => {
    if (!b.anchor) return;
    const { w, h } = stage.size;
    camera.updateMatrixWorld();
    v.copy(b.anchor).project(camera);
    const behind = v.z > 1;
    const ax = (v.x * 0.5 + 0.5) * w;
    const ay = (-v.y * 0.5 + 0.5) * h;
    // Keep clear of the chapter copy on the left of wide screens, and the headline on tall ones.
    const minX = w > 900 ? w * 0.46 : MARGIN;
    // Stay below the instrument bar across the top.
    const barBottom = document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0;
    const minY = Math.max(barBottom + MARGIN, h > w ? h * 0.52 : 0);
    const maxX = w - b.w - MARGIN - (w > 900 ? 90 : 0);
    const maxY = h - b.h - NOTCH - MARGIN - (w <= 900 ? 90 : 0);
    const x = THREE.MathUtils.clamp(ax + OFFSET_X, minX, Math.max(minX, maxX));
    const y = THREE.MathUtils.clamp(ay - OFFSET_Y - b.h, minY, Math.max(minY, maxY));
    b.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    const tipX = x;
    const tipY = y + b.h + NOTCH;
    const onScreen = !behind && ax > -50 && ax < w + 50 && ay > -50 && ay < h + 50;
    b.line.setAttribute('x1', tipX.toFixed(1));
    b.line.setAttribute('y1', tipY.toFixed(1));
    b.line.setAttribute('x2', ax.toFixed(1));
    b.line.setAttribute('y2', ay.toFixed(1));
    b.line.style.opacity = onScreen && b.active ? '0.8' : '0';
  };

  const measure = (b: Bubble) => {
    b.w = b.plate.offsetWidth;
    b.h = b.plate.offsetHeight;
  };

  bubbles.forEach((b) => {
    // Reveal the plate, then its text line by line (never by character).
    splitText(b.el.querySelector<HTMLElement>('.bubble__text')!, { lines: true }).addEffect((split) => {
      const wasAt = b.tl ? b.tl.currentTime : 0;
      const tl = createTimeline({ autoplay: false, defaults: { ease: EASE } })
        .add(b.plate, { opacity: [0, 1], translateY: [12, 0], scale: [0.96, 1], duration: 520 }, 0)
        .add(split.lines, { opacity: [0, 1], translateY: ['0.35em', 0], duration: 440, delay: stagger(70) }, 90);
      tl.seek(b.active ? tl.duration : Math.min(wasAt, tl.duration));
      b.tl = tl;
      return tl;
    });

    const show = () => {
      b.active = true;
      b.el.classList.add('is-active');
      measure(b);
      if (!b.anchor) resolveAnchor(b);
      place(b);
      if (b.tl) {
        b.tl.speed = 1;
        b.tl.play();
      }
    };
    const hide = () => {
      b.active = false;
      b.el.classList.remove('is-active');
      b.line.style.opacity = '0';
      // Exit through the same path it entered, a little quicker so two plates never linger together.
      if (b.tl) {
        b.tl.speed = 1.8;
        b.tl.reverse();
      }
    };
    onScroll({
      target: b.marker,
      enter: 'center start',
      leave: 'center end',
      onEnterForward: show,
      onEnterBackward: show,
      onLeaveForward: hide,
      onLeaveBackward: hide,
    });
  });

  stage.onFrame(() => {
    for (const b of bubbles) if (b.active) place(b);
  });
  stage.onResize(() => {
    for (const b of bubbles) {
      b.anchor = null;
      if (b.active) {
        measure(b);
        resolveAnchor(b);
      }
    }
  });
}
