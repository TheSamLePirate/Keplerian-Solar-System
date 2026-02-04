# AGENT.md - Project Architecture

## Summary
Keplerian Solar System is a React + Vite app that renders a real-time orbital simulation with React Three Fiber. A major part of the system is the Python pipeline in `nasaSolar/` (especially `export_ui_data.py`) that generates the core orbital dataset in `constants.ts`; this data drives nearly all rendering and physics. Runtime simulation state is owned by `App.tsx`, while the 3D scene in `components/Scene.tsx` advances simulation time each frame and renders `Planet`/`Sun` objects. UI overlays (controls, list, info panel) read and update App state.

## Entry Points
- `index.html` provides the root container and loads `index.tsx`.
- `index.tsx` mounts `App` into `#root`.

## Runtime Data Flow
1. `App.tsx` owns simulation state: speed, pause, scale, selection, following, UI flags, lighting, and atmosphere settings. It derives `actualSpeed` and passes props to child components.
2. `components/Scene.tsx`:
   - Creates the `<Canvas>` and `OrbitControls`.
   - Maintains local `time` state and advances it in `useFrame` when not paused.
   - Calls `onTimeUpdate` and `onFpsUpdate` back into `App`.
   - Renders all bodies from `PLANETS` and applies camera-follow logic.
3. `components/Planet.tsx`:
   - Computes positions and orbit lines via `calculateOrbitalPositionWithPeriod`.
   - Renders planet meshes, atmospheres, rings, labels, and recursively renders moons.
4. `components/Sun.tsx` provides the central light source and sun visuals.
5. UI overlays:
   - `components/Controls.tsx` manages simulation speed, toggles, lighting, atmosphere, and reset actions.
   - `components/PlanetList.tsx` lists bodies and triggers select/follow actions.
   - `components/InfoPanel.tsx` displays details for the selected body.

## Data and Physics Layer
- `types.ts` defines `PlanetData`, `OrbitalElements`, and simulation state types.
- `constants.ts` contains:
  - Scale constants (`AU_SCALE`, `PLANET_SCALE`, `MOON_ORBIT_SCALE`).
  - `SIMULATION_EPOCH` (base time for simulation date display).
  - `PLANETS` array (orbital elements, visuals, and moon hierarchy).
- `utils/physics.ts` includes the Kepler solver and `calculateOrbitalPositionWithPeriod` used for orbital positions.

## Assets and Tooling
- `public/textures/` stores planet textures referenced by `Planet`.
- `nasaSolar/` is a first-class, critical part of the architecture: its ephemeris data and Python scripts (notably `export_ui_data.py`) generate `constants.ts`, which is the authoritative source for orbital elements, epoch, and the planet/moon hierarchy. These scripts are development-time tools, not required at runtime.

## Build/Config
- `vite.config.ts` configures the dev server and exposes `GEMINI_API_KEY` env values (the Gemini service is currently stubbed in `services/geminiService.ts`).
- `.env.local` holds local environment values for development.
