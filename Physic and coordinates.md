# Physics and Coordinates Documentation

This document explains the physical systems, coordinate transformations, and data pipelines used in the **Keplerian Solar System** project.

## Overview

The application simulates the Solar System using **Keplerian orbital mechanics**. Instead of an N-body integrator (which solves $F=ma$ iteratively), this system uses analytical solutions of Kepler's laws. This ensures perfect stability over long timescales and allows for jumping to any point in time instantly without integration errors.

### Core Technologies
- **Physics**: Analytical Keplerian Orbit Solver (Newton-Raphson method).
- **Visualization**: React Three Fiber (Three.js).
- **Data Source**: Python (`skyfield` + JPL Ephemeris `de400s`/`jup365`).

---

## Coordinate Systems

The simulation uses a scaled 3D coordinate system to visualize celestial bodies.

### Units and Scaling
Due to the vast distances in space, a direct 1:1 scale is not practical for visualization.
- **Distance**: `1 AU` (Astronomical Unit) $\approx$ **50.0** 3D World Units.
- **Planet Size**: Logarithmic/Visual scaling is applied. Planets are scaled by `0.5` (base unit) relative to their physical radius to be visible.
- **Moon Orbits**: Moon orbit radii are visually exaggerated by **30x** (`MOON_ORBIT_SCALE`) to prevent them from intersecting with the planet surface visual model.

### Orientation (Axis Mapping)
The simulation maps standard orbital physics coordinates to Three.js 3D space:

| Orbital Frame | 3D Scene Frame | Description |
|--------------|----------------|-------------|
| **X** (Perihelion direction) | **X** | Right |
| **Y** (In orbital plane) | **-Z** | Depth (Negative Z is "forward" in OpenGL/WebGPU) |
| **Z** (Angular Momentum) | **Y** | Up (Standard 3D Y-up) |

This transformation rotates the "flat" orbital plane ($X, Y$) onto the floor plane ($X, Z$) of the 3D world.

### Relative Positioning (Scene Graph)
The system uses a hierarchical Scene Graph (parent-child relationships):
1. **Universe Center**: $(0,0,0)$ (The Sun).
2. **Planets**: Positioned relative to the Sun. 
   - $P_{planet} = \text{Orbit}(t)$
3. **Moons**: Positioned relative to their parent Planet.
   - $P_{moon\_world} = P_{planet} + P_{moon\_local}$
   - This allows moon orbits to just calculate offset from their primary body `(0,0,0)`, simplifying calculation.

---

## Physics Engine

The core logic is located in `utils/physics.ts`.

### Kepler Processor
The position of any body at time $t$ is calculated analytically:
1. **Mean Anomaly ($M$)**: $M(t) = M_0 + n \cdot t$
   - $M_0$: Mean Longitude at Epoch.
   - $n$: Mean Motion (degrees/day).
2. **Eccentric Anomaly ($E$)**: Solved via **Kepler's Equation**: $M = E - e \cdot \sin(E)$.
   - Solved using the **Newton-Raphson** numerical method for high precision.
3. **True Anomaly ($\nu$) & Distance ($r$)**: derived from $E$.
4. **Position Vector**: The position is resolved in the orbital plane and then rotated by the orbital elements:
   - $\Omega$ (Longitude of Ascending Node)
   - $\omega$ (Argument of Perihelion)
   - $i$ (Inclination)

This runs in the render loop (`useFrame` in `Scene.tsx`) but is purely analytical, ensuring $O(1)$ complexity per body per frame regardless of simulation speed.

### Time Management
- **Epoch**: Fixed to `2026-02-05T01:00:28Z` (set in `constants.ts`).
- **Simulation Time**: A simple floating-point counter `time` represents "days since epoch".
- **Speed Control**: The `speed` variable is logarithmic, allowing time steps from $1/86400$ days/sec (real-time) to $365$ days/sec (1 year/sec).

---

## Data Pipeline

Accurate initial conditions are generated via Python before build time.

### `nasaSolar/export_ui_data.py`
This script acts as the "Ground Truth" generator.
1. **Source**: Loads JPL Ephemeris files (`de440s.bsp`, `jup365.bsp`) using `skyfield`.
2. **Calculation**: 
   - Queries positions and velocities for all bodies at the exact `SIMULATION_EPOCH`.
   - Converts state vectors $(\vec{r}, \vec{v})$ into Keplerian Orbital Elements $(a, e, i, \Omega, \omega, M)$.
   - Handles **Barycenters** vs **Body Centers** (e.g., Earth-Moon Barycenter vs Earth) to ensure the visualization hierarchy matches the physics.
3. **Export**: Generates `constants.ts` with typed TypeScript objects (`PlanetData`).

---

## Special Systems

### International Space Station (ISS)
The ISS is treated as a specialized satellite:
1. **Live Data**: `export_ui_data.py` fetches the latest **TLE (Two-Line Element)** set from Celestrak during generation.
2. **Orbit**: Processed as a standard Keplerian orbit relative to Earth.
3. **Orientation**: 
   - Unlike planets (which spin on an axis), the ISS is "tide-locked" to its velocity vector in this visualization.
   - **Prograde Alignment**: $+X$ axis aligns with Velocity vector.
   - **Nadir Alignment**: $+Z$ axis aligns with Radial vector (away from Earth).
   - This ensures the solar panels and modules are oriented correctly relative to flight path.

### Atmosphere Rendering
The planets feature a sophisticated volumetric atmosphere shader (`components/Planet.tsx`):
- **Technique**: Ray-marching (Single-Scattering).
- **Physics**: Approximates Rayleigh scattering.
- **Lighting**: Calculates optical depth towards the camera and towards the Sun for each sample point along the view ray.
- **Occlusion**: Handles planet self-shadowing (sunset/terminator line) mathematically within the shader.

---

## Summary of Accuracy

| Component | Accuracy Source | Notes |
|-----------|-----------------|-------|
| **Positions** | JPL DE440s Ephemeris | High precision at Epoch. Drift may occur over centuries due to lack of N-body perturbations in client-side math. |
| **Moons** | Relative Orbit Elements | Simplified to Keplerian ellipses (ignoring complex lunar perturbations/librations). |
| **ISS** | NORAD TLE | Accurate for "now", but degrades rapidly (> weeks) due to atmospheric drag (not modeled). |
| **Visuals** | Logarithmic Scaling | **Not to scale**. Radii are exaggerated for visibility. |
