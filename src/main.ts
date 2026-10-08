import Lenis from 'lenis';
import { detectEnv } from './env';
import { setupPrs } from './sections/prs';
import { setupRace } from './sections/race';
import { setupProjects } from './sections/projects';
import { setupHobbies } from './sections/hobbies';
import { watchScrollSettle } from './scroll-settle';

const env = detectEnv();
const root = document.documentElement;

// ---------- Mode link ----------
const modeLink = document.getElementById('mode-link') as HTMLAnchorElement;
const chosenText = root.dataset.textChosen === '1';
if (env.mode === 'text' && !(window.WebGL2RenderingContext && chosenText)) modeLink.hidden = true;
if (env.mode === 'text' && chosenText) {
  modeLink.textContent = 'Run the page in 3D';
  modeLink.href = location.pathname;
}
// Remember the choice for this tab too, so the switch also works where the query string is dropped
// (embedded viewers). Without JS the plain ?mode=text link still works.
modeLink.addEventListener('click', (e) => {
  try {
    if (chosenText) sessionStorage.removeItem('yona-mode');
    else sessionStorage.setItem('yona-mode', 'text');
  } catch {
    return;
  }
  e.preventDefault();
  if (chosenText) location.href = location.pathname;
  else location.reload();
});

// ---------- Smooth scroll (never on reduced motion, never hijacks native scrolling) ----------
if (env.mode === 'scroll') {
  new Lenis({ autoRaf: true, anchors: true });
}

// ---------- Km readout: the page is a marathon ----------
const MARATHON_KM = 42.195;
const kmNum = document.getElementById('km-num')!;
const kmSteps = [...document.querySelectorAll<HTMLElement>('#km-steps i')];
const kmAt = (pageY: number) => {
  const max = root.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(Math.max(pageY / max, 0), 1) : 0;
  return MARATHON_KM * (1 - p);
};
let lastKm = '';
const updateKm = () => {
  const toGo = kmAt(scrollY);
  const text = toGo.toFixed(1);
  if (text === lastKm) return;
  lastKm = text;
  kmNum.textContent = text;
  const done = Math.round((1 - toGo / MARATHON_KM) * kmSteps.length);
  kmSteps.forEach((el, i) => el.classList.toggle('on', i < done));
};
if (env.mode !== 'text') {
  addEventListener('scroll', updateKm, { passive: true });
  updateKm();

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  import('./track/world').then(({ startWorld }) => startWorld(canvas, env)).catch((err) => {
    // Anything goes wrong in 3D: fall back to the plain document rather than a blank page.
    console.error(err);
    root.classList.remove('mode-3d', 'mode-scroll', 'mode-poster', 'bubbles-float');
  });
}

setupPrs(env.mode);
setupRace(env.mode);
setupHobbies(env.mode);
setupProjects(env.mode);
if (env.mode === 'scroll') watchScrollSettle();
