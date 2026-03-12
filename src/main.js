import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';

import { AudioEngine } from './audio-engine.js';
import { PlanetPreview } from './planet-view.js';
import { getStarColor, getStarSizeFromRadius, PLANET_TYPE_LABELS, SPECTRAL_CLASS_LABELS, SURVEY_LABELS } from './shared/exoplanets.js';
import './styles.css';

const SCENE_SCALE = 0.05;
const CAMERA_PADDING = 28;
const SEARCH_RESULT_LIMIT = 8;
const BLOOM_STRENGTH = 1.05;
const BLOOM_RADIUS = 0.72;
const BLOOM_THRESHOLD = 0.05;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 120, 450);
const INTRO_CAMERA_MULTIPLIER = 5;
const INTRO_DURATION_SECONDS = 5;
const PERFORMANCE_SAMPLE_COUNT = 180;
const PERFORMANCE_FPS_THRESHOLD = 55;
const TEXT_VALUE_FIELDS = new Set(['planetName', 'hostStar', 'discoveryMethod']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function formatValue(value, digits = 2, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })}${suffix}`;
}

function normalizeText(value = '') {
  return `${value}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildFilterChips(group, labels) {
  return labels
    .map(
      (label) => `
        <button class="filter-chip" type="button" data-filter-group="${group}" data-filter-value="${label}">
          ${label}
        </button>
      `,
    )
    .join('');
}

function createLayout(meta) {
  const app = document.querySelector('#app');
  const isDev = import.meta.env.DEV;

  app.innerHTML = `
    <main class="app-shell">
      <div class="background-halo" aria-hidden="true"></div>
      <canvas class="scene-canvas" aria-label="Mass Effect Real Space galaxy map"></canvas>

      <div class="scene-overlay">
        <div class="grain-layer" aria-hidden="true"></div>
        <div class="vignette-layer" aria-hidden="true"></div>

        <div class="intro-overlay" data-intro-overlay>
          <div class="intro-title" data-intro-title>MASS EFFECT: REAL SPACE</div>
          <div class="intro-subtitle" data-intro-subtitle>${meta.planetCount.toLocaleString()} Real NASA Exoplanets</div>
        </div>

        <div class="ui-layer" data-ui-layer>
          <header class="command-deck" data-command-deck>
            <div class="command-deck__mark">MASS EFFECT: REAL SPACE</div>

            <div class="search-stack">
              <div class="search-shell glass-panel" data-search-shell>
                <div class="search-row">
                  <input
                    class="search-input"
                    id="search-input"
                    name="search-input"
                    type="search"
                    autocomplete="off"
                    aria-label="Search exoplanets or host stars"
                    placeholder="Search ${meta.planetCount.toLocaleString()} exoplanets..."
                  />
                  <button class="filter-button" type="button" data-filter-toggle aria-label="Toggle filters" aria-expanded="false">
                    <span></span>
                    <span></span>
                    <span></span>
                  </button>
                </div>

                <div class="search-summary" data-filter-summary>
                  <span class="search-summary__count" data-filter-count></span>
                  <span class="search-summary__status" data-filter-status></span>
                </div>
              </div>

              <div class="filter-panel glass-panel" data-filter-panel>
                <section class="filter-group">
                  <div class="panel-label">By Survey</div>
                  <div class="filter-chip-row">${buildFilterChips('survey', SURVEY_LABELS)}</div>
                </section>

                <section class="filter-group">
                  <div class="panel-label">By Type</div>
                  <div class="filter-chip-row">${buildFilterChips('type', PLANET_TYPE_LABELS)}</div>
                </section>

                <section class="filter-group">
                  <div class="panel-label">By Spectral Class</div>
                  <div class="filter-chip-row">${buildFilterChips('spectral', SPECTRAL_CLASS_LABELS)}</div>
                </section>
              </div>

              <div class="search-results glass-panel" data-search-results></div>
            </div>
          </header>

          <section class="scan-panel glass-panel" data-scan-panel>
            <div class="scan-panel__beam" aria-hidden="true"></div>

            <div class="scan-header">
              <div>
                <div class="panel-label">Planet Scan</div>
                <h2 class="scan-title" data-scan-title>System Offline</h2>
                <p class="scan-subtitle" data-scan-subtitle>Select a star to open the planetary dossier.</p>
              </div>
              <button class="close-button" type="button" data-close-panel>Close</button>
            </div>

            <div class="planet-pills" data-planet-pills></div>

            <div class="planet-layout">
              <div class="planet-stage" data-planet-stage></div>
              <div class="data-grid">
                ${[
                  ['Planet Name', 'planetName'],
                  ['Host Star', 'hostStar'],
                  ['Mass', 'massEarth'],
                  ['Radius', 'radiusEarth'],
                  ['Orbital Period', 'orbitalPeriodDays'],
                  ['Equilibrium Temp', 'equilibriumTempK'],
                  ['Semi-Major Axis', 'semiMajorAxisAu'],
                  ['Discovery Method', 'discoveryMethod'],
                  ['Discovery Year', 'discoveryYear'],
                ]
                  .map(
                    ([label, key]) => `
                      <div class="data-row ${TEXT_VALUE_FIELDS.has(key) ? 'data-row--text' : ''}" data-field-row="${key}">
                        <div class="data-row__label">${label}</div>
                        <div class="data-row__value" data-field-value="${key}">Awaiting scan...</div>
                      </div>
                    `,
                  )
                  .join('')}
              </div>
            </div>
          </section>

          <div class="tooltip glass-panel" data-tooltip></div>

          <footer class="corner-tools">
            <div class="corner-tools__meta">
              <a
                class="archive-credit"
                href="https://exoplanetarchive.ipac.caltech.edu/"
                target="_blank"
                rel="noreferrer"
              >
                NASA Exoplanet Archive
              </a>
              <div class="fps-badge" ${isDev ? '' : 'hidden'} data-fps-badge>FPS: --</div>
            </div>

            <div class="help-cluster">
              <button class="help-button" type="button" aria-label="Show controls">?</button>
              <div class="help-card glass-panel">
                <div class="panel-label">Controls</div>
                <div class="help-line">Drag: orbit</div>
                <div class="help-line">Right drag: pan</div>
                <div class="help-line">Scroll: zoom</div>
                <div class="help-line">WASD: drift</div>
                <div class="help-line">Click a star: scan + audio</div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  `;
}

