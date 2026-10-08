import { animate, createDrawable, createTimeline, cubicBezier, onScroll, stagger } from 'animejs';
import type { Mode } from '../env';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * Hobbies: the bike draws itself in as it scrolls up into view (wheels, then frame, then cockpit),
 * the same createDrawable stroke as the pace chart. The photo frames come in once with a stagger.
 * Reduced motion and text mode show the finished drawing and the frames as they are.
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

  const library = document.querySelector<HTMLElement>('.library');
  if (library && library.getBoundingClientRect().top > innerHeight * 0.85) {
    const frames = [...library.querySelectorAll<HTMLElement>('.photo')];
    root.classList.add('library-live');
    let shown = false;
    onScroll({
      target: library,
      enter: '85% start',
      repeat: false,
      onEnter: () => {
        if (shown) return;
        shown = true;
        animate(frames, { opacity: [0, 1], scale: [0.97, 1], duration: 600, delay: stagger(70), ease: EASE_OUT });
      },
    });
  }
}
