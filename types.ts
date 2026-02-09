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
  modelUrl?: string; // Path to 3D model file (.glb) for satellites like ISS
  description: string;
  elements: OrbitalElements;
  period: number; // Orbital period in Earth years
  mass: number; // Gravitational parameter GM (AU^3/day^2)
  rotationPeriod: number; // Sidereal rotation period in hours (Earth = 23.93)
  axialTilt: number; // Obliquity to orbit in degrees (Earth = 23.44)
  poleDirection?: { x: number, y: number, z: number }; // Ecliptic J2000 Vector of North Pole
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
  // Earth Graphics
  earthTextureLOD: 'low' | 'med' | 'high' | 'ultra';
  showClouds: boolean;
  cloudSpeed: number;
  cloudOpacity: number;
  showNightLights: boolean;
  bumpScale: number;
  specularStrength: number;
  nightLightIntensity?: number;
  dayIntensity?: number;
  earthRotationOffset?: number;
  earthTextureOffset?: number;
}
