// Builds the race chapter's pace chart as SVG markup at build time.
// x is distance (0 to the race length), y is pace per km with faster at the top. The line passes
// through each kilometre's split at the middle of that kilometre and is smoothed (Catmull-Rom to
// cubic Bézier). It runs edge to edge so createMotionPath covers the whole race.
import { toSec, fmt } from './time.mjs';

const W = 720;
const H = 440;
const PAD = { l: 64, r: 24, t: 28, b: 48 };

/**
 * `officialSec` is the official finish time. Watch splits often add up to a few seconds more or less
 * (auto-lap, rounding), so the total and average use the official time when there is one.
 */
export function raceChart(race, officialSec) {
  const secs = race.splits.map(toSec);
  const n = secs.length;
  const fast = Math.min(...secs);
  const slow = Math.max(...secs);
  const lo = Math.floor((fast - 3) / 5) * 5;
  const hi = Math.ceil((slow + 3) / 5) * 5;
  const x = (km) => PAD.l + (km / n) * (W - PAD.l - PAD.r);
  const y = (s) => PAD.t + ((s - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const pts = [[x(0), y(secs[0])], ...secs.map((s, i) => [x(i + 0.5), y(s)]), [x(n), y(secs[n - 1])]];
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  const total = officialSec ?? secs.reduce((a, b) => a + b, 0);
  const avg = total / n;

  let grid = '';
  // Label every 5 s on a tight race, every 15 s on a wider one.
  const every = hi - lo <= 30 ? 5 : 15;
  for (let s = lo; s <= hi; s += 5) {
    const major = s % every === 0;
    grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(s).toFixed(1)}" y2="${y(s).toFixed(1)}" class="${major ? 'is-major' : ''}"/>`;
    if (major) grid += `<text x="${PAD.l - 12}" y="${(y(s) + 4).toFixed(1)}" text-anchor="end">${fmt(s)}</text>`;
  }
  let kms = '';
  for (let k = 0; k <= n; k++) {
    kms += `<line x1="${x(k).toFixed(1)}" x2="${x(k).toFixed(1)}" y1="${PAD.t}" y2="${H - PAD.b}"/>`;
    kms += `<text x="${x(k).toFixed(1)}" y="${H - PAD.b + 24}" text-anchor="middle">${k}</text>`;
  }
  const dots = secs
    .map(
      (s, i) =>
        `<g class="split" data-k="${i + 1}" data-f="${((i + 0.5) / n).toFixed(4)}"><circle cx="${x(i + 0.5).toFixed(1)}" cy="${y(s).toFixed(1)}" r="4"/>` +
        `<text x="${x(i + 0.5).toFixed(1)}" y="${(y(s) - 12).toFixed(1)}" text-anchor="middle">${fmt(s)}</text></g>`,
    )
    .join('');

  const fastest = secs.map((s, i) => (s === fast ? i + 1 : 0)).filter(Boolean);
  const fastText = fastest.length > 1 ? `kilometres ${fastest.join(', ')} at ${fmt(fast)}` : `number ${fastest[0]} at ${fmt(fast)}`;
  const svg = `<svg class="pace" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="pace-title pace-desc" data-splits="${secs.join(',')}" data-total="${total}">
  <title id="pace-title">${race.name}: pace per kilometre</title>
  <desc id="pace-desc">${n} kilometre splits from ${fmt(secs[0])} to ${fmt(secs[n - 1])} per km, ${fmt(total)} in total, average ${fmt(avg)} per km. Fastest: ${fastText}. Faster pace is higher on the chart.</desc>
  <g class="pace__grid" aria-hidden="true">${grid}</g>
  <g class="pace__kms" aria-hidden="true">${kms}</g>
  <line class="pace__avg" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(avg).toFixed(1)}" y2="${y(avg).toFixed(1)}" aria-hidden="true"/>
  <text class="pace__avg-label" x="${PAD.l + 8}" y="${(y(avg) + 18).toFixed(1)}" text-anchor="start" aria-hidden="true">avg ${fmt(avg)}/km</text>
  <path class="pace__base" d="${d}"/>
  <path class="pace__line" id="pace-route" d="${d}"/>
  <g class="pace__splits" aria-hidden="true">${dots}</g>
  <text class="pace__axis" x="${W - PAD.r}" y="${H - 6}" text-anchor="end" aria-hidden="true">km</text>
  <g class="pace__runner" id="pace-runner" aria-hidden="true"><circle r="11"/><path d="M -5 -6 L 7 0 L -5 6 Z"/></g>
</svg>`;
  return { svg, total, avg, n };
}
