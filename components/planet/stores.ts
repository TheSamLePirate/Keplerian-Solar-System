// Module-level LOD store: written by Planet useFrame, read by InfoPanel
export interface PlanetLodInfo {
  samples: number;
  apparentSize: number; // fraction of screen height
}
export const planetLodStore = new Map<string, PlanetLodInfo>();

// Module-level culling store: written by Planet useFrame, read by DebugPanel
export const planetCullingStore = new Map<string, boolean>(); // true = visible, false = culled

// Module-level position store: written by Planet useFrame, read by DebugPanel
export const planetPositionStore = new Map<
  string,
  { x: number; y: number; z: number }
>();
