import { animate, createTimeline, createTimer, cubicBezier, onScroll } from 'animejs';
import * as THREE from 'three';
import type { Env } from '../env';
import { createStage } from '../scene';
import { buildTrack, COLORS, LAP } from './model';
import { setupBubbles } from '../bubbles';

// Strong ease-in-out for the camera moving between shots (on-screen movement).
const EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);

/**
 * Camera framing: an orbit around a target. `follow` blends the target from the fixed point
 * (tx, tz) to the runner, so a shot can ride along or hold on a part of the track.
 */
interface Shot {
  az: number; // degrees around y; 90 = home straight side (+z)
  el: number; // degrees above the ground
  dist: number; // metres
  tx: number;
  ty: number;
  tz: number;
  follow: number; // 0 fixed target, 1 the runner
  shift: number; // + moves the scene right (desktop) or down (portrait), as a fraction of the screen
}

const SHOTS: Record<string, Shot> = {
  hero: { az: 90, el: 56, dist: 250, tx: 0, ty: 0, tz: 4, follow: 0, shift: 0.2 },
  start: { az: 128, el: 12, dist: 11, tx: 0, ty: 1, tz: 0, follow: 1, shift: -0.12 },
  chase: { az: 40, el: 20, dist: 22, tx: 0, ty: 1, tz: 0, follow: 1, shift: -0.12 },
  back: { az: 105, el: 34, dist: 120, tx: -10, ty: 0, tz: -30, follow: 0.35, shift: -0.12 },
  bend: { az: 150, el: 30, dist: 95, tx: -70, ty: 0, tz: 0, follow: 0.4, shift: -0.12 },
  home: { az: 200, el: 9, dist: 18, tx: 0, ty: 1, tz: 0, follow: 1, shift: -0.12 },
  exit: { az: 90, el: 72, dist: 270, tx: 0, ty: 0, tz: 0, follow: 0, shift: 0 },
};

/**
 * Scroll schedule for #track, in vh of scroll. Each callout's range in bubbles.json sits on a hold
 * (or a slow ride-along) so the frame is steady while it is read. Ranges are matched against the
 * viewport centre, so they read 50vh later than the scroll positions here.
 *   0-40 hero · 40-80 → start · hold · 150-180 → chase · hold · 240-270 → back · hold
 *   330-360 → bend · hold · 420-450 → home · hold · 500-540 → exit
 * The runner sets off at 150 and crosses the line at 520.
 */
const SCHEDULE: Array<[keyof typeof SHOTS, number, number]> = [
  ['start', 40, 40],
  ['chase', 150, 30],
  ['back', 240, 30],
  ['bend', 330, 30],
  ['home', 420, 30],
  ['exit', 500, 40],
];
const TOTAL = 540;
const RUN_FROM = 150;
const RUN_TO = 520;

export async function startWorld(canvas: HTMLCanvasElement, env: Env) {
  // The painted name uses the display face; make sure it is loaded before the canvas is drawn.
  await Promise.race([
    document.fonts?.load('italic 800 100px Barlow').catch(() => undefined),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  const stage = createStage(canvas, env);
  const { scene, camera, invalidate } = stage;

  scene.background = new THREE.Color(COLORS.ink);
  scene.fog = new THREE.Fog(COLORS.ink, 320, 700);
  scene.add(new THREE.HemisphereLight('#ffffff', '#30343a', 1.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(40, 80, 60);
  scene.add(key);

  const track = buildTrack('YONA');
  scene.add(track.group);
  for (const [name, p] of Object.entries(track.anchors)) stage.anchors.set(name, [p]);

  // ---------- Camera ----------
  const cam: Shot = { ...SHOTS.hero };
  const run = { s: 0 };
  const portrait = () => stage.size.h > stage.size.w;
  let sway = 0;
  const target = new THREE.Vector3();
  const applyCamera = () => {
    track.setDistance(run.s);
    const az = THREE.MathUtils.degToRad(cam.az + sway);
    const el = THREE.MathUtils.degToRad(cam.el);
    const d = cam.dist * (portrait() ? 1.5 : 1);
    const rp = track.runnerPos;
    target.set(
      THREE.MathUtils.lerp(cam.tx, rp.x, cam.follow),
      cam.ty,
      THREE.MathUtils.lerp(cam.tz, rp.z, cam.follow),
    );
    camera.position.set(
      target.x + d * Math.cos(el) * Math.cos(az),
      target.y + d * Math.sin(el),
      target.z + d * Math.cos(el) * Math.sin(az),
    );
    camera.lookAt(target);
    const { w, h } = stage.size;
    const sx = portrait() ? 0 : cam.shift;
    const sy = portrait() ? cam.shift * 1.1 : 0;
    camera.setViewOffset(w, h, -sx * w, -sy * h, w, h);
    invalidate();
  };
  stage.onResize(applyCamera);

  if (env.mode === 'scroll') {
    const chapter = () => onScroll({ target: '#track', enter: 'start start', leave: 'end end', sync: true });

    // onComplete too: a jump past the end of the chapter completes the timeline without an update.
    const tl = createTimeline({
      autoplay: chapter(),
      defaults: { ease: EASE_IN_OUT },
      onUpdate: applyCamera,
      onComplete: applyCamera,
      onBegin: applyCamera,
    });
    for (const [shot, at, dur] of SCHEDULE) tl.add(cam, { ...SHOTS[shot], duration: dur }, at);
    // One lap of lane 1, at an even pace: scroll is distance.
    tl.add(run, { s: [0, LAP], duration: RUN_TO - RUN_FROM, ease: 'linear' }, RUN_FROM);
    tl.add({}, { duration: 1 }, TOTAL - 1);

    // Fade the stage out as the PRs arrive; the rest of the page is flat.
    animate(canvas, {
      opacity: [1, 0],
      ease: 'linear',
      autoplay: onScroll({ target: '#prs', enter: 'end start', leave: 'center start', sync: true }),
    });

    // A slow idle drift at the very top, so the hero reads as 3D before anyone scrolls.
    let t0 = performance.now();
    createTimer({
      onUpdate: () => {
        const atTop = scrollY < innerHeight * 0.3;
        const goal = atTop ? Math.sin((performance.now() - t0) / 3000) * 6 : 0;
        const next = sway + (goal - sway) * 0.05;
        if (Math.abs(next - sway) > 0.001) {
          sway = next;
          applyCamera();
        }
      },
    });
    document.addEventListener('visibilitychange', () => (t0 = performance.now()));
  }

  applyCamera();
  setupBubbles(stage);
  document.documentElement.dataset.world = 'ready';
}
