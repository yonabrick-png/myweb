import { createDrawable, createTimeline, onScroll } from 'animejs';
import type { Mode } from '../env';

/**
 * Hobbies: the bike draws itself in as it scrolls up into view (wheels, then frame, then cockpit),
 * the same createDrawable stroke as the pace chart. Reduced motion and text mode show the finished
 * drawing.
 */
export function setupHobbies(mode: Mode) {
  if (mode !== 'scroll') return;
  const root = document.documentElement;

  const bike = document.querySelector<SVGSVGElement>('.bike');
  if (bike) {
    root.classList.add('bike-live');
    const groups = ['.bike__wheels', '.bike__frame', '.bike__parts'].map((sel) => [
      ...bike.querySelectorAll<SVGGeometryElement>(`${sel} > *`),
    ]);
    // One timeline over the scroll range: from the bike's top entering the viewport to its centre
    // reaching the viewport centre. Wheels, then frame, then the parts, overlapping a little.
    const tl = createTimeline({
      autoplay: onScroll({ target: bike, enter: 'end start', leave: 'center center', sync: true }),
      defaults: { ease: 'linear' },
    });
    groups.forEach((els, i) => tl.add(createDrawable(els), { draw: ['0 0', '0 1'], duration: 400 }, i * 300));
  }
}
