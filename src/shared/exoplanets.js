const SPECTRAL_CLASS_COLORS = {
  M: '#ff4400',
  K: '#ff8800',
  G: '#ffdd00',
  F: '#ffffee',
  A: '#aaccff',
  B: '#4488ff',
  O: '#4488ff',
};

const GROUND_BASED_PREFIXES = [
  'HAT-',
  'HAT-P-',
  'HATS-',
  'HATS-',
  'HATS',
  'WASP-',
  'SUPERWASP-',
  'OGLE-',
  'MOA-',
  'KMT-',
  'XO-',
  'QATAR-',
  'TRES-',
  'KELT-',
  'MASCARA-',
  'NGTS-',
  'WTS-',
  'TRAPPIST-',
];

const GROUND_BASED_METHODS = new Set([
  'Radial Velocity',
  'Microlensing',
  'Imaging',
  'Transit Timing Variations',
  'Eclipse Timing Variations',
  'Orbital Brightness Modulation',
  'Pulsar Timing',
  'Pulsation Timing Variations',
  'Astrometry',
]);

export const SURVEY_LABELS = ['Kepler', 'TESS', 'Ground-based', 'Other'];
export const PLANET_TYPE_LABELS = ['Hot Jupiters', 'Rocky', 'Ice Giants', 'Super-Earths', 'Hab Zone'];
export const SPECTRAL_CLASS_LABELS = ['M', 'K', 'G', 'F', 'A', 'B/O'];
export const STAR_COLOR_FALLBACK = '#ffffee';

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getSpectralClass(stellar = {}) {
  const spectralType = `${stellar.st_spectype || stellar.spectralType || ''}`.trim().toUpperCase();
  const leading = spectralType[0];

  if (leading && SPECTRAL_CLASS_COLORS[leading]) {
    return leading;
  }

  const teff = Number.parseFloat(stellar.st_teff ?? stellar.teff);
  if (!Number.isFinite(teff)) {
    return 'Unknown';
  }

  if (teff >= 30000) return 'O';
  if (teff >= 10000) return 'B';
  if (teff >= 7500) return 'A';
  if (teff >= 6000) return 'F';
  if (teff >= 5200) return 'G';
  if (teff >= 3700) return 'K';
  return 'M';
}

export function getSpectralBucket(spectralClass) {
  return spectralClass === 'B' || spectralClass === 'O' ? 'B/O' : spectralClass;
}

export function getStarColor(stellar = {}) {
  const spectralClass = typeof stellar === 'string' ? stellar : getSpectralClass(stellar);
  return SPECTRAL_CLASS_COLORS[spectralClass] ?? STAR_COLOR_FALLBACK;
}

export function getPlanetCategories(planet = {}) {
  const eqt = Number.parseFloat(planet.pl_eqt ?? planet.equilibriumTempK);
  const radius = Number.parseFloat(planet.pl_rade ?? planet.radiusEarth);
  const isHabZone = Number.isFinite(eqt) && eqt >= 200 && eqt <= 320;
  const isRocky = Number.isFinite(radius) && radius < 2;
  const isHotJupiter = Number.isFinite(eqt) && eqt > 1000 && Number.isFinite(radius) && radius > 6;
  const isIceGiant =
    Number.isFinite(radius) &&
    radius >= 3 &&
    radius <= 6 &&
    (!Number.isFinite(eqt) || eqt <= 250);
  const isSuperEarth = Number.isFinite(radius) && radius >= 1.5 && radius <= 3;

  let visualType = 'default';

  if (isHotJupiter) {
    visualType = 'hot-jupiter';
  } else if (isHabZone && isRocky) {
    visualType = 'rocky-hab-zone';
  } else if (isIceGiant) {
    visualType = 'ice-giant';
  } else if (isSuperEarth) {
    visualType = 'super-earth';
  } else if (isRocky) {
    visualType = 'rocky';
  }

  return {
    isHabZone,
    isRocky,
    isHotJupiter,
    isIceGiant,
    isSuperEarth,
    visualType,
  };
}

export function categorizeSurvey(record = {}) {
  const host = `${record.hostname || ''}`.toUpperCase();
  const planetName = `${record.pl_name || record.name || ''}`.toUpperCase();
  const discoveryMethod = `${record.discoverymethod || record.discovery?.method || ''}`;

  if (/^(KEPLER-|K2-|KOI-)/.test(host) || /^(KEPLER-|K2-|KOI-)/.test(planetName)) {
    return 'Kepler';
  }

  if (/^(TOI-|TIC )/.test(host) || /^(TOI-|TIC )/.test(planetName)) {
    return 'TESS';
  }

  if (
    GROUND_BASED_PREFIXES.some((prefix) => host.startsWith(prefix) || planetName.startsWith(prefix)) ||
    GROUND_BASED_METHODS.has(discoveryMethod)
  ) {
    return 'Ground-based';
  }

  return 'Other';
}

export function getStarSizeFromRadius(radius) {
  const radiusValue = Number.parseFloat(radius);

  if (!Number.isFinite(radiusValue) || radiusValue <= 0) {
    return 5;
  }

  return 4 + Math.log10(radiusValue + 1) * 14;
}
