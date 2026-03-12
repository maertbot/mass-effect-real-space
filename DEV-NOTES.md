# DEV NOTES

## What worked

- Using a preprocessing script for `data/exoplanets.csv` kept runtime logic simple and let the app work from static JSON in both `data/exoplanets.json` and `public/data/exoplanets.json`.
- Converting RA/Dec/distance into galactic Cartesian coordinates with the standard equatorial-to-galactic rotation matrix produced stable 3D positions with zero `NaN` spatial records.
- Rendering host stars as a single custom `THREE.Points` cloud with shader-driven size, color, hover focus, and search pulse kept the scene efficient even with bloom and HUD overlays enabled.
- Keeping the procedural planet preview in a second isolated Three.js renderer avoided complicating the main galaxy scene and made it easier to tune materials and lighting per selected planet.
- A CSS-driven ME-style HUD overlay was faster to iterate on than trying to force the entire interface into WebGL.

## What broke

- `vite dev` could not be started inside this Codex sandbox because local port binding is blocked (`listen EPERM`). Verification had to use `npm run build`, artifact checks, and data assertions instead of live browser inspection.
- The strict ice-giant rule from the original prompt (`pl_eqt < 100` and `pl_rade 3-6`) produced zero matches in this NASA CSV slice. The bucket was widened to the coolest Neptune-scale planets actually present (`pl_rade 3-6` and `pl_eqt <= 250` or missing) so the filter and planet renderer remain usable.
- The CSV does not include an explicit survey/facility field, so the survey filter uses naming and discovery-method heuristics (`Kepler`, `TOI/TIC`, known ground-based prefixes, then `Other`).

## What was surprising

- The dataset contains 6,138 planets, but only 6,011 have the distance data needed for real 3D spatial placement. The app keeps NASA values intact and does not invent missing distances.
- Many stars have no `st_spectype`, but most still have `st_teff`, so spectral class fallback by effective temperature covers most of the archive cleanly.
- Chunking Three.js into a separate vendor bundle reduced the app chunk dramatically, but the vendor chunk still needed a slightly higher Vite warning threshold to avoid a false-positive build warning.

## How to extend

- Rebuild the static dataset after changing any CSV parsing or classification rules with `npm run data:build`.
- Run a production compile with `npm run build`. The app fetches `public/data/exoplanets.json`, so the JSON must exist there before deploy.
- Add more filters by extending `typeFlags` in `scripts/build-exoplanets-json.mjs` and then wiring a new filter group in `src/main.js`.
- Tune visuals in three main places:
  - Galaxy scene and interaction logic: `src/main.js`
  - Audio behavior: `src/audio-engine.js`
  - Procedural planet look: `src/planet-view.js`
- If you want better survey accuracy, regenerate the source CSV with NASA fields like discovery facility or mission and replace the current heuristic in `src/shared/exoplanets.js`.

## Gotchas

- Web Audio only starts after a real user gesture. Automated verification will not meaningfully test the ambient drone or hover accents.
- This sandbox cannot host a local dev server, so visual verification must happen outside Codex in a real browser.
- Do not replace the JSON fetch path with a direct source import unless you want the entire NASA dataset bundled into the app JS.
- The search index is intentionally built from both host stars and planets. If you add more searchable fields, keep the result count capped or the UI will become noisy.
- `B/O` is grouped into one spectral filter bucket on purpose to match the prompt and keep the UI compact.

## Mobile / Responsive

- The UI is designed to stay usable at `768px` and above.
- On narrower layouts, the scan panel becomes a bottom sheet and the filter panel shares the lower edge of the viewport.
- OrbitControls handles touch orbit and pinch zoom automatically; manual browser testing on a tablet-sized viewport is still needed because it could not be exercised in this sandbox.

## Dependency Verification

- No CDN assets are used in this build.
- Runtime dependencies are local npm packages already present in `node_modules`: `three`, `vite`, and `gh-pages`.
