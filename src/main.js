import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
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

function createLayout() {
  const app = document.querySelector('#app');
  const isDev = import.meta.env.DEV;

  app.innerHTML = `
    <main class="app-shell">
      <canvas class="scene-canvas" aria-label="Mass Effect Real Space galaxy map"></canvas>
      <div class="scene-overlay">
        <div class="hud-grid" aria-hidden="true"></div>

        <header class="topbar">
          <section class="brand-panel">
            <div class="brand-eyebrow">Systems Alliance Cartography</div>
            <h1 class="brand-title">Mass Effect:<br />Real Space</h1>
            <p class="brand-subtitle">
              Real NASA exoplanets, projected into galactic 3D space with bloom, scan overlays, and live stellar telemetry.
            </p>
            <div class="brand-stats">
              <div class="status-pill">
                Visible Systems
                <span data-stat-visible>0</span>
              </div>
              <div class="status-pill">
                Total Planets
                <span data-stat-planets>0</span>
              </div>
              <div class="status-pill">
                Spatial Coverage
                <span data-stat-coverage>0</span>
              </div>
            </div>
          </section>

          <section class="search-panel">
            <label class="search-label" for="search-input">Search Planet Or Host Star</label>
            <input
              class="search-input"
              id="search-input"
              name="search-input"
              type="search"
              autocomplete="off"
              placeholder="Try Kepler-442, Proxima Cen, or TOI-700 d"
            />
            <div class="search-results" data-search-results></div>
          </section>

          <aside class="status-pip">
            <div class="status-pip__line">
              <span>Audio</span>
              <span class="audio-status" data-audio-status>Awaiting first click</span>
            </div>
            <div class="status-pip__line">
              <span>Current Focus</span>
              <span data-focus-status>Free navigation</span>
            </div>
            <div class="status-pip__line">
              <span>Filter Mode</span>
              <span data-filter-status>All systems</span>
            </div>
          </aside>
        </header>

        <aside class="filter-panel" data-filter-panel>
          <div class="filter-panel__header">
            <div>
              <div class="panel-label">Tactical Filters</div>
              <div class="filter-count" data-filter-count>0 systems highlighted</div>
            </div>
            <button class="collapse-toggle" type="button" data-filter-toggle>Collapse</button>
          </div>

          <div class="filter-panel__body">
            <section class="filter-group">
              <h2 class="filter-group__title">By Survey</h2>
              <div class="filter-chip-row">${buildFilterChips('survey', SURVEY_LABELS)}</div>
            </section>

            <section class="filter-group">
              <h2 class="filter-group__title">By Type</h2>
              <div class="filter-chip-row">${buildFilterChips('type', PLANET_TYPE_LABELS)}</div>
            </section>

            <section class="filter-group">
              <h2 class="filter-group__title">By Spectral Class</h2>
              <div class="filter-chip-row">${buildFilterChips('spectral', SPECTRAL_CLASS_LABELS)}</div>
            </section>
          </div>
        </aside>

        <section class="scan-panel" data-scan-panel>
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
            <div class="data-grid" data-data-grid>
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
                    <div class="data-row" data-field-row="${key}">
                      <div class="data-row__label">${label}</div>
                      <div class="data-row__value" data-field-value="${key}">Awaiting scan...</div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </section>

        <div class="tooltip" data-tooltip></div>

        <footer class="bottom-strip">
          <div class="bottom-strip__copy" data-bottom-copy>
            Normandy hum standby. Use orbit, pan, zoom, or WASD to move through the archive.
          </div>
          <div class="bottom-strip__metrics">
            <div class="fps-badge" ${isDev ? '' : 'hidden'} data-fps-badge>FPS: --</div>
            <div class="audio-status">NASA Exoplanet Archive</div>
          </div>
        </footer>
      </div>
    </main>
  `;
}

