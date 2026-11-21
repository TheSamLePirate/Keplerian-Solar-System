import { PlanetData } from "../../types";
import * as THREE from "three";

export interface PlanetProps {
  data: PlanetData;
  timeRef: React.MutableRefObject<number>;
  isSelected: boolean;
  onSelect: (planet: PlanetData) => void;
  showOrbit: boolean;
  showLabel: boolean;
  originOffsetRef: React.MutableRefObject<THREE.Vector3>;
  scaleFactor: number;
  auScale: number;
  atmOpacity?: number;
  atmPow?: number;
  atmSamples?: number;
  issModel?: "small" | "big";
  focusedBodyId?: string | null;
  showEarthGrid?: boolean;
  // Earth Graphics
  earthTextureLOD?: "low" | "med" | "high" | "ultra";
  showClouds?: boolean;
  cloudSpeed?: number;
  cloudOpacity?: number;
  showNightLights?: boolean;
  bumpScale?: number;
  specularStrength?: number;
  nightLightIntensity?: number;
  dayIntensity?: number;
  earthRotationOffset?: number;
  earthTextureOffset?: number;
  displacementScale?: number;
  cloudRotationOffset?: number;
  eclipseShadowIntensity?: number;
  parentRadius?: number;
  parentId?: string;
  onPlanetClick?: (planet: PlanetData) => void;
}
