// A road bike in side view as a single-line SVG drawing, built at build time. Generic geometry,
// not a model of any particular bike. Every stroke is a separate element so createDrawable can
// draw the bike in on scroll: wheels first, then the frame, then the cockpit.
const W = 600;
const H = 340;
const R = 92; // wheel radius
const rear = [148, 238];
const front = [452, 238];
const bb = [272, 246];
const seat = [244, 118];
const headTop = [402, 112];
const headBottom = [412, 148];

const line = (a, b, cls = '') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"${cls ? ` class="${cls}"` : ''}/>`;

export function bikeSvg(title) {
  const wheels = [rear, front]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${R}" class="bike__tyre"/><circle cx="${x}" cy="${y}" r="${R - 12}" class="bike__rim"/><circle cx="${x}" cy="${y}" r="6"/>`)
    .join('');
  const frame = [
    line(rear, bb), // chainstay
    line(rear, seat), // seatstay
    line(bb, seat), // seat tube
    line(seat, headTop), // top tube
    line(bb, headBottom), // down tube
    line(headTop, headBottom), // head tube
    line(headBottom, front), // fork
  ].join('');
  const parts = [
    line(seat, [234, 88]), // seatpost
    `<path d="M 206 86 L 262 86" class="bike__saddle"/>`,
    line(headTop, [424, 100]), // stem
    `<path d="M 424 100 L 452 102 C 470 104 470 140 448 142 L 436 140"/>`, // drop bar
    `<circle cx="${bb[0]}" cy="${bb[1]}" r="26"/>`, // chainring
    `<path d="M ${bb[0]} ${bb[1] - 26} L ${rear[0]} ${rear[1] - 10} M ${bb[0]} ${bb[1] + 26} L ${rear[0]} ${rear[1] + 10}" class="bike__chain"/>`,
  ].join('');
  return `<svg class="bike" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}: line drawing of a road bike">
  <g class="bike__wheels">${wheels}</g>
  <g class="bike__frame">${frame}</g>
  <g class="bike__parts">${parts}</g>
  <line x1="20" y1="${rear[1] + R + 2}" x2="${W - 20}" y2="${rear[1] + R + 2}" class="bike__ground" aria-hidden="true"/>
</svg>`;
}
