import * as THREE from 'three';

/**
 * A standard 400 m track, procedural, in metres: two 84.39 m straights and two bends of 36.5 m
 * radius, eight 1.22 m lanes. Lane 1 is measured 0.3 m out from the kerb, which makes one lap of it
 * 400.0 m. The shapes are drawn in XY and laid flat, so XY (x, y) becomes world (x, 0, -y).
 *
 * The runner goes anticlockwise with the infield on their left, starting at the finish line at
 * the end of the home straight (world +z side).
 */
export const STRAIGHT = 84.39;
export const RADIUS = 36.5;
export const LANE = 1.22;
export const LANES = 8;
export const RUN_R = RADIUS + 0.3;
export const LAP = 2 * STRAIGHT + 2 * Math.PI * RUN_R;

const HALF = STRAIGHT / 2;
const OUTER = RADIUS + LANE * LANES;

export const COLORS = {
  ink: '#0f1012',
  apron: '#16181b',
  infield: '#131518',
  tartan: '#b9442a',
  tartanEdge: '#8f3320',
  paper: '#f2f2f0',
  grid: '#1d2024',
  accent: '#ff6a3d',
};

function stadium(path: THREE.Path, r: number) {
  path.moveTo(HALF, -r);
  path.absarc(HALF, 0, r, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(-HALF, r);
  path.absarc(-HALF, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  path.lineTo(HALF, -r);
  return path;
}

/** A flat band between two stadium outlines (or a filled stadium when rIn is 0). */
function band(rIn: number, rOut: number, y: number, mat: THREE.Material, segments = 64) {
  const shape = stadium(new THREE.Shape(), rOut) as THREE.Shape;
  if (rIn > 0) shape.holes.push(stadium(new THREE.Path(), rIn));
  const geo = new THREE.ShapeGeometry(shape, segments);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  return mesh;
}

/** Position and heading (unit XZ direction) at distance s along a lane line of radius r. */
export function along(s: number, r = RUN_R, out = new THREE.Vector3(), dir = new THREE.Vector3()) {
  const arc = Math.PI * r;
  const lap = 2 * arc + 2 * STRAIGHT;
  let d = ((s % lap) + lap) % lap;
  if (d < arc) {
    // First bend: from the home straight round to the back straight.
    const a = -Math.PI / 2 + d / r;
    out.set(HALF + r * Math.cos(a), 0, -r * Math.sin(a));
    dir.set(-Math.sin(a), 0, -Math.cos(a));
    return { pos: out, dir };
  }
  d -= arc;
  if (d < STRAIGHT) {
    out.set(HALF - d, 0, -r);
    dir.set(-1, 0, 0);
    return { pos: out, dir };
  }
  d -= STRAIGHT;
  if (d < arc) {
    const a = Math.PI / 2 + d / r;
    out.set(-HALF + r * Math.cos(a), 0, -r * Math.sin(a));
    dir.set(-Math.sin(a), 0, -Math.cos(a));
    return { pos: out, dir };
  }
  d -= arc;
  out.set(-HALF + d, 0, r);
  dir.set(1, 0, 0);
  return { pos: out, dir };
}

/** The infield: faint pitch markings and a giant painted name, like a message on a climb. */
function infieldTexture(name: string) {
  const W = STRAIGHT + 2 * RADIUS;
  const H = 2 * RADIUS;
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = Math.round((2048 * H) / W);
  const g = c.getContext('2d')!;
  const k = c.width / W; // px per metre
  g.fillStyle = COLORS.infield;
  g.fillRect(0, 0, c.width, c.height);

  // A football pitch, 100 x 64 m, in the faintest line.
  g.strokeStyle = '#272a2f';
  g.lineWidth = 0.3 * k;
  const px = (x: number) => c.width / 2 + x * k;
  const py = (y: number) => c.height / 2 - y * k;
  g.strokeRect(px(-50), py(32), 100 * k, 64 * k);
  g.beginPath();
  g.moveTo(px(0), py(32));
  g.lineTo(px(0), py(-32));
  g.stroke();
  g.beginPath();
  g.arc(px(0), py(0), 9.15 * k, 0, Math.PI * 2);
  g.stroke();
  for (const sx of [-1, 1]) {
    g.strokeRect(sx < 0 ? px(-50) : px(50 - 16.5), py(20.16), 16.5 * k, 40.32 * k);
  }

  // The name, painted big and slightly slanted, in road-paint white with a tartan shadow.
  const size = c.height * 0.62;
  g.font = `italic 800 ${size}px Barlow, 'Arial Narrow', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const metrics = g.measureText(name);
  const fit = Math.min(1, (c.width * 0.66) / metrics.width);
  g.save();
  g.translate(c.width / 2, c.height / 2 + size * 0.04);
  g.scale(fit, fit);
  g.fillStyle = COLORS.tartan;
  g.fillText(name, size * 0.035, size * 0.035);
  g.fillStyle = COLORS.paper;
  g.globalAlpha = 0.92;
  g.fillText(name, 0, 0);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // ShapeGeometry UVs are raw XY in metres; map them onto the canvas.
  tex.repeat.set(1 / W, 1 / H);
  tex.offset.set(0.5, 0.5);
  return tex;
}

/** Lane numbers painted on the home straight, just before the line. */
function laneNumbers() {
  const g = new THREE.Group();
  for (let i = 0; i < LANES; i++) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 160;
    const x = c.getContext('2d')!;
    x.fillStyle = COLORS.paper;
    x.font = `italic 800 150px Barlow, 'Arial Narrow', sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(i + 1), 64, 86);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.PlaneGeometry(0.8, 1);
    plane.rotateX(-Math.PI / 2);
    // Turn the numbers so a runner coming down the home straight reads them upright.
    plane.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(HALF - 4, 0.03, RADIUS + LANE * (i + 0.5));
    g.add(m);
  }
  return g;
}

