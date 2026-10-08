import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { raceChart } from './scripts/race-chart.mjs';
import { toSec, fmt, pacePerKm } from './scripts/time.mjs';
import { bikeSvg } from './scripts/bike-svg.mjs';
import { libraryPage, rarityOf, rarityMark } from './scripts/library-page.mjs';

interface Bubble {
  id: string;
  part: string;
  scrollRange: { from: number; to: number };
  anchor: string;
  text: string;
  sourceUrl: string;
}
interface PR {
  id: string;
  label: string;
  meters: number;
  time: string;
  race?: string;
  date?: string;
  placeholder?: boolean;
}
interface Race {
  name: string;
  prId: string;
  placeholder?: boolean;
  splits: string[];
}
interface Note {
  id: string;
  at: number;
  title: string;
  text: string;
}
interface Hobbies {
  cycling: { bike: string; text: string; siteName: string; siteUrl: string };
  photography: { text: string; linkText: string; teaser: string };
}
interface Car {
  id: string;
  make: string;
  model: string;
  built: number;
  photo: { src: string; thumb?: string; alt: string };
}
interface Library {
  rarity: { id: string; name: string; maxBuilt: number | null; label: string }[];
  cars: Car[];
  photos: unknown[];
  emptySlots: number;
}
interface Project {
  id: string;
  name: string;
  kind: string;
  text: string;
  tags: string[];
  url: string;
  status: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(`./src/content/${name}`, import.meta.url), 'utf8'));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = (d: string) => {
  const [y, m] = d.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
};

/** Wrap each run of digits so the scramble can settle the numbers and leave the colons alone. */
const digits = (t: string) => esc(t).replace(/\d+/g, (n) => `<span class="d">${n}</span>`);

const SAMPLE = '<span class="sample" title="Placeholder: edit src/content/*.json">Sample</span>';

/**
 * Writes all content into index.html at build time (bubbles, PR cards, the race chart and notes,
 * project cards and the Sources list), so the page reads fully with JavaScript off.
 */
