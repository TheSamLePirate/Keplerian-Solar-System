import { AppSettings } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  // Simulation
  speedLog: 0,
  scaleFactor: 0.5,
  showOrbits: true,
  showLabels: false,

  // Atmosphere
  atmOpacity: 0.1,
  atmPow: 8,
  atmSamples: 32,

  // Lighting
  ambientLight: 0,
  sunLuminosity: 3.0,
  shadowEnabled: true,
  shadowMapSize: 4096,
  shadowRadius: 2,
  renderScale: 1,
  starsCount: 200000,

  // ISS
  issModel: "big",

  // Stars
  starSize: 2.0,
  starSizeMagShape: 0.1,
  starBrightness: 0.5,
  starBrightnessMagShape: 0.2,
  starSaturation: 1.0,
  showConstellations: false,
  showCelestialGrid: false,
  showEarthGrid: false,
  gridMode: "equatorial",
  cameraMode: "equatorial",

  // Earth Graphics
  earthTextureLOD: "high",
  showClouds: true,
  cloudSpeed: 0.0,
  cloudOpacity: 1.0,
  cloudRotationOffset: Math.PI * 1.5,
  showNightLights: true,
  bumpScale: 0.02,
  specularStrength: 1.0,
  nightLightIntensity: 2.0,
  dayIntensity: 1.0,
  earthRotationOffset: 0.0,
  earthTextureOffset: Math.PI / 2,
  displacementScale: 0.0,

  // Post-Processing
  bloomThreshold: 1.1,
  bloomIntensity: 1.5,
  bloomRadius: 0.7,
  noiseOpacity: 0.07,
  vignetteDarkness: 0.9,
  vignetteOffset: 0.1,
  chromaticAberrationOffset: 0,
  brightness: 0.0,
  contrast: 0.0,
  exposure: 1.2,
  bloomSmoothing: 0.0,
  hue: 0.0,
  saturation: 0.0,

  // Advanced Post-Processing
  bloomMipmapBlur: true,
  toneMappingAdaptive: true,
  vignetteEskil: false,
  noisePremultiply: false,
  chromaticRadial: false,
  chromaticModulation: 0.0,

  // Effect Toggles
  enableBloom: true,
  enableNoise: true,
  enableVignette: true,
  enableChromaticAberration: false,
  enableBrightnessContrast: true,
  enableHueSaturation: true,
  enableAO: true,
  aoIntensity: 5.0,
  aoRadius: 0.05,
  aoDistanceFalloff: 1.0,
  aoScreenSpace: false,

  // Camera
  cameraTransitionSpeed: 1.0,

  // Gravity Field
  gravityVisible: false,
  gravityOpacity: 0.5,
  gravityMin: 1e-5,
  gravityMax: 0.5,
  gravityIntensityPow: 0.5,
  gravityDirectionSat: 0.8,
  gravityShowDirection: true,
  gravityPlaneSize: 200,
  gravityYOffset: -5,
  gravityParticlesVisible: false,
  gravityShowContours: true,
  gravityContourFreq: 50,
  gravityExcludeSun: false,
  gravityShowEquilibrium: false,
  gravityEquilibriumThreshold: 0.001,
  gravityShowEffective: false,
};
