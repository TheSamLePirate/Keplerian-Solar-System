import { OrbitalElements } from "../types";

const DEG_TO_RAD = Math.PI / 180;

// Solve Kepler's Equation M = E - e*sin(E) for E using Newton-Raphson
function solveKepler(M: number, e: number, tolerance = 1e-6): number {
  let E = M;
  let delta = 1;
  let iter = 0;
  while (Math.abs(delta) > tolerance && iter < 100) {
    delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E = E - delta;
    iter++;
  }
  return E;
}

export function calculateOrbitalPositionWithPeriod(
  elements: OrbitalElements,
  timeInDays: number,
  periodInYears: number,
  auScale: number = 149.6
): [number, number, number] {

  const { semiMajorAxis, eccentricity, inclination, ascendingNode, perihelion, meanLongitude } = elements;

  // Mean motion n (degrees per day)
  // Period (years) * 365.25 = Period (days)
  const periodDays = periodInYears * 365.25;
  const n = 360 / periodDays;

  const M_deg = meanLongitude + n * timeInDays - perihelion - ascendingNode;

  let M = M_deg * DEG_TO_RAD;
  M = M % (2 * Math.PI);

  const E = solveKepler(M, eccentricity);

  const x_orbit = semiMajorAxis * (Math.cos(E) - eccentricity);
  const y_orbit = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E);

  const i_rad = inclination * DEG_TO_RAD;
  const omega_rad = perihelion * DEG_TO_RAD;
  const Omega_rad = ascendingNode * DEG_TO_RAD;

  const cos_Om = Math.cos(Omega_rad);
  const sin_Om = Math.sin(Omega_rad);
  const cos_w = Math.cos(omega_rad);
  const sin_w = Math.sin(omega_rad);
  const cos_i = Math.cos(i_rad);
  const sin_i = Math.sin(i_rad);

  const x = x_orbit * (cos_w * cos_Om - sin_w * sin_Om * cos_i) - y_orbit * (sin_w * cos_Om + cos_w * sin_Om * cos_i);
  const y = x_orbit * (cos_w * sin_Om + sin_w * cos_Om * cos_i) - y_orbit * (sin_w * sin_Om - cos_w * cos_Om * cos_i);
  const z = x_orbit * (sin_w * sin_i) + y_orbit * (cos_w * sin_i);

  // Ecliptic coordinates (x, y, z) where z is Ecliptic Pole
  // We want to return Three.js coordinates where Y is UP.
  // AND we want the scene to be in the Equatorial Frame (for star alignment).
  // Ecliptic -> Equatorial is a rotation around X-axis (Equinox) by -epsilon.
  // epsilon (obliquity) approx 23.44 degrees.

  // Physics output:
  // x = Vernal Equinox (shared)
  // y = in-plane (Ecliptic Y) -> -z in physics terms usually?
  // z = Ecliptic Pole

  // Original Return: [x, z, -y] * AU
  // Here:
  // P_ecl_three = (x, z, -y)  (where Three.Y is Sim.Up/Pole)

  // We want P_eq_three.
  // Rotate P_ecl around X by -23.44 degrees.
  // y' = y cos(e) - z sin(e)
  // z' = y sin(e) + z cos(e)

  const eps = 23.43928 * DEG_TO_RAD; // Obliquity of Ecliptic
  const cosE = Math.cos(eps);
  const sinE = Math.sin(eps);

  // Coordinates in Ecliptic Frame (Three.js axes: Y=Up/Pole)
  const x_ecl = x * auScale;
  const y_ecl = z * auScale; // z from kepler is pole
  const z_ecl = -y * auScale; // -y from kepler is plane

  // Rotate Ecliptic Frame to Equatorial Frame
  // We rotate the "Universe" so that the Equatorial Plane is XZ, and Pole is Y.
  // The Ecliptic Plane is tilted relative to Equatorial.
  // Ecliptic North Pole is tilted by +23.4 deg relative to Celestial North Pole.
  // To transform Ecliptic vector v_ecl to Equatorial v_eq:
  // v_eq = R_x(eps) * v_ecl
  // (We rotate the Ecliptic plane *up* to meet the Equator? No.)
  // Equator is fixed. Ecliptic is tilted.
  // If we have coords in Ecliptic, we need to rotate them to get Equatorial.
  // R_x(-eps) or R_x(eps)?
  // Ecliptic Z (Pole) should map to a tilted vector in Equatorial Frame (0, cos e, sin e).
  // Equatorial Z (Pole) is (0, 1, 0).
  // Wait, let's just use the standard rotation.
  // y_eq = y_ecl * cos(e) - z_ecl * sin(e)  <-- This rotates Y to Y'

  const y_eq = y_ecl * cosE - z_ecl * sinE;
  const z_eq = y_ecl * sinE + z_ecl * cosE;

  return [x_ecl, y_eq, z_eq];
}

export function getDynamicMoonOrbitScale(
  moonElements: OrbitalElements,
  moonPeriod: number,
  moonRadius: number,
  parentSemiMajorAxis: number,
  parentRadius: number,
  auScale: number,
  scaleFactor: number,
  baseAuScale: number = 149.6,
  planetScale: number = 1.0,
  sunVisualRadius: number = 10.0
): number {
  const D_S = parentSemiMajorAxis * auScale;
  const R_P = (parentRadius || 1) * planetScale * scaleFactor;
  const R_M = moonRadius * planetScale * scaleFactor;
  const R_S = sunVisualRadius * planetScale * scaleFactor;

  // D_M desired distance from center of planet
  const targetD_M = R_P + (R_M / R_S) * Math.max(0, D_S - R_P);

  const basePos = calculateOrbitalPositionWithPeriod(moonElements, 0, moonPeriod, baseAuScale);
  const baseDist = Math.sqrt(basePos[0] * basePos[0] + basePos[1] * basePos[1] + basePos[2] * basePos[2]);

  if (baseDist > 0) {
    return targetD_M / baseDist;
  }
  return 1;
}
