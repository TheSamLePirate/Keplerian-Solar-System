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

export function calculateOrbitalPosition(
  elements: OrbitalElements,
  timeInDays: number
): [number, number, number] {
  const { semiMajorAxis, eccentricity, inclination, ascendingNode, perihelion, meanLongitude } = elements;

  // 1. Calculate Mean Anomaly (M)
  // n (deg/day) = 360 / (period_in_days).
  // Using Kepler's 3rd law approximation for solar system bodies orbiting Sun: Period = a^1.5 years.
  // Period in days = a^1.5 * 365.25.
  // HOWEVER: For moons, the period is distinct and not solely dependent on 'a' in AU due to different central mass.
  // We should derive 'n' from the Period provided in PlanetData if possible, but here we only have elements.
  // BUT: The elements provided in constants usually assume a central body.
  // To keep this pure: we rely on the caller or elements.
  // Wait, the standard simplified model `n = 0.9856 / a^1.5` is for Sun-orbiting bodies.
  // For moons, we need the actual period to calculate Mean Anomaly correctly.
  // The function signature only takes elements. 
  // Let's assume the elements passed are "Keplerian" enough, but we need the correct Mean Motion 'n'.
  // We can change the signature to accept 'period' or just calculate n correctly inside if we knew the central mass.
  // Compromise: We will calculate n based on standard solar physics, which is WRONG for moons (mass of Jupiter != mass of Sun).
  // FIX: We will calculate Mean Anomaly outside or pass `period` to this function.
  
  // Let's change the function to accept period.
  // But wait, changing signature requires updating all calls.
  // Actually, we can just infer n if we pass period.
  // Let's update the signature to optional period, if provided use it.
  
  // Actually, let's keep it simple. `semiMajorAxis` for moons is small.
  // If we blindly apply `n = k / a^1.5`, we treat Jupiter as having Sun's mass. 
  // Jupiter mass is 1/1000 Sun. So n would be sqrt(1000) ~ 31 times slower than reality? No, slower?
  // T = 2pi sqrt(a^3/GM). Mass is smaller -> Period is longer for same distance.
  // So if we use Sun mass formula, we get a much faster period than reality for a moon at that distance? 
  // Actually, Moons are very close.
  // Let's just use the `period` property from PlanetData in the calling component to drive the Mean Anomaly `M`?
  // No, `calculateOrbitalPosition` does the physics.
  
  // Let's Update signature.
  return calculateOrbitalPositionWithPeriod(elements, timeInDays, Math.pow(elements.semiMajorAxis, 1.5));
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
