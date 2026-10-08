# Yona

A single-page, scroll-driven personal site: Yona's running and the other things Yona builds. Scroll progress is distance. A 3D 400 m track sits behind the page, the camera follows a runner round one lap of lane 1 while short notes pop up beside the track, and then the page moves on to personal records, a pace chart of the best race that draws itself as you scroll, hobbies (a bike drawn in line as you scroll, and a photo library), and links to other projects.

It is a sister site to [Flamme Rouge](https://github.com/yonabrick-png/Cycling-website) and uses the same stack and effects: Vite + TypeScript, three.js, anime.js 4 (`onScroll`, `createDrawable`, `createMotionPath`, `scrambleText`, `splitText`), and Lenis.

```sh
npm install
npm run dev            # http://localhost:5173
npm run build          # content check + typecheck + production build
npm run test:e2e       # Playwright: screenshots, fallbacks, perf budget (needs `npm run build` first)
npm run build:artifact # self-contained HTML for embedded viewers: dist-artifact/yona.html and library.html
```

Useful query strings: `?mode=text` (plain document), `?quality=low|high` (force a quality tier).

## Editing the content

Everything on the page comes from `src/content/*.json` and is written into the HTML at build time, so the site reads fully with JavaScript off.

| File | What it holds |
|---|---|
| `bubbles.json` | The five notes that pop up during the lap. `status: personal` is your own words: rewrite freely. Max 35 words each. |
| `prs.json` | Personal records: distance, time (`m:ss` or `h:mm:ss`), race, month. Pace per km is worked out for you. |
| `race.json` | The best race: per-km splits as your watch recorded them (within 2% of that PR's time; the race clock is scaled to finish on the official time) and notes placed along the race (`at` 0..1). |
| `hobbies.json` | Cycling (your bike and a line about it) and the photography blurb, which links to the library page. |
| `library.json` | The library page (`library.html`). **Cars:** one entry per car photo, shown as a collector card: make, model, version, year, power, three stats, a line of text, where you spotted it, the photo (`src`, optional smaller `thumb`, and `alt` text), and a `sourceUrl` for the facts. Rarity is worked out from `built` (how many of that exact version were made) using the `rarity` scale in the same file: 20 or fewer is Legendary, 21 to 100 Epic, 101 to 1,000 Rare, 1,001 to 10,000 Uncommon, more is Common. **Photos:** other pictures, each with `src` and `alt`. Put image files in `public/photos/`. |
| `projects.json` | Project cards: name, one line, tags, link. |

A PR's `race` and `date` are optional; leave them empty and the card shows just the time and pace. Mark anything not yet real with `"placeholder": true`: it gets a yellow *Sample* tag on the page and a warning at build time.

The project links point at GitHub repos. Skyline Capital, Flamme Rouge and Online Orders API are private, so visitors get a 404 there: swap in a live URL or make the repo public.

`npm run build` fails on an unsourced track fact, a note over 35 words, overlapping note ranges, a time that doesn't parse, or splits more than 2% off the PR.
