# Decisions

What was chosen and why.

## Concept: the scroll is a lap

Yona asked for a site "like the cycling one" (Flamme Rouge) about their running, with PRs, an introduction and links to other projects. Flamme Rouge's structure is kept: one hero object the camera moves around as you scroll, notes pinned to points on it, then flat chapters with scroll-synced SVG. The subject changes the object: a bike becomes a 400 m athletics track.

- **Track:** procedural in three.js, built to the standard dimensions (two 84.39 m straights, two 36.5 m bends, eight 1.22 m lanes; lane 1 measured 0.3 m from the kerb, so one lap is 400.0 m). Flat unlit materials for a graphic look. Lane lines are drawn 12 cm wide instead of 5 cm so they survive the aerial shots.
- **The painted name:** "YONA" is painted across the infield like fans paint names on a climb, over faint football-pitch lines. It is the one bold thing in the scene.
- **Runner:** a small stylised figure whose gait is driven by distance, not time (one cycle per 2.8 m), so scrolling back runs it backwards. A shader trail draws the lap covered so far in lane 1.
- **Camera:** one anime.js timeline synced to `#track` moves an orbit rig through seven shots. `follow` blends the target between a fixed point and the runner. The runner sets off at 150vh and crosses the line at 520vh.
- **Notes:** the bubble system is Flamme Rouge's, unchanged: DOM plates projected onto 3D anchors, ranges matched against the viewport centre, so each range sits 50vh after its camera hold.
- **Readout:** the instrument bar counts down a marathon (42.2 km) across the whole page.

## Look

Same type and instruments as Flamme Rouge (Barlow 800 italic, JetBrains Mono, ink background) so the two read as a set. The accent is track-tartan orange `#FF6A3D` instead of flamme-rouge red; on paper (bubble tags) a darker `#A8381A` keeps contrast. Ornaments are lane lines (three slanted bars) and a finish tape instead of the red kite.

## Content

- Intro notes are written in Yona's voice as a first draft (`status: personal`) for Yona to rewrite.
- Track facts are sourced (dlgsc.wa.gov.au sports dimensions guide, which reproduces the World Athletics figures). Retrieved 2026-10-06 via search; the page itself was not reachable from the build environment.
- PRs are Yona's own: 1000 m 3:06, 1500 m 4:44, 2000 m 6:50, 5K 19:47. Races and dates weren't given, so the cards leave them out rather than invent them.
- The best race is the 5K, with Yona's watch splits (3:57, 4:00, 3:57, 4:00, 3:57). They add up to 19:51, four seconds over the official 19:47, which is normal for auto-lap splits. The splits are shown as recorded and the race clock is scaled so the finish reads 19:47. The race notes describe only what the splits show.

## anime.js fixes carried over

- `src/scroll-settle.ts` (from Flamme Rouge): runs every scroll observer on `scrollend`, so a slow frame can't leave scroll-linked state one step behind.
- The camera timeline also applies the camera on `onComplete`/`onBegin`: a jump past the end of the chapter completes the timeline without an `onUpdate`, which left the last shot unapplied.

## Hobbies chapter

Yona asked for their hobbies: cycling (their bike is a Merida Scultura Juliet 4000) and photography, with a place for a photo library to fill later.

- **Cycling:** the bike's name set in the display face, a short line linking to Flamme Rouge, and a single-line road-bike drawing (`scripts/bike-svg.mjs`) that `createDrawable` draws in on scroll: wheels, then frame, then cockpit, the same stroke effect as the pace chart. The drawing is a generic road bike, not a likeness of the Scultura, and the page makes no claims about its specs.
- **Photography:** a grid of 4:5 frames from `hobbies.json`. With no photos yet it shows six empty frames with viewfinder corners and frame numbers, and says the library is "still being developed". The build fails on a photo without alt text.

## Library page

Yona asked for the photo library to be its own page, with a section for cars where each car photo gets an info card "kind of like a Pokémon card", with a rarity that depends on the car.

- **Separate page:** `library.html` is a second Vite entry with its own small script (`src/library.ts`) and stylesheet (`src/styles/library.css`), sharing `main.css`. No 3D, no Lenis: it is a gallery. The main page's photography block now links to it with the first car's thumbnail, and the bar has a Library link.
- **Collector cards:** our own trading-card design (not a copy of any card game's layout or marks): a frame in the tier colour, the car's name and power across the top, the photo, a type line, three stats, a sourced line of text, where it was spotted, and a rarity badge with a card number. Numbers settle with the same scramble as the PR cards.
- **Rarity is computed, never hand-picked:** from how many of that exact version were built, on a fixed scale published on the page (Legendary 20 or fewer, Epic 21 to 100, Rare 101 to 1,000, Uncommon 1,001 to 10,000, Common above). The photographed Centenario is the coupé (20 built, plus 20 roadsters), so it is Legendary.
- **Holo:** Epic and Legendary cards carry a rainbow foil and a glare spot that follow the pointer, and the card tilts a few degrees. Fine pointers only, off under reduced motion.
- **Facts:** the Centenario's figures (770 CV V12, 0–100 km/h in 2.8 s, over 350 km/h, 20 coupés and 20 roadsters, sold out before the 2016 Geneva debut, made for the centenary of Ferruccio Lamborghini's birth) come from Lamborghini's own pages, found by search on 2026-10-08; lamborghini.com itself was not reachable from the build environment.
- **The photo:** Yona's own, re-saved without metadata (it carried no location data). A smaller copy is used for the teaser.
- **Artifact preview:** the artifact build now runs once per page (`ARTIFACT_PAGE`), and the library page is published as a second file beside the main one, with the photos.


### More cars (2026-10-08)

- Added the Lamborghini Veneno (grey coupé, 2013), Lamborghini Sesto Elemento (2010) and Ferrari F40 (1987), identified from the museum signs and plaques in Yona's photos. The Veneno and Sesto Elemento are at MUDETEC, Lamborghini's museum in the Sant'Agata Bolognese factory; the F40 at the Museo Ferrari in Maranello.
- Veneno: the museum wall says 2014, which is the Roadster's year; the photographed car is the grey coupé Lamborghini keeps at MUDETEC, from the 2013 coupé series (3 sold plus this one, so 4 coupés; 9 roadsters). Legendary.
- F40: sources disagree on the total (1,311 or 1,315); the card uses 1,315, RM Sotheby's figure from Maranello's records. Either way it is Uncommon on the scale, so the frame is green, not gold. The scale stays as published rather than being bent for a famous car.
- Each car photo can set a `focus` (object-position) so the card crop centres on the car.
