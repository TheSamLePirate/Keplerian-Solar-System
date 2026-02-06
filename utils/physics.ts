import { OrbitalElements } from "../types";
import { AU_SCALE } from "../constants";

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
    periodInYears: number
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
  
    return [x * AU_SCALE, z * AU_SCALE, -y * AU_SCALE];
  }
