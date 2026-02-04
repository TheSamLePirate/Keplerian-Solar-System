import { Vector3 } from "three";

export interface OrbitalElements {
  semiMajorAxis: number; // a (AU)
  eccentricity: number; // e
  inclination: number; // i (degrees)
  ascendingNode: number; // Omega (degrees)
  perihelion: number; // omega (degrees)
  meanLongitude: number; // L (degrees) at epoch J2000
}

export type BodyType = 'star' | 'planet' | 'moon' | 'dwarf' | 'satellite';

export interface PlanetData {
  id: string;
  name: string;
  color: string;
  atmosphereColor?: string; // Color of the atmosphere scatter (Rayleigh)
  radius: number; // Relative size (Earth = 1)
  textureUrl?: string;
  normalMapUrl?: string;
  specularMapUrl?: string;
  ringMapUrl?: string;
  ringInnerRadius?: number; // Relative to planet radius (e.g. 1.1)
  ringOuterRadius?: number; // Relative to planet radius (e.g. 2.0)
  description: string;
  elements: OrbitalElements;
  period: number; // Orbital period in Earth years
  rotationPeriod: number; // Sidereal rotation period in hours (Earth = 23.93)
  axialTilt: number; // Obliquity to orbit in degrees (Earth = 23.44)
  rotationOffset?: number; // Initial rotation angle in radians (e.g. GMST for Earth)
  type: BodyType;
  moons?: PlanetData[];
}

export interface SimulationState {
  speed: number;
  date: number; // Julian date or offset from epoch
  selectedPlanet: PlanetData | null;
  showOrbits: boolean;
  showLabels: boolean;
  scaleFactor: number; // Size exaggeration
  paused: boolean;
}