function configureVisualFallbacks() {
  const supportsBackdrop =
    (window.CSS && window.CSS.supports('backdrop-filter: blur(1px)')) ||
    (window.CSS && window.CSS.supports('-webkit-backdrop-filter: blur(1px)'));

  document.documentElement.classList.toggle('effects-reduced', !supportsBackdrop);
}

function createNebulaTexture(seed, colorHex) {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const base = new THREE.Color(colorHex);

  function hash(valueX, valueY, extraSeed) {
    const sine = Math.sin(valueX * 127.1 + valueY * 311.7 + extraSeed * 91.13) * 43758.5453123;
    return sine - Math.floor(sine);
  }

  function noise(x, y, extraSeed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const xf = x - x0;
    const yf = y - y0;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const tl = hash(x0, y0, extraSeed);
    const tr = hash(x0 + 1, y0, extraSeed);
    const bl = hash(x0, y0 + 1, extraSeed);
    const br = hash(x0 + 1, y0 + 1, extraSeed);
    const top = tl + (tr - tl) * u;
    const bottom = bl + (br - bl) * u;
    return top + (bottom - top) * v;
  }

  function fbm(x, y, extraSeed) {
    let total = 0;
    let amplitude = 0.58;
    let frequency = 1;
    let sum = 0;

    for (let octave = 0; octave < 4; octave += 1) {
      total += noise(x * frequency, y * frequency, extraSeed + octave * 11.27) * amplitude;
      sum += amplitude;
      amplitude *= 0.52;
      frequency *= 2;
    }

    return total / sum;
  }

  for (let y = 0; y < size; y += 1) {
    const normalizedY = y / size - 0.5;

    for (let x = 0; x < size; x += 1) {
      const normalizedX = x / size - 0.5;
      const radius = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      const wisps = fbm(normalizedX * 4.6 + seed, normalizedY * 4.6 - seed, seed * 5.41);
      const swirl = Math.sin((normalizedX * 3.8 - normalizedY * 2.2 + seed) * 7.5 + wisps * 9) * 0.5 + 0.5;
      const density = clamp((1 - radius * 1.7) * (wisps * 0.74 + swirl * 0.26), 0, 1);
      const alpha = density * density * 92;
      const index = (y * size + x) * 4;
      image.data[index] = Math.round(base.r * 255 * clamp(0.42 + density * 0.75, 0, 1));
      image.data[index + 1] = Math.round(base.g * 255 * clamp(0.42 + density * 0.75, 0, 1));
      image.data[index + 2] = Math.round(base.b * 255 * clamp(0.52 + density * 0.68, 0, 1));
      image.data[index + 3] = Math.round(alpha);
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getKeplerCentroid(renderableSystems) {
  const keplerSystems = renderableSystems.filter((system) => system.survey === 'Kepler');
  const systems = keplerSystems.length ? keplerSystems : renderableSystems;
  const centroid = new THREE.Vector3();

  systems.forEach((system) => {
    centroid.add(new THREE.Vector3(system.galactic.x * SCENE_SCALE, system.galactic.y * SCENE_SCALE, system.galactic.z * SCENE_SCALE));
  });

  return centroid.divideScalar(systems.length || 1);
}

function buildNebulaPlanes(scene, renderableSystems) {
  const anchor = getKeplerCentroid(renderableSystems);
  const colors = ['#1f3e7a', '#342f67', '#224766', '#3d356f', '#2a335d'];
  const offsets = [
    new THREE.Vector3(0, 18, -120),
    new THREE.Vector3(92, -44, -168),
    new THREE.Vector3(-110, 64, -214),
    new THREE.Vector3(54, 122, -262),
    new THREE.Vector3(-78, -92, -318),
  ];

  return offsets.map((offset, index) => {
    const texture = createNebulaTexture(index + 1.4, colors[index % colors.length]);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.024 + index * 0.005,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const width = 320 + index * 42;
    const height = 220 + index * 28;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    plane.position.copy(anchor).add(offset);
    plane.rotation.z = index * 0.28;
    plane.userData.anchor = plane.position.clone();
    scene.add(plane);
    return plane;
  });
}

function buildSearchIndex(data) {
  const results = [];

  for (const system of data.systems) {
    const hostTerms = normalizeText(system.hostname);
    results.push({
      kind: 'host',
      id: system.id,
      systemId: system.id,
      label: system.hostname,
      meta: `${system.spectralBucket || 'Unknown'} • ${formatValue(system.distanceLy, 1, ' ly')}`,
      searchTerms: hostTerms,
    });
  }

  for (const planet of data.planets) {
    const planetTerms = `${normalizeText(planet.name)} ${normalizeText(planet.hostname)}`;
    results.push({
      kind: 'planet',
      id: planet.id,
      systemId: planet.systemId,
      planetId: planet.id,
      label: planet.name,
      meta: `${planet.hostname} • ${planet.discovery.survey}`,
      searchTerms: planetTerms,
    });
  }

  return results;
}

function buildFieldValueMap(system, planet) {
  return {
    planetName: `<span class="value-text">${planet.name}</span>`,
    hostStar: `<span class="value-text">${system.hostname}</span>`,
    massEarth: formatValue(planet.planet.massEarth, 2, ' M⊕'),
    radiusEarth: formatValue(planet.planet.radiusEarth, 2, ' R⊕'),
    orbitalPeriodDays: formatValue(planet.planet.orbitalPeriodDays, 2, ' days'),
    equilibriumTempK: formatValue(planet.planet.equilibriumTempK, 0, ' K'),
    semiMajorAxisAu: formatValue(planet.planet.semiMajorAxisAu, 3, ' AU'),
    discoveryMethod: `<span class="value-text">${planet.discovery.method ?? 'N/A'}</span>`,
    discoveryYear: formatValue(planet.discovery.year, 0),
  };
}

function createState(data) {
  const planetsBySystemId = new Map();
  const planetsById = new Map();
  const systemsById = new Map();
  const renderableSystems = data.systems.filter((system) => system.renderable && system.galactic);

  for (const system of data.systems) {
    systemsById.set(system.id, system);
  }

  for (const planet of data.planets) {
    planetsById.set(planet.id, planet);
    const list = planetsBySystemId.get(planet.systemId) ?? [];
    list.push(planet);
    planetsBySystemId.set(planet.systemId, list);
  }

  for (const [systemId, planets] of planetsBySystemId.entries()) {
    planets.sort((a, b) => {
      if ((a.discovery.year ?? 9999) !== (b.discovery.year ?? 9999)) {
        return (a.discovery.year ?? 9999) - (b.discovery.year ?? 9999);
      }

      return a.name.localeCompare(b.name);
    });
  }

  return {
    data,
    renderableSystems,
    planetsBySystemId,
    planetsById,
    systemsById,
    activeFilters: {
      survey: null,
      type: null,
      spectral: null,
    },
    hoveredSystemId: null,
    selectedSystemId: null,
    selectedPlanetId: null,
    searchResults: [],
    searchResultsVisible: false,
    searchMatchSystemIds: new Set(),
    searchIndex: buildSearchIndex(data),
    flyAnimation: null,
    keys: new Set(),
    scanTimers: [],
    filtersVisible: false,
    filtersPinned: false,
    introComplete: false,
    pointer: new THREE.Vector2(2, 2),
    pointerScreen: { x: 0, y: 0 },
    needsHoverUpdate: true,
    fpsHistory: [],
    lastFrameTime: performance.now(),
    performanceGate: {
      active: false,
      reduced: document.documentElement.classList.contains('effects-reduced'),
      samples: [],
    },
  };
}

function systemMatchesFilters(system, filters) {
  if (filters.survey && system.survey !== filters.survey) {
    return false;
  }

  if (filters.type) {
    const typeMatches = {
      'Hot Jupiters': system.typeFlags.hotJupiters,
      Rocky: system.typeFlags.rocky,
      'Ice Giants': system.typeFlags.iceGiants,
      'Super-Earths': system.typeFlags.superEarths,
      'Hab Zone': system.typeFlags.habZone,
    };

    if (!typeMatches[filters.type]) {
      return false;
    }
  }

  if (filters.spectral && system.spectralBucket !== filters.spectral) {
    return false;
  }

  return true;
}

function setFiltersVisible(state, refs, visible, pinned = state.filtersPinned) {
  state.filtersVisible = visible;
  state.filtersPinned = visible ? pinned : false;
  refs.filterToggle.setAttribute('aria-expanded', visible ? 'true' : 'false');
  refs.filterPanel.classList.toggle('is-visible', visible);
  refs.searchShell.classList.toggle('is-active', visible || state.searchResultsVisible);
}

function hideCommandDeckPanels(state, refs) {
  state.searchResultsVisible = false;
  setFiltersVisible(state, refs, false, false);
  refs.searchResults.classList.remove('is-visible');
  refs.searchShell.classList.toggle('is-active', false);
}

function runSearch(state, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    state.searchResults = [];
    state.searchResultsVisible = false;
    state.searchMatchSystemIds = new Set();
    return;
  }

  const scored = [];

  for (const entry of state.searchIndex) {
    const directIndex = entry.searchTerms.indexOf(normalizedQuery);
    if (directIndex === -1) {
      continue;
    }

    scored.push({
      ...entry,
      score: directIndex + entry.label.length * 0.01 + (entry.kind === 'host' ? -0.2 : 0),
    });
  }

  scored.sort((left, right) => left.score - right.score || left.label.localeCompare(right.label));
  state.searchResults = scored.slice(0, SEARCH_RESULT_LIMIT);
  state.searchResultsVisible = state.searchResults.length > 0;
  state.searchMatchSystemIds = new Set(scored.map((entry) => entry.systemId));
}

function updateSearchResults(state, refs, onResultClick) {
  if (!state.searchResults.length || !state.searchResultsVisible) {
    refs.searchResults.classList.remove('is-visible');
    refs.searchResults.innerHTML = '';
    refs.searchShell.classList.toggle('is-active', state.filtersVisible);
    return;
  }

  refs.searchResults.classList.add('is-visible');
  refs.searchShell.classList.add('is-active');
  refs.searchResults.innerHTML = state.searchResults
    .map(
      (result) => `
        <button class="search-result" type="button" data-result-id="${result.id}" data-system-id="${result.systemId}" ${
          result.planetId ? `data-planet-id="${result.planetId}"` : ''
        }>
          <span class="result-title">${result.label}</span>
          <span class="result-meta">${result.kind === 'planet' ? 'PLANET' : 'HOST STAR'} • ${result.meta}</span>
        </button>
      `,
    )
    .join('');

  refs.searchResults.querySelectorAll('.search-result').forEach((button) => {
    button.addEventListener('click', () => {
      onResultClick(button.dataset.systemId, button.dataset.planetId ?? null);
    });
  });
}

function updateFilterSummary(state, refs, visibleCount) {
  const activeFilters = Object.values(state.activeFilters).filter(Boolean);
  if (!activeFilters.length) {
    refs.filterSummary.classList.remove('is-visible');
    refs.filterCount.textContent = '';
    refs.filterStatus.textContent = '';
    return;
  }

  refs.filterCount.textContent = `${visibleCount.toLocaleString()} of ${state.data.meta.systemCount.toLocaleString()} systems`;
  refs.filterStatus.textContent = activeFilters.join(' • ');
  refs.filterSummary.classList.add('is-visible');
}

function createStarField(renderableSystems) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(renderableSystems.length * 3);
  const colors = new Float32Array(renderableSystems.length * 3);
  const sizes = new Float32Array(renderableSystems.length);
  const focus = new Float32Array(renderableSystems.length);
  const visibility = new Float32Array(renderableSystems.length);
  const searchMatch = new Float32Array(renderableSystems.length);
  const pulseOffsets = new Float32Array(renderableSystems.length);

  renderableSystems.forEach((system, index) => {
    const { x, y, z } = system.galactic;
    const color = new THREE.Color(getStarColor(system.spectralClass));

    positions[index * 3] = x * SCENE_SCALE;
    positions[index * 3 + 1] = y * SCENE_SCALE;
    positions[index * 3 + 2] = z * SCENE_SCALE;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    sizes[index] = getStarSizeFromRadius(system.radius);
    focus[index] = 0;
    visibility[index] = 1;
    searchMatch[index] = 0;
    pulseOffsets[index] = Math.random();
    system.renderIndex = index;
    system.scenePosition = new THREE.Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aFocus', new THREE.BufferAttribute(focus, 1));
  geometry.setAttribute('aVisibility', new THREE.BufferAttribute(visibility, 1));
  geometry.setAttribute('aSearchMatch', new THREE.BufferAttribute(searchMatch, 1));
  geometry.setAttribute('aPulseOffset', new THREE.BufferAttribute(pulseOffsets, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aFocus;
      attribute float aVisibility;
      attribute float aSearchMatch;
      attribute float aPulseOffset;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float distanceScale = clamp(380.0 / max(1.0, -mvPosition.z), 0.7, 16.0);
        float pulse = 1.0 + aSearchMatch * (0.22 + 0.16 * sin(uTime * 3.6 + aPulseOffset * 6.28318));
        float focusBoost = 1.0 + aFocus * 1.5;
        float visibilityBoost = mix(0.22, 1.0, aVisibility);
        gl_PointSize = aSize * distanceScale * pulse * focusBoost;
        gl_Position = projectionMatrix * mvPosition;
        vColor = mix(aColor * 0.26, aColor * (1.2 + aFocus * 0.65), visibilityBoost);
        vAlpha = mix(0.12, 1.0, visibilityBoost) + aFocus * 0.12;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float radius = length(centered);
        if (radius > 0.5) {
          discard;
        }
        float core = smoothstep(0.18, 0.0, radius);
        float glow = smoothstep(0.52, 0.0, radius);
        float halo = pow(max(0.0, 1.0 - radius * 1.85), 3.5);
        vec3 color = vColor * (0.35 + glow * 0.9 + core * 1.5 + halo * 0.55);
        float alpha = (glow * 0.68 + core * 0.42 + halo * 0.32) * vAlpha;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  return { geometry, material, points };
}

function updateStarAttributes(state, starField, refs) {
  const focusAttr = starField.geometry.getAttribute('aFocus');
  const visibilityAttr = starField.geometry.getAttribute('aVisibility');
  const searchAttr = starField.geometry.getAttribute('aSearchMatch');

  let visibleCount = 0;

  for (const system of state.renderableSystems) {
    const visible = systemMatchesFilters(system, state.activeFilters);
    if (visible) {
      visibleCount += 1;
    }

    const isSelected = system.id === state.selectedSystemId;
    const isHovered = system.id === state.hoveredSystemId;
    const isSearchMatch = state.searchMatchSystemIds.has(system.id);

    visibilityAttr.array[system.renderIndex] = isSelected ? 1 : visible ? 1 : 0.16;
    searchAttr.array[system.renderIndex] = isSearchMatch ? 1 : 0;
    focusAttr.array[system.renderIndex] = isSelected ? 1 : isHovered ? 0.58 : 0;
  }

  focusAttr.needsUpdate = true;
  visibilityAttr.needsUpdate = true;
  searchAttr.needsUpdate = true;
  updateFilterSummary(state, refs, visibleCount);
}

function updateTooltip(state, refs) {
  if (!state.introComplete) {
    refs.tooltip.classList.remove('is-visible');
    return;
  }

  const system = state.hoveredSystemId ? state.systemsById.get(state.hoveredSystemId) : null;
  if (!system) {
    refs.tooltip.classList.remove('is-visible');
    return;
  }

  refs.tooltip.innerHTML = `
    <div class="tooltip-title">${system.hostname}</div>
    <div class="tooltip-meta">
      <span>${formatValue(system.distanceLy, 1, ' ly')}</span>
      <span>${system.spectralType || system.spectralClass || 'Unknown'}</span>
      <span>${system.planetCount} planets</span>
    </div>
  `;

  refs.tooltip.classList.add('is-visible');
  const tooltipWidth = 220;
  const tooltipHeight = 92;
  const left = clamp(state.pointerScreen.x + 18, 12, window.innerWidth - tooltipWidth - 12);
  const top = clamp(state.pointerScreen.y + 18, 12, window.innerHeight - tooltipHeight - 12);
  refs.tooltip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
}

function clearScanTimers(state) {
  state.scanTimers.forEach((timer) => window.clearTimeout(timer));
  state.scanTimers = [];
}

function updatePlanetPills(state, refs, system, selectedPlanetId, onPlanetChange) {
  const planets = state.planetsBySystemId.get(system.id) ?? [];
  refs.planetPills.innerHTML = planets
    .map(
      (planet) => `
        <button class="planet-pill ${planet.id === selectedPlanetId ? 'is-active' : ''}" type="button" data-planet-select="${planet.id}">
          ${planet.name}
        </button>
      `,
    )
    .join('');

  refs.planetPills.querySelectorAll('[data-planet-select]').forEach((button) => {
    button.addEventListener('click', () => {
      onPlanetChange(button.dataset.planetSelect);
    });
  });
}

function revealPlanetData(state, refs, system, planet) {
  const values = buildFieldValueMap(system, planet);
  const fields = Object.entries(values);
  clearScanTimers(state);

  refs.scanPanel.classList.add('is-scanning');
  refs.scanTitle.textContent = system.hostname;
  refs.scanSubtitle.textContent = `${formatValue(system.distanceLy, 1, ' ly')} • ${system.spectralBucket} star • ${planet.discovery.survey}`;

  fields.forEach(([fieldKey]) => {
    refs.fieldValues[fieldKey].textContent = 'Scanning...';
    refs.fieldRows[fieldKey].classList.remove('is-revealed');
  });

  fields.forEach(([fieldKey, value], index) => {
    const timer = window.setTimeout(() => {
      refs.fieldValues[fieldKey].innerHTML = value;
      refs.fieldRows[fieldKey].classList.add('is-revealed');
      if (index === fields.length - 1) {
        refs.scanPanel.classList.remove('is-scanning');
      }
    }, 190 * index + 120);

    state.scanTimers.push(timer);
  });
}

function focusSystem(state, refs, controls, systemId, planetId = null) {
  const system = state.systemsById.get(systemId);
  if (!system || !system.scenePosition) {
    return;
  }

  const planets = state.planetsBySystemId.get(system.id) ?? [];
  const selectedPlanet = (planetId && state.planetsById.get(planetId)) || planets[0];
  if (!selectedPlanet) {
    return;
  }

  state.selectedSystemId = system.id;
  state.selectedPlanetId = selectedPlanet.id;
  refs.scanPanel.classList.add('is-visible');
  refs.searchResults.classList.remove('is-visible');
  hideCommandDeckPanels(state, refs);

  updatePlanetPills(state, refs, system, selectedPlanet.id, (nextPlanetId) =>
    focusSystem(state, refs, controls, system.id, nextPlanetId),
  );
  refs.planetPreview.setPlanet(selectedPlanet);
  revealPlanetData(state, refs, system, selectedPlanet);

  const direction = controls.object.position.clone().sub(controls.target).normalize();
  const distance = clamp(getStarSizeFromRadius(system.radius) * 2 + CAMERA_PADDING, 24, 88);
  const targetPosition = system.scenePosition.clone().add(direction.multiplyScalar(distance));
  const startTime = performance.now();

  state.flyAnimation = {
    startTime,
    duration: 1600,
    fromPosition: controls.object.position.clone(),
    toPosition: targetPosition,
    fromTarget: controls.target.clone(),
    toTarget: system.scenePosition.clone(),
  };
}

function closePanel(state, refs) {
  state.selectedSystemId = null;
  state.selectedPlanetId = null;
  state.flyAnimation = null;
  clearScanTimers(state);
  refs.scanPanel.classList.remove('is-visible', 'is-scanning');
}

function updateFlight(state, controls) {
  if (!state.flyAnimation) {
    return;
  }

  const elapsed = performance.now() - state.flyAnimation.startTime;
  const t = clamp(elapsed / state.flyAnimation.duration, 0, 1);
  const eased = easeInOutCubic(t);

  controls.object.position.lerpVectors(state.flyAnimation.fromPosition, state.flyAnimation.toPosition, eased);
  controls.target.lerpVectors(state.flyAnimation.fromTarget, state.flyAnimation.toTarget, eased);

  if (t >= 1) {
    state.flyAnimation = null;
  }
}

function updateKeyboardMovement(state, controls, delta) {
  if (!state.introComplete || !state.keys.size || state.flyAnimation) {
    return;
  }

  const movement = new THREE.Vector3(
    (state.keys.has('KeyD') ? 1 : 0) - (state.keys.has('KeyA') ? 1 : 0),
    0,
    (state.keys.has('KeyS') ? 1 : 0) - (state.keys.has('KeyW') ? 1 : 0),
  );

  if (movement.lengthSq() === 0) {
    return;
  }

  const forward = new THREE.Vector3();
  controls.object.getWorldDirection(forward);
  const right = new THREE.Vector3().crossVectors(forward, controls.object.up).normalize();
  const velocity = clamp(controls.object.position.distanceTo(controls.target) * 0.75, 16, 90) * delta;
  const deltaVector = new THREE.Vector3();
  deltaVector.addScaledVector(forward, movement.z * velocity);
  deltaVector.addScaledVector(right, movement.x * velocity);

  controls.object.position.add(deltaVector);
  controls.target.add(deltaVector);
}

function startIntroSequence(state, refs, camera, controls) {
  const introCameraPosition = DEFAULT_CAMERA_POSITION.clone().multiplyScalar(INTRO_CAMERA_MULTIPLIER);
  camera.position.copy(introCameraPosition);
  controls.target.set(0, 0, 0);
  controls.update();
  controls.enabled = false;

  refs.appShell.classList.remove('is-ui-visible');
  gsap.set(refs.uiLayer, { autoAlpha: 0 });
  gsap.set(refs.introOverlay, { autoAlpha: 0 });
  gsap.set([refs.introTitle, refs.introSubtitle], { y: 18 });

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    onStart: () => {
      refs.appShell.classList.add('is-intro-running');
    },
    onComplete: () => {
      state.introComplete = true;
      state.performanceGate.active = !state.performanceGate.reduced;
      refs.appShell.classList.remove('is-intro-running');
      refs.appShell.classList.add('is-ui-visible');
      controls.enabled = true;
    },
  });

  timeline.to(camera.position, {
    x: DEFAULT_CAMERA_POSITION.x,
    y: DEFAULT_CAMERA_POSITION.y,
    z: DEFAULT_CAMERA_POSITION.z,
    duration: INTRO_DURATION_SECONDS,
  }, 0);

  timeline.to(refs.introOverlay, { autoAlpha: 1, duration: 0.9 }, 1);
  timeline.to(refs.introTitle, { y: 0, duration: 0.9 }, 1);
  timeline.to(refs.introSubtitle, { y: 0, duration: 0.9 }, 1.1);
  timeline.to(refs.introOverlay, { autoAlpha: 0, duration: 0.8 }, 4);
  timeline.to(refs.uiLayer, { autoAlpha: 1, duration: 0.8 }, 4.35);

  return timeline;
}

function maybeReduceEffects(state) {
  if (!state.performanceGate.active || state.performanceGate.reduced || state.performanceGate.samples.length < PERFORMANCE_SAMPLE_COUNT) {
    return;
  }

  const average =
    state.performanceGate.samples.reduce((sum, fps) => sum + fps, 0) / Math.max(state.performanceGate.samples.length, 1);

  state.performanceGate.active = false;
  if (average >= PERFORMANCE_FPS_THRESHOLD) {
    return;
  }

  document.documentElement.classList.add('effects-reduced');
  state.performanceGate.reduced = true;
}

async function init() {
  configureVisualFallbacks();

  const response = await fetch(`${import.meta.env.BASE_URL}data/exoplanets.json`);
  if (!response.ok) {
    throw new Error(`Failed to load exoplanet archive: ${response.status}`);
  }

  const data = await response.json();
  createLayout(data.meta);

  const refs = {
    appShell: document.querySelector('.app-shell'),
    canvas: document.querySelector('.scene-canvas'),
    uiLayer: document.querySelector('[data-ui-layer]'),
    introOverlay: document.querySelector('[data-intro-overlay]'),
    introTitle: document.querySelector('[data-intro-title]'),
    introSubtitle: document.querySelector('[data-intro-subtitle]'),
    commandDeck: document.querySelector('[data-command-deck]'),
    searchShell: document.querySelector('[data-search-shell]'),
    searchInput: document.querySelector('.search-input'),
    searchResults: document.querySelector('[data-search-results]'),
    filterPanel: document.querySelector('[data-filter-panel]'),
    filterToggle: document.querySelector('[data-filter-toggle]'),
    filterSummary: document.querySelector('[data-filter-summary]'),
    filterCount: document.querySelector('[data-filter-count]'),
    filterStatus: document.querySelector('[data-filter-status]'),
    scanPanel: document.querySelector('[data-scan-panel]'),
    scanTitle: document.querySelector('[data-scan-title]'),
    scanSubtitle: document.querySelector('[data-scan-subtitle]'),
    planetPills: document.querySelector('[data-planet-pills]'),
    planetStage: document.querySelector('[data-planet-stage]'),
    tooltip: document.querySelector('[data-tooltip]'),
    closePanel: document.querySelector('[data-close-panel]'),
    fpsBadge: document.querySelector('[data-fps-badge]'),
    fieldValues: Object.fromEntries(
      [...document.querySelectorAll('[data-field-value]')].map((element) => [element.dataset.fieldValue, element]),
    ),
    fieldRows: Object.fromEntries(
      [...document.querySelectorAll('[data-field-row]')].map((element) => [element.dataset.fieldRow, element]),
    ),
  };

  const state = createState(data);
  const audioEngine = new AudioEngine();
  refs.planetPreview = new PlanetPreview(refs.planetStage);

  const renderer = new THREE.WebGLRenderer({
    canvas: refs.canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x01030a, 0.0017);

  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 7000);
  camera.position.copy(DEFAULT_CAMERA_POSITION.clone().multiplyScalar(INTRO_CAMERA_MULTIPLIER));

  const controls = new OrbitControls(camera, refs.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12;
  controls.maxDistance = 2800;
  controls.enablePan = true;
  controls.target.set(0, 0, 0);
  controls.enabled = false;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  const starField = createStarField(state.renderableSystems);
  scene.add(starField.points);
  const nebulaPlanes = buildNebulaPlanes(scene, state.renderableSystems);

  const dustGeometry = new THREE.BufferGeometry();
  const dustCount = 1400;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const radius = 260 + Math.random() * 520;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dustPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    dustPositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    dustPositions[index * 3 + 2] = radius * Math.cos(phi) * 0.35;
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: '#5d7cb6',
      size: 1.1,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(dust);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 6.5;
  const clock = new THREE.Clock();

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);

  refs.searchInput.addEventListener('focus', () => {
    if (!state.introComplete) {
      return;
    }

    setFiltersVisible(state, refs, true, false);
    if (refs.searchInput.value.trim() && state.searchResults.length) {
      state.searchResultsVisible = true;
      updateSearchResults(state, refs, (systemId, planetId) => focusSystem(state, refs, controls, systemId, planetId));
    }
  });

  refs.filterToggle.addEventListener('click', () => {
    if (!state.introComplete) {
      return;
    }

    const shouldClose = state.filtersVisible && state.filtersPinned;
    if (shouldClose) {
      hideCommandDeckPanels(state, refs);
      refs.searchInput.blur();
      return;
    }

    setFiltersVisible(state, refs, true, true);
    refs.searchInput.focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-filter-group]').forEach((button) => {
    button.addEventListener('click', () => {
      const { filterGroup, filterValue } = button.dataset;
      state.activeFilters[filterGroup] = state.activeFilters[filterGroup] === filterValue ? null : filterValue;

      document.querySelectorAll(`[data-filter-group="${filterGroup}"]`).forEach((chip) => {
        chip.classList.toggle('is-active', chip.dataset.filterValue === state.activeFilters[filterGroup]);
      });

      updateStarAttributes(state, starField, refs);
    });
  });

  refs.searchInput.addEventListener('input', () => {
    runSearch(state, refs.searchInput.value);
    setFiltersVisible(state, refs, true, state.filtersPinned);
    updateSearchResults(state, refs, (systemId, planetId) => focusSystem(state, refs, controls, systemId, planetId));
    updateStarAttributes(state, starField, refs);
  });

  refs.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      hideCommandDeckPanels(state, refs);
      refs.searchInput.blur();
      return;
    }

    if (event.key === 'Enter' && state.searchResults.length) {
      const [firstResult] = state.searchResults;
      focusSystem(state, refs, controls, firstResult.systemId, firstResult.planetId ?? null);
      refs.searchResults.classList.remove('is-visible');
      refs.searchInput.blur();
    }
  });

  refs.closePanel.addEventListener('click', () => {
    closePanel(state, refs);
    updateStarAttributes(state, starField, refs);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!state.introComplete) {
      return;
    }

    if (!refs.commandDeck.contains(event.target)) {
      hideCommandDeckPanels(state, refs);
    }
  });

  refs.canvas.addEventListener('pointermove', (event) => {
    if (!state.introComplete) {
      return;
    }

    const rect = refs.canvas.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    state.pointerScreen.x = event.clientX;
    state.pointerScreen.y = event.clientY;
    state.needsHoverUpdate = true;
  });

  refs.canvas.addEventListener('pointerleave', () => {
    state.pointer.set(2, 2);
    state.hoveredSystemId = null;
    state.needsHoverUpdate = true;
    audioEngine.clearHover();
  });

  refs.canvas.addEventListener('click', async () => {
    if (!state.introComplete) {
      return;
    }

    if (!audioEngine.started) {
      await audioEngine.start();
    }

    if (state.hoveredSystemId) {
      focusSystem(state, refs, controls, state.hoveredSystemId);
      updateStarAttributes(state, starField, refs);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePanel(state, refs);
      updateStarAttributes(state, starField, refs);
      return;
    }

    if (!state.introComplete) {
      return;
    }

    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      state.keys.add(event.code);
    }
  });

  window.addEventListener('keyup', (event) => {
    state.keys.delete(event.code);
  });

  function updateHover() {
    if (!state.introComplete) {
      refs.tooltip.classList.remove('is-visible');
      return;
    }

    if (!state.needsHoverUpdate) {
      return;
    }

    state.needsHoverUpdate = false;
    raycaster.params.Points.threshold = clamp(camera.position.distanceTo(controls.target) * 0.02, 3.5, 12);
    raycaster.setFromCamera(state.pointer, camera);
    const intersections = raycaster.intersectObject(starField.points);
    const hit = intersections[0];
    const nextHovered = hit ? state.renderableSystems[hit.index]?.id ?? null : null;

    if (nextHovered !== state.hoveredSystemId) {
      state.hoveredSystemId = nextHovered;

      if (nextHovered) {
        audioEngine.setHoverSystem(state.systemsById.get(nextHovered));
      } else {
        audioEngine.clearHover();
      }

      updateStarAttributes(state, starField, refs);
      updateTooltip(state, refs);
    } else if (nextHovered) {
      updateTooltip(state, refs);
    } else {
      refs.tooltip.classList.remove('is-visible');
    }
  }

  function updateFps(delta) {
    if (state.introComplete && state.performanceGate.active && Number.isFinite(delta) && delta > 0) {
      state.performanceGate.samples.push(1 / delta);
      if (state.performanceGate.samples.length > PERFORMANCE_SAMPLE_COUNT) {
        state.performanceGate.samples.shift();
      }
      maybeReduceEffects(state);
    }

    if (!import.meta.env.DEV || !refs.fpsBadge) {
      return;
    }

    const now = performance.now();
    const frameDelta = now - state.lastFrameTime;
    state.lastFrameTime = now;
    state.fpsHistory.push(1000 / Math.max(frameDelta, 1));
    if (state.fpsHistory.length > 30) {
      state.fpsHistory.shift();
    }
    const average = state.fpsHistory.reduce((sum, fps) => sum + fps, 0) / state.fpsHistory.length;
    refs.fpsBadge.textContent = `FPS: ${Math.round(average)}`;
  }

  updateStarAttributes(state, starField, refs);
  startIntroSequence(state, refs, camera, controls);

  function animate() {
    const delta = clock.getDelta();
    starField.material.uniforms.uTime.value = clock.elapsedTime;

    updateKeyboardMovement(state, controls, delta);
    updateFlight(state, controls);
    controls.update();
    updateHover();
    updateTooltip(state, refs);
    updateFps(delta);

    dust.rotation.y += delta * 0.01;
    dust.rotation.x += delta * 0.004;

    nebulaPlanes.forEach((plane, index) => {
      plane.lookAt(camera.position);
      plane.position.x = plane.userData.anchor.x + Math.sin(clock.elapsedTime * 0.05 + index) * 0.45;
      plane.position.y = plane.userData.anchor.y + Math.cos(clock.elapsedTime * 0.04 + index * 0.8) * 0.3;
    });

    composer.render();
    requestAnimationFrame(animate);
  }

  animate();
}

init().catch((error) => {
  console.error(error);
  document.querySelector('#app').innerHTML = `<pre style="padding: 24px; color: white; background: black;">${error.message}</pre>`;
});
