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
  atmSamples: 8,

  // Lighting
  ambientLight: 0,
  sunLuminosity: 3.0,
  sunShaderEnabled: true,
  sunColorA: "#ffd700", // Gold
  sunColorB: "#ff4500", // OrangeRed
  sunSpeed: 1.0,
  sunNoiseScale: 1.0,
  sunTurbulence: 0.5,
  sunRayCount: 8,
  sunSpotIntensity: 2.0,
  sunSpotCount: 5.0,
  sunRimPower: 2.0,
  sunRimColor: "#ffaa00",
  sunCoronas: true,
  sunCoronaOpacity: 0.6,
  eclipseShadowIntensity: 0.0,
  sunFilamentScale: 1.0,
  sunFilamentIntensity: 1.0,
  sunSurfaceRelief: 0.1,
  sunProminenceSize: 1.0,
  shadowEnabled: true,
  shadowMapSize: 1024,
  shadowRadius: 2,
  renderScale: 1,
  starsCount: 2000,

  // Lensflare
  lensflareEnabled: false,
  lensflareOpacity: 0.7,

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
  earthTextureLOD: "low",
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
  bloomMipmapBlur: false,
  toneMappingAdaptive: true,
  vignetteEskil: false,
  noisePremultiply: false,
  chromaticRadial: false,
  chromaticModulation: 0.0,

  // Effect Toggles
  enableBloom: true,
  enableNoise: false,
  enableVignette: true,
  enableChromaticAberration: false,
  enableBrightnessContrast: true,
  enableHueSaturation: true,
  enableAO: false,
  aoIntensity: 5.0,
  aoRadius: 0.05,
  aoDistanceFalloff: 1.0,
  aoScreenSpace: false,

  // Camera
  cameraTransitionSpeed: 1.0,
  surfaceCameraAltitude: 0.002, // 2 meters in km

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

  // Volumetric Light
  volumetricEnabled: false,
  volumetricIntensity: 1.0,
  volumetricSamples: 32,
  volumetricDecay: 1.0,
  volumetricScatterColor: "#FFF5E0",
  volumetricShadowSharpness: 0.8,
  volumetricShadowScale: 50,
  volumetricMaxDistance: 15,
};
