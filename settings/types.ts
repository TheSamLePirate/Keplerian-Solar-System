export interface AppSettings {
  // Simulation
  speedLog: number;
  scaleFactor: number;
  showOrbits: boolean;
  showLabels: boolean;

  // Atmosphere
  atmOpacity: number;
  atmPow: number;
  atmSamples: number;

  // Lighting
  ambientLight: number;
  sunLuminosity: number;
  sunShaderEnabled: boolean;
  sunColorA: string;
  sunColorB: string;
  sunSpeed: number;
  sunNoiseScale: number;
  sunTurbulence: number;
  sunRayCount: number;
  sunSpotIntensity: number;
  sunSpotCount: number;
  sunRimPower: number;
  sunRimColor: string;
  sunCoronas: boolean;
  sunCoronaOpacity: number;
  sunFilamentScale: number;
  sunFilamentIntensity: number;
  sunSurfaceRelief: number;
  sunProminenceSize: number;
  shadowEnabled: boolean;
  shadowMapSize: number;
  shadowRadius: number;
  renderScale: number;
  starsCount: number;

  // Lensflare
  lensflareEnabled: boolean;
  lensflareOpacity: number;

  // ISS
  issModel: "small" | "big";

  // Stars
  starSize: number;
  starSizeMagShape: number;
  starBrightness: number;
  starBrightnessMagShape: number;
  starSaturation: number;
  showConstellations: boolean;
  showCelestialGrid: boolean;
  showEarthGrid: boolean;
  gridMode: "equatorial" | "ecliptic";
  cameraMode: "equatorial" | "ecliptic";

  // Earth Graphics
  earthTextureLOD: "low" | "med" | "high" | "ultra";
  showClouds: boolean;
  cloudSpeed: number;
  cloudOpacity: number;
  cloudRotationOffset: number;
  showNightLights: boolean;
  bumpScale: number;
  specularStrength: number;
  nightLightIntensity: number;
  dayIntensity: number;
  earthRotationOffset: number;
  earthTextureOffset: number;
  displacementScale: number;

  // Post-Processing
  bloomThreshold: number;
  bloomIntensity: number;
  bloomRadius: number;
  noiseOpacity: number;
  vignetteDarkness: number;
  vignetteOffset: number;
  chromaticAberrationOffset: number;
  brightness: number;
  contrast: number;
  exposure: number;
  bloomSmoothing: number;
  hue: number;
  saturation: number;

  // Advanced Post-Processing
  bloomMipmapBlur: boolean;
  toneMappingAdaptive: boolean;
  vignetteEskil: boolean;
  noisePremultiply: boolean;
  chromaticRadial: boolean;
  chromaticModulation: number;

  // Effect Toggles
  enableBloom: boolean;
  enableNoise: boolean;
  enableVignette: boolean;
  enableChromaticAberration: boolean;
  enableBrightnessContrast: boolean;
  enableHueSaturation: boolean;
  enableAO: boolean;
  aoIntensity: number;
  aoRadius: number;
  aoDistanceFalloff: number;
  aoScreenSpace: boolean;

  // Camera
  cameraTransitionSpeed: number;

  // Gravity Field
  gravityVisible: boolean;
  gravityOpacity: number;
  gravityMin: number;
  gravityMax: number;
  gravityIntensityPow: number;
  gravityDirectionSat: number;
  gravityShowDirection: boolean;
  gravityPlaneSize: number;
  gravityYOffset: number;
  gravityParticlesVisible: boolean;
  gravityShowContours: boolean;
  gravityContourFreq: number;
  gravityExcludeSun: boolean;
  gravityShowEquilibrium: boolean;
  gravityEquilibriumThreshold: number;
  gravityShowEffective: boolean;

  // Volumetric Light
  volumetricEnabled: boolean;
  volumetricIntensity: number;
  volumetricSamples: number;
  volumetricDecay: number;
  volumetricScatterColor: string;
  volumetricShadowSharpness: number;
  volumetricShadowScale: number;
  volumetricMaxDistance: number;
}

export type SettingsSetter = <K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
) => void;
