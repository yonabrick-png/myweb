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
