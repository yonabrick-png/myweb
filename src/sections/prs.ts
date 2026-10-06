import { animate, cubicBezier, onScroll, scrambleText, stagger } from 'animejs';
import type { Mode } from '../env';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * PR cards enter once, in sequence (80 ms stagger), and their times settle in with a numeric
 * scramble. Only the digit groups scramble, so the colons hold still like a race clock.
 * Reduced motion and text mode skip it: the cards are simply there.
 */
export function setupPrs(mode: Mode) {
  if (mode !== 'scroll') return;
  const list = document.querySelector<HTMLElement>('.prs');
  if (!list) return;
  const cards = [...list.querySelectorAll<HTMLElement>('.pr')];
  const digits = [...list.querySelectorAll<HTMLElement>('.pr__time .d, .pr__meta .d')];

  let shown = false;
  const reveal = () => {
    if (shown) return;
    shown = true;
    animate(cards, {
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 700,
      delay: stagger(80),
      ease: EASE_OUT,
    });
    animate(digits, {
      innerHTML: scrambleText({ chars: '0-9', settleDuration: 500 }),
      delay: stagger(40, { start: 160 }),
    });
  };

  // Already scrolled past the list (a deep link or a reload mid-page): show it without motion.
  if (list.getBoundingClientRect().top < innerHeight * 0.85) return;
  document.documentElement.classList.add('prs-live');
  onScroll({ target: list, enter: '85% start', repeat: false, onEnter: reveal });
}
