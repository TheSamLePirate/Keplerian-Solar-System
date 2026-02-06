GPU Physics & Visualization Engine
This document details the technical implementation of the physics engine (

GravityParticles.tsx
) and the volumetric visualization (

GravitationalPotential.tsx
) used in the Keplerian Solar System.

Part 1: Shared Physics System
Both the particle simulation and the potential visualization share the same coordinate system and fundamental constants to ensure synchronization.

Coordinate Scaling
To visualize the vast solar system within a renderable 3D scene, we apply specific scaling factors.

Base Unit: 1 Three.js Unit
AU_SCALE: 50.0
1 AU (Astronomical Unit) = 50.0 3D Units
Example: Earth (1 AU) sits at x=50.0. Jupiter (5.2 AU) sits at x=260.0.
Simulation Bounds: 4000.0 Units (~80 AU), covering beyond the Kuiper Belt.
Mass & Gravity
Gravitational mass is scaled to match the visual coordinates and real-time seconds.

Formula: Mass_Visual = Mass_Real * 2500.0 * AU_SCALE
Derivations:
$r_{visual} = r_{real} \times 50$
Gravity $F \propto 1/r^2 \implies 1/2500$ strength reduction due to distance scaling.
Mass must be boosted by $\geq 2500\times$ to compensate.
The additional AU_SCALE factor corrects for the time-step units.
Part 2: GPGPU Particle System (

GravityParticles
)
Simulates 202,500 asteroids using a Double-Buffered Ping-Pong architecture on the GPU.

Architecture
State Textures: 450x450 Floating Point Textures (THREE.FloatType).
texturePosition: (x, y, z, life)
textureVelocity: (vx, vy, vz, mass)
Ping-Pong Loop:
Read state $t$ from Input Texture.
Compute state $t+1$ via Shader.
Write to Output Texture and Swap.
Integrator: Runge-Kutta 4 (RK4)
To ensure maximum orbital stability without artificial damping, the system uses a 4th-order integrator.

Logic: Calculates gravitational force 4 times per frame per particle.
$k_1 = F(x, v)$
$k_2 = F(x + v\frac{dt}{2}, v + k_1\frac{dt}{2})$
$k_3 = F(x + v\frac{dt}{2}, v + k_2\frac{dt}{2})$
$k_4 = F(x + v dt, v + k_3 dt)$
$v_{new} = v + \frac{dt}{6}(k_1 + 2k_2 + 2k_3 + k_4)$
$x_{new} = x + \frac{dt}{6}(v_1 + 2v_2 + 2v_3 + v_4)$
Benefit: $O(dt^4)$ error rate. Virtually eliminates the "spiral drift" problem common in Euler integrators.
Particle Distribution
Inner Swarm (50%): 1.0 - 5.2 AU (Earth to Jupiter).
Trojans (25%): L4/L5 Lagrangian points of Jupiter ($\pm 60^\circ$).
Main Belt (20%): 2.1 - 3.3 AU.
Kuiper Belt (5%): 30.0 - 50.0 AU.
Part 3: Volumetric Visualization (GravityPotential)
Visualizes the gravitational field strength using Volumetric Raymarching.

Vertex Shader
Passes vRayOrigin (Camera position) and vWorldPosition (Mesh surface position) to the fragment shader to define the entry point of the view ray.
Fragment Shader (Raymarcher)
Ray-Box Intersection:
Calculates entry and exit points of the view ray against the simulation bounds box.
Determines distInsideBox to define the raymarching length.
Sampling Loop:
Marches through the volume in uSteps (dynamic, user-configurable).
At each step p:
Calculates Gravity Vector $\vec{g} = \sum_{i=0}^{50} \frac{G M_i}{|r_i|^2} \hat{r_i}$
Calculates Magnitude $|\vec{g}|$ or Direction $\vec{g}_{norm}$.
Visualization Logic:
Magnitude: Maps log-scale field strength to a Heatmap (Black $\to$ Purple $\to$ Orange).
Direction: Maps normalized XYZ vector to RGB color (Saturation boosted by uDirectionSat).
Accumulation:
Accumulates color and alpha front-to-back.
density = pow(normMag, 3.0) * uOpacity: Non-linear density ensures weak fields (far from planets) remain transparent, while gravity wells appear solid.
Optimization
Dithering: Applies random ray offset per pixel to eliminate banding artifacts with low step counts.
Early Exit: Breaks loop if accumulatedAlpha >= 0.99 (Occlusion culling).