# DEV NOTES

## What worked

- Using a preprocessing script for `data/exoplanets.csv` kept runtime logic simple and let the app work from static JSON in both `data/exoplanets.json` and `public/data/exoplanets.json`.
- Converting RA/Dec/distance into galactic Cartesian coordinates with the standard equatorial-to-galactic rotation matrix produced stable 3D positions with zero `NaN` spatial records.
- Rendering host stars as a single custom `THREE.Points` cloud with shader-driven size, color, hover focus, and search pulse kept the scene efficient even with bloom and HUD overlays enabled.
- Keeping the procedural planet preview in a second isolated Three.js renderer avoided complicating the main galaxy scene and made it easier to tune materials and lighting per selected planet.
- The redesign stayed safe by keeping all UX changes in `src/main.js`, `src/styles.css`, and `index.html` instead of touching the star renderer, planet renderer, audio engine, or JSON pipeline.
- A CSS-first glassmorphism system with one shared `.glass-panel` treatment made it easy to restyle the search shell, filter tray, scan panel, tooltip, and help card consistently.
- Driving the intro camera move with GSAP while temporarily disabling `OrbitControls` gave a cinematic first-load sequence without changing the existing exploration controls or focus flight logic.
- Using a runtime `.effects-reduced` fallback lets the app drop backdrop blur if the post-intro FPS sample falls below `55`, which is safer than assuming heavy glass effects are always cheap.

## What broke

- `vite dev` could not be started inside this Codex sandbox because local port binding is blocked (`listen EPERM`). Verification had to use `npm run build`, artifact checks, and data assertions instead of live browser inspection.
- `vite preview` fails for the same reason (`listen EPERM` on `127.0.0.1:4174`), so local browser automation against a bound port is not possible in this environment.
- A file-based headless Chrome smoke test against `dist/index.html` crashed before producing a DOM dump or screenshot, so there is still no trustworthy in-sandbox visual confirmation of the final layout.
- `curl -sI` to the Google Fonts stylesheet URLs fails in this sandbox because outbound network access is blocked, so exact header verification for those font URLs must be rerun outside Codex.
- The strict ice-giant rule from the original prompt (`pl_eqt < 100` and `pl_rade 3-6`) produced zero matches in this NASA CSV slice. The bucket was widened to the coolest Neptune-scale planets actually present (`pl_rade 3-6` and `pl_eqt <= 250` or missing) so the filter and planet renderer remain usable.
- The CSV does not include an explicit survey/facility field, so the survey filter uses naming and discovery-method heuristics (`Kepler`, `TOI/TIC`, known ground-based prefixes, then `Other`).

## What was surprising

- The dataset contains 6,138 planets, but only 6,011 have the distance data needed for real 3D spatial placement. The app keeps NASA values intact and does not invent missing distances.
- The archive currently has `4,572` systems total but only `4,466` renderable systems with galactic coordinates, so the new subtle filter count should reference systems, not planets.
- Many stars have no `st_spectype`, but most still have `st_teff`, so spectral class fallback by effective temperature covers most of the archive cleanly.
- Chunking Three.js into a separate vendor bundle reduced the app chunk dramatically, but the vendor chunk still needed a slightly higher Vite warning threshold to avoid a false-positive build warning.
- The existing scene already had procedural nebula planes, which made the “interstellar dust” requirement easier to satisfy by retuning opacity/placement rather than adding a second atmospheric subsystem.

## How to extend

- Rebuild the static dataset after changing any CSV parsing or classification rules with `npm run data:build`.
- Run a production compile with `npm run build`. The app fetches `public/data/exoplanets.json`, so the JSON must exist there before deploy.
- Add more filters by extending `typeFlags` in `scripts/build-exoplanets-json.mjs` and then wiring a new filter group in `src/main.js`.
- Tune visuals in three main places:
  - Galaxy scene and interaction logic: `src/main.js`
  - Audio behavior: `src/audio-engine.js`
  - Procedural planet look: `src/planet-view.js`
- The minimal UI shell now lives in `createLayout()` inside `src/main.js`, while nearly all presentation decisions live in `src/styles.css`. If you want to add new floating panels, reuse the `.glass-panel` styling rather than creating a separate panel system.
- The intro sequence is centralized in `startIntroSequence()` in `src/main.js`. If you add more intro beats, keep the persistent UI hidden until that timeline completes or the app will lose the “canvas-first” reveal.
- Google Fonts are loaded from `index.html`. If you change typography again, update the font URLs there and rerun the external URL verification outside this sandbox.
- If you want better survey accuracy, regenerate the source CSV with NASA fields like discovery facility or mission and replace the current heuristic in `src/shared/exoplanets.js`.

## Gotchas

- Web Audio only starts after a real user gesture. Automated verification will not meaningfully test the ambient drone or hover accents.
- This sandbox cannot host a local dev server, so visual verification must happen outside Codex in a real browser.
- The search/filter tray visibility is controlled in JS, not just CSS. `setFiltersVisible()` and `hideCommandDeckPanels()` must stay in sync with `state.searchResultsVisible` or the dropdowns will get stuck open/closed.
- The subtle animated border uses a masked pseudo-element. If a browser ever renders broken borders, disable that effect first before ripping out the glass panel styling.
- The runtime performance fallback depends on `document.documentElement.classList.add('effects-reduced')`. Keep any future blur-heavy effects gated by that same class instead of inventing a second fallback path.
- Do not replace the JSON fetch path with a direct source import unless you want the entire NASA dataset bundled into the app JS.
- The search index is intentionally built from both host stars and planets. If you add more searchable fields, keep the result count capped or the UI will become noisy.
- `B/O` is grouped into one spectral filter bucket on purpose to match the prompt and keep the UI compact.

## Mobile / Responsive

- The search shell is centered and stays usable down to narrow mobile widths by collapsing to `calc(100vw - 28px)`.
- At `768px` and below, the scan panel becomes a bottom sheet and the help/credit controls stay pinned to the lower-right corner.
- The filter tray and search results remain tied to the floating search shell on mobile; verify tap targets and hover-less help behavior in a real browser before shipping additional controls there.
- OrbitControls handles touch orbit and pinch zoom automatically; manual browser testing on a tablet-sized viewport is still needed because it could not be exercised in this sandbox.

## Dependency Verification

- Local runtime dependencies already present in `node_modules`: `three`, `vite`, `gsap`, and `gh-pages`.
- External font stylesheets were added in `index.html`:
  - `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&display=swap`
  - `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap`
- The required `curl -sI` verification for those Google Fonts URLs could not run inside this sandbox because outbound network access is blocked. Re-run those exact commands outside Codex before treating font verification as complete.
