import { animate, cubicBezier, onScroll, stagger } from 'animejs';
import type { Mode } from '../env';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/** Project cards come in once, left to right, like runners off the line. */
export function setupProjects(mode: Mode) {
  if (mode !== 'scroll') return;
  const list = document.querySelector<HTMLElement>('.projects');
  if (!list) return;
  const cards = [...list.querySelectorAll<HTMLElement>('.project')];

  let shown = false;
  const reveal = () => {
    if (shown) return;
    shown = true;
    animate(cards, { opacity: [0, 1], translateX: [-24, 0], duration: 650, delay: stagger(90), ease: EASE_OUT });
  };
  if (list.getBoundingClientRect().top < innerHeight * 0.85) return;
  document.documentElement.classList.add('projects-live');
  onScroll({ target: list, enter: '85% start', repeat: false, onEnter: reveal });
}
