import { createTimer, createScope, type Timer } from 'animejs';
import 'animejs/adapters/three';
import * as THREE from 'three';
import type { Env } from './env';

/**
 * The one renderer. Chapters add objects to `scene`, register anchors for bubbles and per-frame
 * hooks, and call `invalidate()` when they change something. Nothing else creates a renderer.
 */
export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  env: Env;
  size: { w: number; h: number };
  anchors: Map<string, THREE.Vector3[]>;
  onFrame(cb: () => void): void;
  onResize(cb: () => void): void;
  invalidate(): void;
  timer: Timer;
}

export function createStage(canvas: HTMLCanvasElement, env: Env): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: env.quality === 'high',
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(env.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.3, 1600);

  const frameCbs: Array<() => void> = [];
  const resizeCbs: Array<() => void> = [];
  const size = { w: 1, h: 1 };
  let dirty = true;

  const resize = () => {
    size.w = innerWidth;
    size.h = innerHeight;
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    resizeCbs.forEach((cb) => cb());
    dirty = true;
  };
  addEventListener('resize', resize);
  resize();

  // A longer lens keeps the track graphic and flat; a little wider on portrait screens.
  createScope({ mediaQueries: { portrait: '(max-aspect-ratio: 1/1)' } }).add((self) => {
    camera.fov = self?.matches.portrait ? 44 : 32;
    camera.updateProjectionMatrix();
    dirty = true;
  });

  // Render only when something changed; scroll-linked animations call invalidate() on update.
  const timer = createTimer({
    onUpdate: () => {
      if (!dirty) return;
      dirty = false;
      for (const cb of frameCbs) cb();
      renderer.render(scene, camera);
    },
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) timer.pause();
    else {
      dirty = true;
      timer.resume();
    }
  });

  return {
    renderer,
    scene,
    camera,
    env,
    size,
    anchors: new Map(),
    onFrame: (cb) => frameCbs.push(cb),
    onResize: (cb) => resizeCbs.push(cb),
    invalidate: () => {
      dirty = true;
    },
    timer,
  };
}
