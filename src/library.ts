import { animate, cubicBezier, onScroll, scrambleText, stagger } from 'animejs';

/**
 * Library page. Cards deal in once with a short stagger and their numbers settle with a numeric
 * scramble, like the PR cards on the main page. With a fine pointer, a card tilts towards the
 * pointer and its holographic sheen follows it. Reduced motion gets the cards as they are.
 */
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;

const list = document.querySelector<HTMLElement>('.cards');
if (list && !reduce) {
  const cars = [...list.querySelectorAll<HTMLElement>('.car')];
  const numbers = [...list.querySelectorAll<HTMLElement>('.card__power .d, .card__stats .d')];
  const deal = () => {
    animate(cars, { opacity: [0, 1], translateY: [24, 0], rotate: [-2, 0], duration: 700, delay: stagger(90), ease: EASE_OUT });
    animate(numbers, { innerHTML: scrambleText({ chars: '0-9', settleDuration: 500 }), delay: stagger(40, { start: 200 }) });
  };
  if (list.getBoundingClientRect().top < innerHeight * 0.9) deal();
  else {
    root.classList.add('cards-live');
    onScroll({ target: list, enter: '90% start', repeat: false, onEnter: deal });
  }
}

if (finePointer && !reduce) {
  for (const card of document.querySelectorAll<HTMLElement>('.card')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      for (const p of ['--mx', '--my', '--rx', '--ry']) card.style.removeProperty(p);
    });
  }
}
