import { animate, createDrawable, createMotionPath, onScroll } from 'animejs';
import type { Mode } from '../env';

const clock = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

/**
 * The race, kilometre by kilometre: the pace line draws itself (createDrawable) and a marker rides
 * it (createMotionPath), both synced to scroll across a pinned track. Splits passed light up, the
 * readout shows distance, the current split and the race clock (ending on the official time), and the note for the current
 * stretch is brought forward. Without scroll mode the full chart is shown with every note readable.
 */
export function setupRace(mode: Mode) {
  const svg = document.querySelector<SVGSVGElement>('.pace');
  const path = document.getElementById('pace-route') as SVGPathElement | null;
  const runner = document.getElementById('pace-runner');
  if (!svg || !path || !runner) return;
  if (mode !== 'scroll') return;

  document.documentElement.classList.add('race-live');
  const splits = (svg.dataset.splits ?? '').split(',').map(Number);
  const n = splits.length;
  // Watch splits can add up to a few seconds off the official time; scale the clock so the finish
  // reads the official time while each kilometre keeps its recorded share.
  const splitSum = splits.reduce((a, b) => a + b, 0);
  const scale = Number(svg.dataset.total) / splitSum || 1;
  const splitEls = [...svg.querySelectorAll<SVGGElement>('.split')].map((el) => ({ el, f: Number(el.dataset.f) }));
  const notes = [...document.querySelectorAll<HTMLElement>('.race__side .note')].map((el) => ({ el, at: Number(el.dataset.at) }));
  const kmOut = document.getElementById('ro-km')!;
  const splitOut = document.getElementById('ro-split')!;
  const clockOut = document.getElementById('ro-clock')!;

  const track = () => onScroll({ target: '.race__track', enter: 'start start', leave: 'end end', sync: true });

  const [drawable] = createDrawable(path);
  animate(drawable, { draw: ['0 0', '0 1'], ease: 'linear', autoplay: track() });
  animate(runner, { ...createMotionPath(path), ease: 'linear', autoplay: track() });

  let lastK = -1;
  let lastNote = -1;
  const progress = { p: 0 };
  animate(progress, {
    p: 1,
    ease: 'linear',
    autoplay: track(),
    onUpdate: () => {
      const p = progress.p;
      const km = p * n;
      kmOut.textContent = km.toFixed(1);
      // Race clock: whole kilometres at their split, plus the running fraction of the current one.
      const k = Math.min(Math.floor(km), n - 1);
      let sec = 0;
      for (let i = 0; i < k; i++) sec += splits[i];
      sec += (km - k) * splits[k];
      clockOut.textContent = clock(Math.round(sec * scale * 1000) / 1000);
      if (k !== lastK) {
        lastK = k;
        splitOut.textContent = clock(splits[k]);
      }
      for (const s of splitEls) s.el.classList.toggle('is-passed', s.f <= p);
      let current = 0;
      notes.forEach((note, i) => {
        if (note.at <= p) current = i;
      });
      if (current !== lastNote) {
        lastNote = current;
        notes.forEach((note, i) => {
          note.el.classList.toggle('is-current', i === current);
          note.el.classList.toggle('is-past', i < current);
        });
      }
    },
  });
}
