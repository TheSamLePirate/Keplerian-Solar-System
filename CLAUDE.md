# CLAUDE.md

## Project Overview

Keplerian Solar System is a real-time orbital simulation built with React + TypeScript + Three.js (via React Three Fiber). It renders the Solar System using analytical Keplerian mechanics — no N-body integration. Orbital elements are pre-computed from JPL ephemeris data by a Python pipeline (`nasaSolar/export_ui_data.py`) and baked into `constants.ts` at development time.

## Quick Start

```bash
npm install
npm run dev        # Starts Vite dev server on 0.0.0.0:3000
npm run build      # Production build
npm run preview    # Preview production build
```

Optionally set `GEMINI_API_KEY` in `.env.local` (currently unused — service is stubbed).

## Tech Stack

- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Three.js r182** via `@react-three/fiber` v9.5 and `@react-three/drei` v10.7
- **Post-processing**: `@react-three/postprocessing` v3 / `postprocessing` v6
- **Styling**: Tailwind CSS (CDN, no build step)
- **Data pipeline**: Python 3 with `skyfield`, `numpy` (development-time only)

## Architecture

```
App.tsx                          ← All simulation state lives here
├── Scene.tsx                    ← R3F <Canvas>, useFrame loop, camera follow, post-processing
│   ├── Sun.tsx                  ← Point light + glow sprite at origin
│   ├── Planet.tsx               ← Recursive: renders planet, atmosphere, rings, orbit, moons
│   │   ├── AtmosphereMaterial   ← Inline volumetric Rayleigh scattering shader
│   │   └── ISS.tsx              ← GLB model loader for ISS satellite
│   └── EffectComposer           ← Bloom, ToneMapping, Vignette, Noise, ChromaticAberration, etc.
├── PlanetList.tsx               ← Left sidebar: hierarchical body list with follow buttons
├── SimulationStats.tsx          ← Bottom-left: date, FPS, speed, pause/resume
├── InfoPanel.tsx                ← Right sidebar: selected body details + "Track Orbit"
└── Controls.tsx                 ← Right sidebar: all simulation/rendering settings
```

### Data Flow

1. `App.tsx` owns all state (speed, pause, scale, selection, camera follow, atmosphere/light/post-processing settings).
2. `Scene.tsx` maintains a `timeRef` (mutable ref, not state) and advances it every frame via `useFrame`. Throttled callbacks update `App` state for date display and FPS.
3. `Planet.tsx` reads `timeRef` in `useFrame` to compute positions via `calculateOrbitalPositionWithPeriod()` — no state updates per frame.
4. Moons are rendered recursively as child `<Planet>` components inside their parent's `<group>`.

### State Separation

- `selectedPlanet` — body shown in InfoPanel / highlighted in scene
- `followingBody` — body the camera is tracking
- These are independent: clicking a name in PlanetList selects without following; clicking the 3D object or the follow button does both.

## Key Files

| File | Purpose |
|------|---------|
| `types.ts` | `OrbitalElements`, `PlanetData`, `SimulationState`, `BodyType` interfaces |
| `constants.ts` | `AU_SCALE` (50), `PLANET_SCALE` (0.5), `MOON_ORBIT_SCALE` (30), `SIMULATION_EPOCH`, `PLANETS[]` array |
| `utils/physics.ts` | Kepler equation solver (Newton-Raphson) + orbital position calculator |
| `components/Planet.tsx` | ~650 lines: orbit path, atmosphere shader, texture loading, ring UVs, ISS orientation, recursive moons |
| `components/Scene.tsx` | ~280 lines: Canvas setup, time advancement, camera follow with lerp, post-processing stack |
| `components/Controls.tsx` | ~730 lines: full settings panel (simulation, atmosphere, lighting, shadows, post-processing) |
| `components/Sun.tsx` | Point light (intensity=3, decay=0), shadow config, procedural glow sprite |
| `components/ISS.tsx` | GLB model loader with shadow/material setup, preloads both model variants |
| `nasaSolar/export_ui_data.py` | Python pipeline: JPL ephemeris → Keplerian elements → `constants.ts` |

## Coordinate System

Orbital physics coordinates map to Three.js as:

| Orbital | Three.js | Meaning |
|---------|----------|---------|
| X | X | Toward perihelion |
| Y | -Z | In orbital plane |
| Z | Y | Angular momentum (up) |

The transform is applied in `utils/physics.ts` return: `[x * AU_SCALE, z * AU_SCALE, -y * AU_SCALE]`.

## Physics

- **Solver**: Newton-Raphson for Kepler's equation `M = E - e·sin(E)`, tolerance 1e-6, max 100 iterations.
- **Per-frame cost**: O(1) per body — purely analytical, no integration.
- **Time**: Float counter in days since `SIMULATION_EPOCH`. Speed ranges from 1/86400 days/s (real-time) to 365.25 days/s (1 year/s) on a logarithmic slider.
- **Epoch**: `2026-02-05T01:00:28Z` (set by Python export).

## Data Pipeline (`nasaSolar/`)

`export_ui_data.py` generates `constants.ts`:

1. Loads JPL DE440s (planets) and JUP365 (Galilean moons) ephemeris via Skyfield.
2. Queries positions/velocities at current time, transforms to ecliptic frame.
3. Converts state vectors (r, v) → Keplerian elements (a, e, i, Ω, ω, L).
4. Fetches ISS TLE from Celestrak for real orbital parameters.
5. Computes Earth's GAST for prime meridian alignment (`rotationOffset`).
6. Writes typed TypeScript to `constants.ts`.

**Requires**: `pip install skyfield numpy` + internet (for ephemeris download and ISS TLE).

## Rendering Details

### Atmosphere Shader

Inline GLSL in `Planet.tsx` (`AtmosphereMaterial`). Volumetric ray-marching with:
- Rayleigh scattering approximation
- Exponential density falloff
- Optical depth integration toward camera and sun
- Planet self-shadowing (shadow on terminator)
- Warm sunset tint (orange/red boost at low sun angles)
- Configurable: `atmOpacity`, `atmPow`, `atmSamples` (recompiles shader via `#define SAMPLES`)

### Post-Processing Stack (Scene.tsx)

SMAA → Bloom → ToneMapping (ACES Filmic) → Vignette → Noise → ChromaticAberration → BrightnessContrast → HueSaturation

Each effect is individually toggleable from Controls.

### Shadows

Single `PointLight` from Sun with configurable:
- Map size (256–GPU max, power-of-2 capped)
- Radius (soft shadows)
- Bias: -0.00005

## Assets

- `public/textures/`: Earth (day/normal/specular), Moon (day/normal), Mars (day/normal), Jupiter, Saturn (day + ring), etc.
- `public/models/`: ISS.glb, ISS2.glb (two detail levels), ISS3.glb, astronaut.glb

## Bodies

8 planets (Mercury–Neptune) with:
- Earth: Moon + ISS as children
- Jupiter: Io, Europa, Ganymede, Callisto as children
- Saturn: ring system (ringGeometry with corrected radial UVs)

ISS is a special `satellite` type: uses GLB model instead of sphere, orientation aligned to velocity vector (prograde) and nadir.

## Performance Notes

- `timeRef` (mutable ref) avoids React re-renders every frame
- `onTimeUpdate` throttled to 0.01s intervals
- FPS calculated every 0.5s
- Orbit paths memoized with `useMemo`
- Shader uniforms updated in-place (no object recreation)
- ISS models preloaded at module level
- Atmosphere shader uses pre-allocated temp vectors to avoid GC in render loop
