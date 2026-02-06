
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../types';
import { PLANETS, AU_SCALE, MOON_ORBIT_SCALE, PLANET_SCALE } from '../constants';
import { calculateOrbitalPositionWithPeriod } from '../utils/physics';

// Vertex Shader
const vertexShader = `
varying vec3 vWorldPosition;
varying vec3 vRayOrigin;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vRayOrigin = cameraPosition; // Built-in three.js uniform
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Fragment Shader
const fragmentShader = `
precision highp float;

uniform vec3 uBodiesPos[50];
uniform float uBodiesMass[50];
uniform int uBodyCount;
uniform float uMin;
uniform float uMax;
uniform float uOpacity;
uniform int uSteps;
uniform float uIntensityPow;
uniform float uDirectionSat;
uniform bool uShowDirection;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;

varying vec3 vWorldPosition;
varying vec3 vRayOrigin;

// Box intersection
vec2 rayBoxDst(vec3 boundsMin, vec3 boundsMax, vec3 rayOrigin, vec3 invRayDir) {
    vec3 t0 = (boundsMin - rayOrigin) * invRayDir;
    vec3 t1 = (boundsMax - rayOrigin) * invRayDir;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float dstA = max(max(tmin.x, tmin.y), tmin.z);
    float dstB = min(min(tmax.x, tmax.y), tmax.z);
    float dstToBox = max(0.0, dstA);
    float dstInsideBox = max(0.0, dstB - dstToBox);
    return vec2(dstToBox, dstInsideBox);
}

// Gravity calc
vec3 calculateGravity(vec3 pos) {
    vec3 g = vec3(0.0);
    for (int i = 0; i < 50; i++) {
        if (i >= uBodyCount) break;
        vec3 r = uBodiesPos[i] - pos;
        float distSq = dot(r, r);
        float dist = sqrt(distSq);
        if (dist < 0.1) dist = 0.1; // Smooth gravity wells
        g += r * (uBodiesMass[i] / (distSq * dist));
    }
    return g;
}