function createNebulaTexture(seed, colorHex) {
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.48);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

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
    let amplitude = 0.55;
    let frequency = 1;
    let sum = 0;

    for (let octave = 0; octave < 5; octave += 1) {
      total += noise(x * frequency, y * frequency, extraSeed + octave * 8.13) * amplitude;
      sum += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / sum;
  }

  for (let y = 0; y < size; y += 1) {
    const normalizedY = y / size - 0.5;

    for (let x = 0; x < size; x += 1) {
      const normalizedX = x / size - 0.5;
      const radius = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      const wisps = fbm(normalizedX * 4 + seed, normalizedY * 4 - seed, seed * 7.1);
      const ribbon = Math.sin((normalizedX + normalizedY + seed) * 7 + wisps * 10) * 0.5 + 0.5;
      const density = clamp((1 - radius * 1.85) * (wisps * 0.9 + ribbon * 0.35), 0, 1);
      const alpha = density * density * 170;
      const index = (y * size + x) * 4;
      image.data[index] = Math.round(base.r * 255 * clamp(0.4 + density, 0, 1));
      image.data[index + 1] = Math.round(base.g * 255 * clamp(0.4 + density, 0, 1));
      image.data[index + 2] = Math.round(base.b * 255 * clamp(0.5 + density, 0, 1));
      image.data[index + 3] = Math.round(alpha);
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildNebulaPlanes(scene) {
  const textures = [
    createNebulaTexture(1.2, '#243e7f'),
    createNebulaTexture(3.6, '#3f336f'),
    createNebulaTexture(6.1, '#1b4362'),
  ];

  return textures.map((texture, index) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: index === 1 ? 0.24 : 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(420, 280), material);
    plane.position.set(index * 80 - 90, index * 42 - 40, -220 - index * 110);
    plane.rotation.z = index * 0.34;
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
    planetName: `<strong>${planet.name}</strong>`,
    hostStar: system.hostname,
    massEarth: formatValue(planet.planet.massEarth, 2, ' M⊕'),
    radiusEarth: formatValue(planet.planet.radiusEarth, 2, ' R⊕'),
    orbitalPeriodDays: formatValue(planet.planet.orbitalPeriodDays, 2, ' days'),
    equilibriumTempK: formatValue(planet.planet.equilibriumTempK, 0, ' K'),
    semiMajorAxisAu: formatValue(planet.planet.semiMajorAxisAu, 3, ' AU'),
    discoveryMethod: planet.discovery.method ?? 'N/A',
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
    searchMatchSystemIds: new Set(),
    searchIndex: buildSearchIndex(data),
    flyAnimation: null,
    keys: new Set(),
    scanTimers: [],
    filterCollapsed: false,
    pointer: new THREE.Vector2(2, 2),
    pointerScreen: { x: 0, y: 0 },
    needsHoverUpdate: true,
    fpsHistory: [],
    lastFrameTime: performance.now(),
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

function runSearch(state, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    state.searchResults = [];
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
  state.searchMatchSystemIds = new Set(scored.map((entry) => entry.systemId));
}

function updateSearchResults(state, refs, onResultClick) {
  if (!state.searchResults.length) {
    refs.searchResults.classList.remove('is-visible');
    refs.searchResults.innerHTML = '';
    return;
  }

  refs.searchResults.classList.add('is-visible');
  refs.searchResults.innerHTML = state.searchResults
    .map(
      (result) => `
        <button class="search-result" type="button" data-result-id="${result.id}" data-system-id="${result.systemId}" ${
          result.planetId ? `data-planet-id="${result.planetId}"` : ''
        }>
          <span class="result-title">${result.label}</span>
          <span class="result-meta">${result.kind === 'planet' ? 'Planet' : 'Host Star'} • ${result.meta}</span>
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

  refs.filterCount.textContent = `${visibleCount.toLocaleString()} systems highlighted`;
  refs.statVisible.textContent = visibleCount.toLocaleString();
  const activeFilters = Object.values(state.activeFilters).filter(Boolean);
  refs.filterStatus.textContent = activeFilters.length ? activeFilters.join(' • ') : 'All systems';
}

function updateTooltip(state, refs) {
  const system = state.hoveredSystemId ? state.systemsById.get(state.hoveredSystemId) : null;
  if (!system) {
    refs.tooltip.classList.remove('is-visible');
    return;
  }

  refs.tooltip.innerHTML = `
    <div class="tooltip-title">${system.hostname}</div>
    <div class="tooltip-meta">
      ${formatValue(system.distanceLy, 1, ' ly')}<br />
      Spectral: ${system.spectralType || system.spectralClass || 'Unknown'}<br />
      Planets: ${system.planetCount}
    </div>
  `;

  refs.tooltip.classList.add('is-visible');
  const tooltipWidth = 220;
  const tooltipHeight = 110;
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
  refs.searchResults.classList.remove('is-visible');
  refs.focusStatus.textContent = selectedPlanet.name;
  refs.bottomCopy.textContent = `${selectedPlanet.name} dossier synced. ${system.hostname} at ${formatValue(system.distanceLy, 1, ' ly')}.`;

  refs.scanPanel.classList.add('is-visible');
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
  refs.focusStatus.textContent = 'Free navigation';
  refs.bottomCopy.textContent = 'Normandy hum standby. Use orbit, pan, zoom, or WASD to move through the archive.';
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
  if (!state.keys.size || state.flyAnimation) {
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

async function init() {
  createLayout();

  const refs = {
    canvas: document.querySelector('.scene-canvas'),
    searchInput: document.querySelector('.search-input'),
    searchResults: document.querySelector('[data-search-results]'),
    filterPanel: document.querySelector('[data-filter-panel]'),
    filterToggle: document.querySelector('[data-filter-toggle]'),
    filterCount: document.querySelector('[data-filter-count]'),
    scanPanel: document.querySelector('[data-scan-panel]'),
    scanTitle: document.querySelector('[data-scan-title]'),
    scanSubtitle: document.querySelector('[data-scan-subtitle]'),
    planetPills: document.querySelector('[data-planet-pills]'),
    planetStage: document.querySelector('[data-planet-stage]'),
    tooltip: document.querySelector('[data-tooltip]'),
    closePanel: document.querySelector('[data-close-panel]'),
    bottomCopy: document.querySelector('[data-bottom-copy]'),
    audioStatus: document.querySelector('[data-audio-status]'),
    focusStatus: document.querySelector('[data-focus-status]'),
    filterStatus: document.querySelector('[data-filter-status]'),
    statVisible: document.querySelector('[data-stat-visible]'),
    statPlanets: document.querySelector('[data-stat-planets]'),
    statCoverage: document.querySelector('[data-stat-coverage]'),
    fpsBadge: document.querySelector('[data-fps-badge]'),
    fieldValues: Object.fromEntries(
      [...document.querySelectorAll('[data-field-value]')].map((element) => [element.dataset.fieldValue, element]),
    ),
    fieldRows: Object.fromEntries(
      [...document.querySelectorAll('[data-field-row]')].map((element) => [element.dataset.fieldRow, element]),
    ),
  };

  const response = await fetch(`${import.meta.env.BASE_URL}data/exoplanets.json`);
  const data = await response.json();
  const state = createState(data);
  const audioEngine = new AudioEngine();
  refs.planetPreview = new PlanetPreview(refs.planetStage);

  refs.statPlanets.textContent = data.meta.planetCount.toLocaleString();
  refs.statCoverage.textContent = `${Math.round((data.meta.renderablePlanetCount / data.meta.planetCount) * 100)}%`;

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
  scene.fog = new THREE.FogExp2(0x01030a, 0.0018);

  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 120, 450);

  const controls = new OrbitControls(camera, refs.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12;
  controls.maxDistance = 1200;
  controls.enablePan = true;
  controls.target.set(0, 0, 0);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  const starField = createStarField(state.renderableSystems);
  scene.add(starField.points);
  const nebulaPlanes = buildNebulaPlanes(scene);

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
      opacity: 0.24,
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

  refs.filterToggle.addEventListener('click', () => {
    state.filterCollapsed = !state.filterCollapsed;
    refs.filterPanel.classList.toggle('is-collapsed', state.filterCollapsed);
    refs.filterToggle.textContent = state.filterCollapsed ? 'Expand' : 'Collapse';
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
    updateSearchResults(state, refs, (systemId, planetId) => focusSystem(state, refs, controls, systemId, planetId));
    updateStarAttributes(state, starField, refs);
  });

  refs.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && state.searchResults.length) {
      const [firstResult] = state.searchResults;
      focusSystem(state, refs, controls, firstResult.systemId, firstResult.planetId ?? null);
      refs.searchResults.classList.remove('is-visible');
    }
  });

  refs.closePanel.addEventListener('click', () => {
    closePanel(state, refs);
    updateStarAttributes(state, starField, refs);
  });

  refs.canvas.addEventListener('pointermove', (event) => {
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
    if (!audioEngine.started) {
      const started = await audioEngine.start();
      refs.audioStatus.textContent = started ? 'Normandy hum online' : 'Audio unavailable';
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

    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      state.keys.add(event.code);
    }
  });

  window.addEventListener('keyup', (event) => {
    state.keys.delete(event.code);
  });

  function updateHover() {
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

  function updateFps() {
    if (!import.meta.env.DEV || !refs.fpsBadge) {
      return;
    }

    const now = performance.now();
    const delta = now - state.lastFrameTime;
    state.lastFrameTime = now;
    state.fpsHistory.push(1000 / Math.max(delta, 1));
    if (state.fpsHistory.length > 30) {
      state.fpsHistory.shift();
    }
    const average = state.fpsHistory.reduce((sum, fps) => sum + fps, 0) / state.fpsHistory.length;
    refs.fpsBadge.textContent = `FPS: ${Math.round(average)}`;
  }

  updateStarAttributes(state, starField, refs);

  function animate() {
    const delta = clock.getDelta();
    starField.material.uniforms.uTime.value = clock.elapsedTime;

    updateKeyboardMovement(state, controls, delta);
    updateFlight(state, controls);
    controls.update();
    updateHover();
    updateTooltip(state, refs);
    updateFps();

    dust.rotation.y += delta * 0.01;
    dust.rotation.x += delta * 0.004;

    nebulaPlanes.forEach((plane, index) => {
      plane.lookAt(camera.position);
      plane.position.x += Math.sin(clock.elapsedTime * 0.03 + index) * 0.01;
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