function contentInHtml(): Plugin {
  const dir = new URL('./src/content/', import.meta.url).pathname;
  return {
    name: 'content-in-html',
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('change', (p) => {
        if (p.startsWith(dir)) server.ws.send({ type: 'full-reload' });
      });
    },
    transformIndexHtml(html, ctx) {
      const library = read<Library>('library.json');
      if (ctx.path.endsWith('library.html')) return libraryPage(html, library);

      const { bubbles } = read<{ bubbles: Bubble[] }>('bubbles.json');
      const { prs } = read<{ prs: PR[] }>('prs.json');
      const { race, notes } = read<{ race: Race; notes: Note[] }>('race.json');
      const { projects } = read<{ projects: Project[] }>('projects.json');
      const hobbies = read<Hobbies>('hobbies.json');

      // One numbered list of sources, in page order, each URL once.
      const urls: string[] = [];
      const labels = new Map<string, string>();
      const cite = (url: string, label: string) => {
        if (!url) return '';
        if (!urls.includes(url)) {
          urls.push(url);
          labels.set(url, label);
        }
        const n = urls.indexOf(url) + 1;
        return `<a class="ref" href="#src-${n}" aria-label="Source ${n}">[${n}]</a>`;
      };

      const bubbleHtml = (b: Bubble) =>
        `<p class="bubble" role="note" id="${b.id}" data-anchor="${esc(b.anchor)}" data-from="${b.scrollRange.from}" data-to="${b.scrollRange.to}">` +
        `<span class="bubble__plate"><span class="bubble__tag">${esc(b.part)}</span><span class="bubble__text">${esc(b.text)}</span>${cite(b.sourceUrl, b.part)}</span></p>`;

      const prHtml = (p: PR) => {
        const sec = toSec(p.time);
        return (
          `<li class="pr" id="pr-${p.id}"><article>` +
          `<h3 class="pr__label">${esc(p.label)}${p.placeholder ? SAMPLE : ''}</h3>` +
          `<p class="pr__time"><time datetime="PT${Math.round(sec)}S">${digits(p.time)}</time></p>` +
          `<dl class="pr__meta">` +
          `<div><dt>Pace</dt><dd>${digits(pacePerKm(sec, p.meters))}<small>/km</small></dd></div>` +
          (p.race ? `<div><dt>Race</dt><dd>${esc(p.race)}</dd></div>` : '') +
          (p.date ? `<div><dt>When</dt><dd>${esc(monthYear(p.date))}</dd></div>` : '') +
          `</dl></article></li>`
        );
      };

      const pr = prs.find((p) => p.id === race.prId);
      const chart = raceChart(race, pr ? toSec(pr.time) : undefined);
      const noteHtml = (n: Note) => `<li class="note" data-at="${n.at}"><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></li>`;

      const projectHtml = (p: Project) =>
        `<li class="project" id="project-${p.id}"><a href="${esc(p.url)}" rel="noopener">` +
        `<span class="project__kind">${esc(p.kind)} <span class="project__status">${esc(p.status)}</span></span>` +
        `<span class="project__name">${esc(p.name)}</span>` +
        `<span class="project__text">${esc(p.text)}</span>` +
        `<span class="project__tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</span>` +
        `<span class="project__go" aria-hidden="true"></span></a></li>`;

      const { cycling, photography } = hobbies;
      const cyclingHtml =
        `<p>${esc(cycling.text)} <a href="${esc(cycling.siteUrl)}" rel="noopener">${esc(cycling.siteName)}</a>.</p>`;

      // The photography block points at the library page, with the teaser car's card art.
      const teaser = library.cars.find((c) => c.id === photography.teaser) ?? library.cars[0];
      const teaserTier = teaser && rarityOf(library.rarity, teaser.built);
      const libraryLink = teaser
        ? `<a class="teaser card--${teaserTier.id}" href="library.html">` +
          `<img src="${esc(teaser.photo.thumb ?? teaser.photo.src)}" alt="" loading="lazy" decoding="async"/>` +
          `<span class="teaser__body"><span class="teaser__rarity">${rarityMark(teaserTier.id)}${esc(teaserTier.name)}</span>` +
          `<span class="teaser__name">${esc(teaser.make)} ${esc(teaser.model)}</span>` +
          `<span class="teaser__go">${esc(photography.linkText)}: ${library.cars.length} car ${library.cars.length === 1 ? 'card' : 'cards'}</span></span></a>`
        : `<a class="teaser" href="library.html">${esc(photography.linkText)}</a>`;

      // Cite in the order things appear on the page, so source numbers read top to bottom.
      const bubblesOut = bubbles.map(bubbleHtml).join('');
      const sources = urls
        .map((u, i) => {
          const host = new URL(u).hostname.replace(/^www\./, '');
          return `<li id="src-${i + 1}"><a href="${esc(u)}" rel="noopener">${esc(host)}</a> <span>${esc(labels.get(u) ?? '')}</span></li>`;
        })
        .join('');

      return html
        .replace('<!--bubbles-->', bubblesOut)
        .replace('<!--prs-->', prs.map(prHtml).join(''))
        .replace('<!--race-name-->', esc(race.name) + (race.placeholder ? SAMPLE : ''))
        .replace('<!--race-time-->', pr ? esc(pr.time) : fmt(chart.total))
        .replace('<!--race-avg-->', fmt(chart.avg))
        .replaceAll('<!--race-km-->', String(chart.n))
        .replace('<!--race-chart-->', chart.svg)
        .replace('<!--race-notes-->', notes.map(noteHtml).join(''))
        .replace('<!--bike-name-->', esc(cycling.bike))
        .replace('<!--cycling-->', cyclingHtml)
        .replace('<!--bike-svg-->', bikeSvg(esc(cycling.bike)))
        .replace('<!--photography-->', `<p>${esc(photography.text)}</p>`)
        .replace('<!--library-link-->', libraryLink)
        .replace('<!--projects-->', projects.map(projectHtml).join(''))
        .replace('<!--sources-->', sources);
    },
  };
}

export default defineConfig(({ mode }) => {
  // `vite build --mode artifact` makes one self-contained page for embedded viewers that block
  // separate asset requests: one JS bundle, fonts inlined into the CSS. It builds one page at a
  // time (ARTIFACT_PAGE=index|library) into dist-artifact/<page>/, and scripts/inline-artifact.mjs
  // then folds that page's CSS and JS into its HTML.
  const artifact = mode === 'artifact';
  const page = process.env.ARTIFACT_PAGE === 'library' ? 'library' : 'index';
  const root = new URL('.', import.meta.url).pathname;
  return {
    // Relative asset URLs so the build also runs from a subfolder or an embedded viewer.
    base: './',
    plugins: [contentInHtml()],
    build: {
      target: 'es2022',
      outDir: artifact ? `dist-artifact/${page}` : 'dist',
      // three is the bulk of the 3D chunk; it loads only when WebGL mode is chosen.
      chunkSizeWarningLimit: artifact ? 2000 : 800,
      rollupOptions: artifact
        ? { input: `${root}${page}.html`, output: { inlineDynamicImports: true } }
        : { input: { index: `${root}index.html`, library: `${root}library.html` } },
      ...(artifact && {
        assetsInlineLimit: 10_000_000,
        cssCodeSplit: false,
      }),
    },
  };
});