vec3 heatMap(float t) {
    vec3 c1 = vec3(0.0, 0.0, 0.0); // Void is transparent/black
    vec3 c2 = vec3(0.4, 0.1, 0.6); // Field
    vec3 c3 = vec3(1.0, 0.8, 0.2); // Intensity
    if (t < 0.5) return mix(c1, c2, t * 2.0);
    return mix(c2, c3, (t - 0.5) * 2.0);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec3 rayOrigin = vRayOrigin;
  vec3 rayDir = normalize(vWorldPosition - rayOrigin);
  vec3 invRayDir = 1.0 / rayDir;
  
  vec2 intersect = rayBoxDst(uBoundsMin, uBoundsMax, rayOrigin, invRayDir);
  float ds = intersect.y; // distance inside box
  float distToBox = intersect.x;

    if (ds <= 0.0) discard;

  // Setup Raymarching
  // int steps = 24; // Replaced by uniform
  float stepSize = ds / float(uSteps);

  // Dithering
  float jitter = random(gl_FragCoord.xy) * stepSize;
  vec3 p = rayOrigin + rayDir * (distToBox + jitter);
  
  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;

    for (int i = 0; i < 128; i++) { // Max steps cap
        if (i >= uSteps) break; // Dynamic loop count
        if (accumulatedAlpha >= 0.99) break; // Stop if nearly opaque
      
      vec3 g = calculateGravity(p);
      float mag = length(g);

      // Visualize
      float normMag = (log(mag) - log(uMin)) / (log(uMax) - log(uMin));
        normMag = clamp(normMag, 0.0, 1.0);
        normMag = pow(normMag, uIntensityPow);
      
      vec3 col;
      if (uShowDirection) {
          // Visualize direction (Gradient)
          // Map -1..1 to 0..1
          vec3 dir = normalize(g);
          col = dir * 0.5 + 0.5;
          // Enhancing saturation slightly for better visibility
          col = pow(col, vec3(uDirectionSat)); 
      } else {
          // Visualize Potential Magnitude (Heatmap)
          col = heatMap(normMag);
      }
      
      // Density contribution with non-linear falloff to make low values transparent
      // normMag is 0..1. Raising it to a power makes low values approach 0 faster.
      float density = pow(normMag, 3.0) * uOpacity;

      // Alpha Blending (Front-to-Back)
      // alpha = density * stepContribution
      // accumAlpha += (1 - accumAlpha) * alpha
      float alpha = density * 0.5; // Scale factor for density per step

        accumulatedColor += col * alpha * (1.0 - accumulatedAlpha);
        accumulatedAlpha += alpha * (1.0 - accumulatedAlpha);

        p += rayDir * stepSize;
    }

    gl_FragColor = vec4(accumulatedColor, accumulatedAlpha);
}
`;

interface GravitationalPotentialProps {
    visible: boolean;
    opacity: number;
    minStrength: number;
    maxStrength: number;
    intensityPow: number;
    steps: number;
    directionSat: number;
    showDirection: boolean;
    planeSize: number;
    yOffset: number;
    timeRef: React.MutableRefObject<number>;
    scaleFactor: number;
    focusBodyId: string | null;
}

const GravitationalPotential: React.FC<GravitationalPotentialProps> = ({
    visible,
    opacity,
    minStrength,
    maxStrength,
    intensityPow,
    steps,
    directionSat,
    showDirection,
    planeSize,
    yOffset,
    timeRef,
    scaleFactor,
    focusBodyId
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { camera } = useThree();

    const uniforms = useMemo(() => ({
        uBodiesPos: { value: new Float32Array(50 * 3) },
        uBodiesMass: { value: new Float32Array(50) },
        uBodyCount: { value: 0 },
        uMin: { value: minStrength },
        uMax: { value: maxStrength },
        uOpacity: { value: opacity },
        uIntensityPow: { value: intensityPow },
        uSteps: { value: steps },
        uDirectionSat: { value: 1.0 },
        uShowDirection: { value: showDirection },
        uBoundsMin: { value: new THREE.Vector3() },
        uBoundsMax: { value: new THREE.Vector3() }
    }), []);

    useFrame(() => {
        if (!materialRef.current || !meshRef.current || !visible) return;

        materialRef.current.uniforms.uMin.value = minStrength;
        materialRef.current.uniforms.uMax.value = maxStrength;
        materialRef.current.uniforms.uOpacity.value = opacity;
        materialRef.current.uniforms.uIntensityPow.value = intensityPow;
        materialRef.current.uniforms.uSteps.value = steps;
        materialRef.current.uniforms.uDirectionSat.value = directionSat;
        materialRef.current.uniforms.uShowDirection.value = showDirection;

        // Update positions
        const positions = materialRef.current.uniforms.uBodiesPos.value;
        const masses = materialRef.current.uniforms.uBodiesMass.value;
        let count = 0;
        const t = timeRef.current;

        const planetPositions = new Map<string, THREE.Vector3>();

        // Sun at index 0
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = 0;
        masses[0] = 0.0002959122082855911 * 2500.0; // GM_Sun scaled by AU_SCALE^2
        planetPositions.set('sun', new THREE.Vector3(0, 0, 0));
        count++;

        PLANETS.forEach(p => {
            const [x, y, z] = calculateOrbitalPositionWithPeriod(p.elements, t, p.period);
            planetPositions.set(p.id, new THREE.Vector3(x, y, z));

            if (count < 50) {
                positions[count * 3] = x;
                positions[count * 3 + 1] = y;
                positions[count * 3 + 2] = z;
                masses[count] = p.mass * 2500.0; // Scale mass to compensate for r^2 being in scene units
                count++;
            }
        });

        PLANETS.forEach(p => {
            if (p.moons) {
                p.moons.forEach(m => {
                    if (count >= 50) return;
                    const parentPos = planetPositions.get(p.id);
                    if (parentPos) {
                        const [mx, my, mz] = calculateOrbitalPositionWithPeriod(m.elements, t, m.period);
                        const offset = new THREE.Vector3(mx, my, mz).multiplyScalar(MOON_ORBIT_SCALE);
                        const moonPos = parentPos.clone().add(offset);

                        planetPositions.set(m.id, moonPos); // Store for focus check

                        positions[count * 3] = moonPos.x;
                        positions[count * 3 + 1] = moonPos.y;
                        positions[count * 3 + 2] = moonPos.z;
                        masses[count] = m.mass * 2500.0;
                        count++;
                    }
                });
            }
        });

        materialRef.current.uniforms.uBodyCount.value = count;

        // Find Focus Position
        // Default to Sun (0,0,0) if no focus or focus not found
        let focusPos = new THREE.Vector3(0, 0, 0);
        if (focusBodyId && planetPositions.has(focusBodyId)) {
            focusPos.copy(planetPositions.get(focusBodyId)!);
        }

        // Update Mesh Position
        // Center the mesh on the focus body, applying the Y offset relative to it
        meshRef.current.position.set(focusPos.x, focusPos.y + yOffset, focusPos.z);

        // Update Bounds Uniforms relative to the new mesh position
        // The shader expects World Space bounds.
        // The mesh is at `meshPos`. The box geometry extends `size/2` from the mesh center.
        const halfSize = planeSize / 2;
        const thickness = planeSize * 0.5; // More volume

        const minBounds = new THREE.Vector3(
            meshRef.current.position.x - halfSize,
            meshRef.current.position.y - thickness / 2,
            meshRef.current.position.z - halfSize
        );
        const maxBounds = new THREE.Vector3(
            meshRef.current.position.x + halfSize,
            meshRef.current.position.y + thickness / 2,
            meshRef.current.position.z + halfSize
        );

        materialRef.current.uniforms.uBoundsMin.value.copy(minBounds);
        materialRef.current.uniforms.uBoundsMax.value.copy(maxBounds);
    });

    if (!visible) return null;

    const thickness = planeSize * 0.5; // More volume

    // Initial render position (will be updated by useFrame)
    return (
        <mesh ref={meshRef} position={[0, yOffset, 0]}>
            <boxGeometry args={[planeSize, thickness, planeSize]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
                depthWrite={false}
                side={THREE.BackSide}
            />
        </mesh>
    );
};

export default GravitationalPotential;

