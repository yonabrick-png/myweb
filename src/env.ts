/**
 * Decides how the page runs on this device. The inline script in index.html makes a first guess
 * before paint (mode-3d / mode-scroll / mode-poster); this module confirms it and adds quality.
 *
 *  scroll: scroll-linked camera, floating bubbles (or inline bubbles on weak phones)
 *  poster: prefers-reduced-motion, one still frame per chapter, inline bubbles, no pinning
 *  text:   no WebGL or ?mode=text, plain document
 */
export type Mode = 'scroll' | 'poster' | 'text';
export type Quality = 'high' | 'low';

export interface Env {
  mode: Mode;
  quality: Quality;
  floatBubbles: boolean;
  coarse: boolean;
  dpr: number;
}

const WEAK_GPU = /(mali-[4t]|adreno \(tm\) [3-5]\d\d|powervr|sgx|swiftshader|llvmpipe|softpipe|intel\(r\) hd graphics [2-5]\d{2,3})/i;

function gpuName(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return null;
  }
}

export function detectEnv(): Env {
  const root = document.documentElement;
  const q = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches;

  let mode: Mode = root.classList.contains('mode-poster') ? 'poster' : root.classList.contains('mode-scroll') ? 'scroll' : 'text';
  const gpu = mode === 'text' ? null : gpuName();
  if (mode !== 'text' && gpu === null) mode = 'text';

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const weakGpu = gpu !== null && WEAK_GPU.test(gpu);
  const lowEnd = weakGpu || (coarse && (cores <= 4 || memory <= 3));

  let quality: Quality = lowEnd ? 'low' : 'high';
  const forced = q.get('quality');
  if (forced === 'low' || forced === 'high') quality = forced;

  // The brief: coarse pointer plus low-end GPU means bubbles fall back to inline paragraphs.
  const floatBubbles = mode === 'scroll' && !(coarse && quality === 'low');
  const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : coarse ? 1.5 : 2);

  root.classList.remove('mode-3d', 'mode-scroll', 'mode-poster');
  if (mode !== 'text') root.classList.add('mode-3d', `mode-${mode}`);
  root.classList.toggle('bubbles-float', floatBubbles);
  root.dataset.quality = quality;

  return { mode, quality, floatBubbles, coarse, dpr };
}
