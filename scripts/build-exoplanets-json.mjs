import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { equatorialToGalacticCartesian, parseCsvNumber, pcToLightYears } from '../src/shared/astro.js';
import {
  categorizeSurvey,
  getPlanetCategories,
  getSpectralBucket,
  getSpectralClass,
  slugify,
} from '../src/shared/exoplanets.js';

const INPUT_PATH = resolve('data/exoplanets.csv');
const OUTPUT_PATH = resolve('data/exoplanets.json');
const PUBLIC_OUTPUT_PATH = resolve('public/data/exoplanets.json');

function parseCsv(csvText) {
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
  const headers = headerLine.split(',');

  return lines.map((line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current);

    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function buildPlanetRecord(row) {
  const raDeg = parseCsvNumber(row.ra, 6);
  const decDeg = parseCsvNumber(row.dec, 6);
  const distancePc = parseCsvNumber(row.sy_dist, 6);
  const spectralClass = getSpectralClass(row);
  const galactic = distancePc === null ? null : equatorialToGalacticCartesian(raDeg, decDeg, distancePc);
  const categories = getPlanetCategories(row);

  return {
    id: slugify(row.pl_name),
    name: row.pl_name,
    hostname: row.hostname,
    systemId: slugify(row.hostname),
    raDeg,
    decDeg,
    distancePc,
    distanceLy: distancePc === null ? null : pcToLightYears(distancePc),
    galactic,
    stellar: {
      spectralType: row.st_spectype || null,
      spectralClass,
      spectralBucket: getSpectralBucket(spectralClass),
      teff: parseCsvNumber(row.st_teff, 3),
      radius: parseCsvNumber(row.st_rad, 6),
      mass: parseCsvNumber(row.st_mass, 6),
    },
    planet: {
      massEarth: parseCsvNumber(row.pl_bmasse, 6),
      radiusEarth: parseCsvNumber(row.pl_rade, 6),
      orbitalPeriodDays: parseCsvNumber(row.pl_orbper, 6),
      equilibriumTempK: parseCsvNumber(row.pl_eqt, 3),
      semiMajorAxisAu: parseCsvNumber(row.pl_orbsmax, 6),
    },
    discovery: {
      year: parseCsvNumber(row.disc_year, 0),
      method: row.discoverymethod || null,
      survey: categorizeSurvey(row),
    },
    categories,
    renderable: Boolean(galactic),
  };
}

function buildSystemRecord(hostname, planets) {
  const [primaryPlanet] = planets;
  const discoveryMethods = [...new Set(planets.map((planet) => planet.discovery.method).filter(Boolean))];
  const typeFlags = {
    hotJupiters: planets.some((planet) => planet.categories.isHotJupiter),
    rocky: planets.some((planet) => planet.categories.isRocky),
    iceGiants: planets.some((planet) => planet.categories.isIceGiant),
    superEarths: planets.some((planet) => planet.categories.isSuperEarth),
    habZone: planets.some((planet) => planet.categories.isHabZone),
  };

  return {
    id: slugify(hostname),
    hostname,
    raDeg: primaryPlanet.raDeg,
    decDeg: primaryPlanet.decDeg,
    distancePc: primaryPlanet.distancePc,
    distanceLy: primaryPlanet.distanceLy,
    galactic: primaryPlanet.galactic,
    spectralType: primaryPlanet.stellar.spectralType,
    spectralClass: primaryPlanet.stellar.spectralClass,
    spectralBucket: primaryPlanet.stellar.spectralBucket,
    teff: primaryPlanet.stellar.teff,
    radius: primaryPlanet.stellar.radius,
    mass: primaryPlanet.stellar.mass,
    survey: primaryPlanet.discovery.survey,
    discoveryMethods,
    primaryPlanetId: primaryPlanet.id,
    planetIds: planets.map((planet) => planet.id),
    planetCount: planets.length,
    typeFlags,
    renderable: primaryPlanet.renderable,
  };
}

const sourceText = await readFile(INPUT_PATH, 'utf8');
const rows = parseCsv(sourceText);
const planets = rows.map(buildPlanetRecord);
const systemsByHost = new Map();

for (const planet of planets) {
  const list = systemsByHost.get(planet.hostname) ?? [];
  list.push(planet);
  systemsByHost.set(planet.hostname, list);
}

const systems = [...systemsByHost.entries()].map(([hostname, hostPlanets]) =>
  buildSystemRecord(hostname, hostPlanets),
);

const output = {
  meta: {
    source: 'NASA Exoplanet Archive CSV',
    generatedAt: new Date().toISOString(),
    planetCount: planets.length,
    renderablePlanetCount: planets.filter((planet) => planet.renderable).length,
    systemCount: systems.length,
    renderableSystemCount: systems.filter((system) => system.renderable).length,
    coordinateFrame: 'Galactic Cartesian, parsecs from the Sun',
    omittedFromSpatialRender: planets.filter((planet) => !planet.renderable).length,
  },
  systems,
  planets,
};

await mkdir(resolve('data'), { recursive: true });
await mkdir(resolve('public/data'), { recursive: true });
const outputText = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(OUTPUT_PATH, outputText, 'utf8');
await writeFile(PUBLIC_OUTPUT_PATH, outputText, 'utf8');

console.log(
  JSON.stringify(
    {
      output: OUTPUT_PATH,
      planetCount: output.meta.planetCount,
      renderablePlanetCount: output.meta.renderablePlanetCount,
      systemCount: output.meta.systemCount,
      renderableSystemCount: output.meta.renderableSystemCount,
    },
    null,
    2,
  ),
);
