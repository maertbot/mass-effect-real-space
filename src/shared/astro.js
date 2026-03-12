const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

const EQUATORIAL_TO_GALACTIC = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];

export function degreesToRadians(value) {
  return value * DEGREES_TO_RADIANS;
}

export function radiansToDegrees(value) {
  return value * RADIANS_TO_DEGREES;
}

export function parseFiniteNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundNumber(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function parseCsvNumber(value, digits = 6) {
  const parsed = parseFiniteNumber(value);
  return parsed === null ? null : roundNumber(parsed, digits);
}

export function pcToLightYears(distancePc) {
  return roundNumber(distancePc * 3.26156, 3);
}

export function equatorialToGalacticCartesian(raDeg, decDeg, distancePc) {
  const ra = degreesToRadians(raDeg);
  const dec = degreesToRadians(decDeg);
  const cosDec = Math.cos(dec);

  const equatorial = [
    distancePc * cosDec * Math.cos(ra),
    distancePc * cosDec * Math.sin(ra),
    distancePc * Math.sin(dec),
  ];

  const galactic = EQUATORIAL_TO_GALACTIC.map(
    (row) => row[0] * equatorial[0] + row[1] * equatorial[1] + row[2] * equatorial[2],
  );

  const [x, y, z] = galactic;
  const radius = Math.sqrt(x * x + y * y + z * z) || 1;
  const lDeg = (radiansToDegrees(Math.atan2(y, x)) + 360) % 360;
  const bDeg = radiansToDegrees(Math.asin(z / radius));

  return {
    x: roundNumber(x),
    y: roundNumber(y),
    z: roundNumber(z),
    lDeg: roundNumber(lDeg, 4),
    bDeg: roundNumber(bDeg, 4),
  };
}