/** A small stylised runner: torso, head, and limbs on pivots so the gait can follow distance. */
function runnerFigure() {
  const skin = new THREE.MeshStandardMaterial({ color: COLORS.paper, roughness: 0.5 });
  const kit = new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.7 });
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.z = -0.14; // a slight forward lean (local +x is forward)
  g.add(body);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 6, 12), kit);
  torso.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), skin);
  head.position.y = 1.62;
  body.add(torso, head);

  const limb = (len: number, r: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
    m.position.y = -len / 2 - r;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const legL = limb(0.72, 0.075, dark, 0, 0.95, 0.1);
  const legR = limb(0.72, 0.075, dark, 0, 0.95, -0.1);
  const armL = limb(0.44, 0.055, skin, 0, 1.42, 0.23);
  const armR = limb(0.44, 0.055, skin, 0, 1.42, -0.23);

  // A ring on the ground so the runner reads from the air too.
  const ringGeo = new THREE.RingGeometry(1.1, 1.45, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: COLORS.paper, transparent: true, opacity: 0.9, depthWrite: false }));
  ring.position.y = 0.05;
  g.add(ring);

  /** Gait from distance: one full cycle (two strides) every 2.8 m. */
  const gait = (s: number) => {
    const phase = (s / 2.8) * Math.PI * 2;
    const swing = Math.sin(phase) * 0.7;
    legL.rotation.z = swing;
    legR.rotation.z = -swing;
    armL.rotation.z = -swing * 0.9;
    armR.rotation.z = swing * 0.9;
    body.position.y = Math.abs(Math.cos(phase)) * 0.05;
  };
  gait(0.7);
  return { group: g, gait, ring };
}

/** The lap run so far, drawn as a bright line in lane 1 that fades towards where it started. */
function trail() {
  const N = 900;
  const half = 0.28;
  const pos: number[] = [];
  const sAttr: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * LAP;
    along(s, RUN_R, p, d);
    // Left of travel is (dz, -dx) in XZ.
    const nx = d.z;
    const nz = -d.x;
    pos.push(p.x + nx * half, 0, p.z + nz * half, p.x - nx * half, 0, p.z - nz * half);
    sAttr.push(s, s);
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.Float32BufferAttribute(sAttr, 1));
  geo.setIndex(idx);
  const uniforms = { uS: { value: 0 }, uColor: { value: new THREE.Color(COLORS.paper) } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aS;
      varying float vS;
      void main() {
        vS = aS;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uS;
      uniform vec3 uColor;
      varying float vS;
      void main() {
        if (vS > uS || uS <= 0.0) discard;
        float a = mix(0.35, 0.95, smoothstep(uS - 60.0, uS, vS));
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.04;
  mesh.renderOrder = 2;
  return { mesh, uniforms };
}

export function buildTrack(name: string) {
  const group = new THREE.Group();
  const flat = (color: string) => new THREE.MeshBasicMaterial({ color });

  // Ground: a dark plane with a faint survey grid, fogged out at the edges.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), flat(COLORS.ink));
  ground.position.y = -0.02;
  const grid = new THREE.GridHelper(1400, 70, COLORS.grid, COLORS.grid);
  grid.position.y = -0.01;
  group.add(ground, grid);

  // Apron, tartan, kerb, infield.
  group.add(band(OUTER + 1, OUTER + 7, 0, flat(COLORS.apron)));
  group.add(band(RADIUS - 0.6, OUTER + 1, 0.005, flat(COLORS.tartan)));
  group.add(band(RADIUS - 0.25, RADIUS, 0.012, flat(COLORS.paper)));
  const infield = new THREE.Mesh(
    new THREE.ShapeGeometry(stadium(new THREE.Shape(), RADIUS - 0.6) as THREE.Shape, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: infieldTexture(name) }),
  );
  infield.position.y = 0.006;
  group.add(infield);

  // Lane lines: nine boundaries, drawn a little wider than the real 5 cm so they hold up from the air.
  const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.paper, transparent: true, opacity: 0.85 });
  for (let i = 1; i <= LANES; i++) {
    const r = RADIUS + LANE * i;
    group.add(band(r - 0.06, r + 0.06, 0.015, lineMat, 96));
  }

  // The finish line across all eight lanes at the end of the home straight.
  const finishGeo = new THREE.PlaneGeometry(0.5, LANE * LANES).rotateX(-Math.PI / 2);
  const finish = new THREE.Mesh(finishGeo, flat(COLORS.paper));
  finish.position.set(HALF, 0.02, RADIUS + (LANE * LANES) / 2);
  group.add(finish, laneNumbers());

  const runner = runnerFigure();
  const lap = trail();
  group.add(lap.mesh, runner.group);

  const anchors = {
    start: new THREE.Vector3(HALF, 0.5, RADIUS + LANE * 2),
    runner: new THREE.Vector3(),
    back: new THREE.Vector3(0, 0.5, -OUTER),
    bend: new THREE.Vector3(-HALF - OUTER, 0.5, 0),
    home: new THREE.Vector3(HALF, 0.5, RADIUS + LANE * 4),
  };

  const p = new THREE.Vector3();
  const d = new THREE.Vector3();
  /** Place the runner at distance s (0..LAP) along lane 1. */
  const setDistance = (s: number) => {
    along(s, RUN_R, p, d);
    runner.group.position.copy(p);
    runner.group.rotation.y = Math.atan2(-d.z, d.x);
    runner.gait(s + 0.7);
    lap.uniforms.uS.value = s;
    anchors.runner.set(p.x, 1.9, p.z);
  };
  setDistance(0);

  return { group, anchors, setDistance, runnerPos: p };
}
