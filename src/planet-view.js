import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hash(valueX, valueY, seed) {
  const sine = Math.sin(valueX * 127.1 + valueY * 311.7 + seed * 74.7) * 43758.5453123;
  return sine - Math.floor(sine);
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function noise2d(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;

  const topLeft = hash(x0, y0, seed);
  const topRight = hash(x0 + 1, y0, seed);
  const bottomLeft = hash(x0, y0 + 1, seed);
  const bottomRight = hash(x0 + 1, y0 + 1, seed);

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const top = topLeft + (topRight - topLeft) * u;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * u;
  return top + (bottom - top) * v;
}

function fbm(x, y, seed, octaves = 5) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += noise2d(x * frequency, y * frequency, seed + octave * 17.3) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / normalization;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const number = Number.parseInt(normalized, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function mixColor(colorA, colorB, t) {
  return {
    r: Math.round(colorA.r + (colorB.r - colorA.r) * t),
    g: Math.round(colorA.g + (colorB.g - colorA.g) * t),
    b: Math.round(colorA.b + (colorB.b - colorA.b) * t),
  };
}

function stringSeed(value = '') {
  return [...value].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0.1);
}

function getPalette(type) {
  switch (type) {
    case 'hot-jupiter':
      return {
        base: hexToRgb('#4b1204'),
        mid: hexToRgb('#a63f0b'),
        accent: hexToRgb('#ff9f3f'),
        haze: hexToRgb('#ffd6a6'),
      };
    case 'rocky-hab-zone':
      return {
        base: hexToRgb('#0f3f5f'),
        mid: hexToRgb('#2e8b73'),
        accent: hexToRgb('#9ecf6d'),
        haze: hexToRgb('#f2f8ff'),
      };
    case 'ice-giant':
      return {
        base: hexToRgb('#c4d8ff'),
        mid: hexToRgb('#8ab6ff'),
        accent: hexToRgb('#edf6ff'),
        haze: hexToRgb('#ffffff'),
      };
    case 'super-earth':
      return {
        base: hexToRgb('#5c4032'),
        mid: hexToRgb('#8b6544'),
        accent: hexToRgb('#d1ab7a'),
        haze: hexToRgb('#f2ddc0'),
      };
    case 'rocky':
      return {
        base: hexToRgb('#464a57'),
        mid: hexToRgb('#7f8797'),
        accent: hexToRgb('#b7bcc9'),
        haze: hexToRgb('#edf1f5'),
      };
    default:
      return {
        base: hexToRgb('#383d49'),
        mid: hexToRgb('#6b7384'),
        accent: hexToRgb('#afb6c5'),
        haze: hexToRgb('#e9edf4'),
      };
  }
}

function createPlanetTexture(planet) {
  const canvas = document.createElement('canvas');
  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  const palette = getPalette(planet.categories.visualType);
  const seed = stringSeed(`${planet.id}:${planet.categories.visualType}`);

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const latitude = Math.abs(v - 0.5) * 2;

    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const swirls = fbm(u * 6 + latitude * 1.3, v * 6, seed, 4);
      const continents = fbm(u * 5.5, v * 5.5, seed + 11.7, 5);
      const storms = fbm(u * 14, v * 14, seed + 28.1, 4);
      const craterField = fbm(u * 22, v * 11, seed + 47.2, 3);

      let mixAmount = continents;
      let color = palette.base;

      switch (planet.categories.visualType) {
        case 'hot-jupiter': {
          const bands = 0.5 + 0.5 * Math.sin((v + swirls * 0.08) * 28 + continents * 5);
          color = mixColor(palette.base, palette.mid, bands);
          color = mixColor(color, palette.accent, smoothstep(0.64, 0.92, storms));
          break;
        }
        case 'rocky-hab-zone': {
          const oceanMask = smoothstep(0.26, 0.56, continents - latitude * 0.12);
          color = mixColor(palette.base, palette.mid, oceanMask);
          color = mixColor(color, palette.accent, smoothstep(0.58, 0.82, continents));
          color = mixColor(color, palette.haze, smoothstep(0.72, 0.96, storms));
          break;
        }
        case 'ice-giant': {
          const bands = 0.5 + 0.5 * Math.sin((v + swirls * 0.05) * 18 + continents * 6);
          color = mixColor(palette.mid, palette.base, bands * 0.35);
          color = mixColor(color, palette.haze, smoothstep(0.63, 0.94, storms));
          break;
        }
        case 'super-earth': {
          mixAmount = 0.25 + craterField * 0.75;
          color = mixColor(palette.base, palette.mid, mixAmount);
          color = mixColor(color, palette.accent, smoothstep(0.66, 0.92, continents));
          break;
        }
        case 'rocky':
        default: {
          mixAmount = craterField;
          color = mixColor(palette.base, palette.mid, mixAmount);
          color = mixColor(color, palette.accent, smoothstep(0.72, 0.95, storms));
          break;
        }
      }

      const polarHaze = smoothstep(0.72, 0.98, latitude);
      color = mixColor(color, palette.haze, polarHaze * 0.22);

      const index = (y * width + x) * 4;
      image.data[index] = color.r;
      image.data[index + 1] = color.g;
      image.data[index + 2] = color.b;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function getAtmosphereColor(type) {
  switch (type) {
    case 'hot-jupiter':
      return '#ff7a2a';
    case 'rocky-hab-zone':
      return '#6bd1ff';
    case 'ice-giant':
      return '#bfdfff';
    case 'super-earth':
      return '#d59b56';
    default:
      return '#9eb5d9';
  }
}

export class PlanetPreview {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'planet-preview__canvas';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0.18, 4.2);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.scene.add(new THREE.AmbientLight(0xb4c4ff, 1.25));

    const keyLight = new THREE.DirectionalLight(0xffc074, 2.2);
    keyLight.position.set(4, 2, 4);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x5ca8ff, 1.4);
    rimLight.position.set(-3, -1, 2);
    this.scene.add(rimLight);

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 96, 96),
      new THREE.MeshStandardMaterial({
        color: '#7f8797',
        roughness: 0.84,
        metalness: 0.03,
      }),
    );
    this.group.add(this.mesh);

    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.19, 72, 72),
      new THREE.MeshBasicMaterial({
        color: '#7bb8ff',
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    );
    this.group.add(this.atmosphere);

    this.backHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({
        color: '#214878',
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.backHalo.position.set(0, 0, -0.9);
    this.scene.add(this.backHalo);

    this.clock = new THREE.Clock();
    this.currentTexture = null;
    this.currentPlanet = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setPlanet(planet) {
    this.currentPlanet = planet;

    if (this.currentTexture) {
      this.currentTexture.dispose();
    }

    this.currentTexture = createPlanetTexture(planet);
    this.mesh.material.map = this.currentTexture;
    this.mesh.material.needsUpdate = true;
    this.mesh.material.roughness = planet.categories.visualType === 'ice-giant' ? 0.55 : 0.84;
    this.mesh.material.metalness = 0.02;
    this.atmosphere.material.color.set(getAtmosphereColor(planet.categories.visualType));
    this.atmosphere.material.opacity = planet.categories.visualType === 'rocky-hab-zone' ? 0.23 : 0.14;
    this.backHalo.material.color.set(getAtmosphereColor(planet.categories.visualType));
  }

  resize() {
    const width = this.container.clientWidth || 320;
    const height = this.container.clientHeight || 320;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    const delta = this.clock.getDelta();
    this.group.rotation.y += delta * 0.2;
    this.group.rotation.x = Math.sin(this.clock.elapsedTime * 0.15) * 0.08;
    this.backHalo.lookAt(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}
