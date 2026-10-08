// Builds the library page's content at build time: the rarity scale, one collector card per car,
// the photo grid (or empty frames), and the page's own Sources list.

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The tier a car falls in: the rarest tier whose maxBuilt it is within. An icon (a landmark car)
 * then moves up `bonus` tiers, never past the top one.
 */
export function rarityOf(scale, built, icon = false, bonus = 0) {
  let i = 0;
  scale.forEach((t, k) => {
    if (t.maxBuilt === null || built <= t.maxBuilt) i = k;
  });
  if (icon) i = Math.min(i + bonus, scale.length - 1);
  return scale[i];
}

/** Small inline marks for each tier: circle, diamond, then one to three stars. */
const STAR = 'M6 0.6l1.6 3.5 3.8.4-2.9 2.6.8 3.8L6 9 2.7 10.9l.8-3.8L.6 4.5l3.8-.4z';
export function rarityMark(id) {
  const svg = (inner, w = 12) => `<svg class="mark" viewBox="0 0 ${w} 12" width="${w}" height="12" aria-hidden="true" focusable="false">${inner}</svg>`;
  const stars = (n) => svg(Array.from({ length: n }, (_, i) => `<path transform="translate(${i * 13} 0)" d="${STAR}"/>`).join(''), n * 13 - 1);
  switch (id) {
    case 'common':
      return svg('<circle cx="6" cy="6" r="4.5"/>');
    case 'uncommon':
      return svg('<path d="M6 0.8 11.2 6 6 11.2 0.8 6z"/>');
    case 'rare':
      return stars(1);
    case 'epic':
      return stars(2);
    default:
      return stars(3);
  }
}

const digits = (t) => esc(t).replace(/\d+/g, (n) => `<span class="d">${n}</span>`);

export function libraryPage(html, data) {
  const { rarity, cars, photos, emptySlots, iconBonus = 0 } = data;

  // One numbered list of sources, in page order, each URL once.
  const urls = [];
  const labels = new Map();
  const cite = (list, label) =>
    list
      .filter(Boolean)
      .map((u) => {
        if (!urls.includes(u)) {
          urls.push(u);
          labels.set(u, label);
        }
        const n = urls.indexOf(u) + 1;
        return `<a class="ref" href="#src-${n}" aria-label="Source ${n}">[${n}]</a>`;
      })
      .join('');

  const legend = [...rarity]
    .reverse()
    .map((t) => `<li class="rarity rarity--${t.id}">${rarityMark(t.id)}<b>${esc(t.name)}</b><span>${esc(t.label)}</span></li>`)
    .join('') +
    (iconBonus
      ? `<li class="rarity rarity--icon"><b>Icon</b><span>A landmark car moves up ${iconBonus === 1 ? 'one tier' : `${iconBonus} tiers`}</span></li>`
      : '');

  const total = String(cars.length).padStart(3, '0');
  const card = (c, i) => {
    const tier = rarityOf(rarity, c.built, c.icon, iconBonus);
    const no = `${String(i + 1).padStart(3, '0')}/${total}`;
    const type = [c.engine, c.version, c.year].filter(Boolean).map(esc).join(' · ');
    const stats = c.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd>${digits(s.value)}</dd></div>`).join('');
    return (
      `<li class="car" id="car-${esc(c.id)}">` +
      `<article class="card card--${tier.id}" data-rarity="${tier.id}" aria-labelledby="car-${esc(c.id)}-name">` +
      `<div class="card__face">` +
      `<header class="card__top"><h3 class="card__name" id="car-${esc(c.id)}-name"><small>${esc(c.make)}</small>${esc(c.model)}</h3>` +
      `<p class="card__power" aria-label="${esc(c.power)}">${digits(c.power)}</p></header>` +
      `<a class="card__art" href="${esc(c.photo.src)}" rel="noopener"><img src="${esc(c.photo.src)}" alt="${esc(c.photo.alt)}" loading="lazy" decoding="async"${c.photo.focus ? ` style="object-position: ${esc(c.photo.focus)}"` : ''}/></a>` +
      `<p class="card__type">${type}</p>` +
      `<dl class="card__stats">${stats}</dl>` +
      `<p class="card__text">${esc(c.text)} ${cite([c.sourceUrl, ...(c.extraSources ?? [])], `${c.make} ${c.model}`)}</p>` +
      `<p class="card__spotted"><span>Spotted at</span> ${esc(c.spotted)}</p>` +
      `<footer class="card__foot"><span class="card__rarity">${rarityMark(tier.id)}${esc(tier.name)}</span>` +
      (c.icon ? `<span class="card__icon" title="${esc(c.iconReason ?? 'Icon')}">Icon</span>` : '') +
      `<span class="card__no">${no}</span></footer>` +
      `</div></article></li>`
    );
  };

  const photoHtml = (ph) => {
    const meta = [ph.caption, ph.place].filter(Boolean).map(esc);
    return (
      `<li class="photo"><figure><img src="${esc(ph.src)}" alt="${esc(ph.alt)}" loading="lazy" decoding="async"/>` +
      (meta.length ? `<figcaption>${meta.join(' · ')}</figcaption>` : '') +
      `</figure></li>`
    );
  };
  const photosHtml = photos.length
    ? photos.map(photoHtml).join('')
    : Array.from(
        { length: emptySlots },
        (_, i) => `<li class="photo photo--empty" aria-hidden="true"><span class="photo__frame">${String(i + 1).padStart(2, '0')}</span></li>`,
      ).join('');
  const photosNote = photos.length ? '' : '<p class="library__empty">More photos are on the way.</p>';

  const cardsHtml = cars.map(card).join('');
  const sources = urls
    .map((u, i) => {
      const host = new URL(u).hostname.replace(/^www\./, '');
      return `<li id="src-${i + 1}"><a href="${esc(u)}" rel="noopener">${esc(host)}</a> <span>${esc(labels.get(u) ?? '')}</span></li>`;
    })
    .join('');

  return html
    .replace('<!--rarity-legend-->', legend)
    .replace('<!--car-count-->', `${cars.length} ${cars.length === 1 ? 'card' : 'cards'}`)
    .replace('<!--cars-->', cardsHtml)
    .replace('<!--photos-note-->', photosNote)
    .replace('<!--photos-->', photosHtml)
    .replace('<!--sources-->', sources);
}
