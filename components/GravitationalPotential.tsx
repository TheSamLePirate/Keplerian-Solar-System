import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../types';
import { PLANETS, AU_SCALE, MOON_ORBIT_SCALE, PLANET_SCALE } from '../constants';
import { calculateOrbitalPositionWithPeriod } from '../utils/physics';

// Vertex Shader
const vertexShader = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
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
uniform float uIntensityPow;
uniform float uDirectionSat;
uniform bool uShowDirection;
uniform bool uShowContours;
uniform float uContourFreq;
uniform bool uExcludeSun;
uniform bool uShowEquilibrium;
uniform float uEquilibriumThreshold;
uniform bool uShowEffective;
uniform float uOmega;

varying vec3 vWorldPosition;

// Gravity calc
vec3 calculateGravity(vec3 pos) {
    vec3 g = vec3(0.0);
    for (int i = 0; i < 50; i++) {
        if (i >= uBodyCount) break;
        // Sun is index 0. If exclude sun is on, skip i=0
        if (uExcludeSun && i == 0) continue;

        // Use actual 3D position (including Y offset) to sample potential at that height
        vec3 r = uBodiesPos[i] - pos;
        float distSq = dot(r, r);
        // Match GravityParticles logic
        // a += normalize(r) * (mass / max(distSq, 0.04))
        g += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }

    // Add Centrifugal Force if Rotating Frame (Effective Potential)
    if (uShowEffective) {
        // F_centrifugal = omega^2 * r_from_axis
        // Ecliptic Axis (Up) in World Space: (0, cos(eps), sin(eps))
        float eps = 23.43928 * 3.14159265359 / 180.0;
        vec3 axis = normalize(vec3(0.0, cos(eps), sin(eps)));
        
        // Vector from pos to nearest point on axis
        // r_vec = pos - axis * dot(pos, axis)
        float projection = dot(pos, axis);
        vec3 r_vec = pos - axis * projection;
        
        // Direction is OUTWARDS from axis
        // Force = r_vec * omega^2
        vec3 centrifugal = r_vec * (uOmega * uOmega);
        g += centrifugal; 
    }
    
    return g;
}

vec3 heatMap(float t) {
    vec3 c1 = vec3(0.0, 0.0, 0.0); // Low
    vec3 c2 = vec3(0.4, 0.1, 0.6); // Medium
    vec3 c3 = vec3(1.0, 0.8, 0.2); // High
    if (t < 0.5) return mix(c1, c2, t * 2.0);
    return mix(c2, c3, (t - 0.5) * 2.0);
}

void main() {
    vec3 p = vWorldPosition;
    
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
    
    // Alpha falloff
    // Higher magnitude = more opaque
    float alpha = uOpacity * smoothstep(0.0, 0.2, normMag); 

    if (uShowContours) {
        // Contours based on magnitude log
        // Use a sine wave pattern
        float v = log(mag + 1e-10); // avoid log(0)
        float contour = 0.5 + 0.5 * sin(v * uContourFreq);
        
        // Sharpen lines
        contour = smoothstep(0.9, 0.95, contour);
        
        // Mix white lines
        col = mix(col, vec3(1.0), contour * 0.5);
        alpha += contour * 0.5; // Boost alpha on lines
    }

    if (uShowEquilibrium) {
        if (mag < uEquilibriumThreshold) {
            // Bright Cyan for equilibrium points
            col = vec3(0.0, 1.0, 1.0);
            alpha = 1.0;
        }
    }

    gl_FragColor = vec4(col, alpha);
}
`;

interface GravitationalPotentialProps {
    visible: boolean;
    opacity: number;
    minStrength: number;
    maxStrength: number;
    intensityPow: number;
    directionSat: number;
    showDirection: boolean;
    showContours: boolean;
    contourFreq: number;
    excludeSun: boolean;
    showEquilibrium: boolean;
    equilibriumThreshold: number;
    showEffective: boolean;
    omega: number;
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
    directionSat,
    showDirection,
    showContours,
    contourFreq,
    excludeSun,
    showEquilibrium,
    equilibriumThreshold,
    showEffective,
    omega,
    planeSize,
    yOffset,
    timeRef,
    scaleFactor,
    focusBodyId
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        uBodiesPos: { value: new Float32Array(50 * 3) },
        uBodiesMass: { value: new Float32Array(50) },
        uBodyCount: { value: 0 },
        uMin: { value: minStrength },
        uMax: { value: maxStrength },
        uOpacity: { value: opacity },
        uIntensityPow: { value: intensityPow },
        uDirectionSat: { value: 1.0 },
        uShowDirection: { value: showDirection },
        uShowContours: { value: showContours },
        uContourFreq: { value: contourFreq },
        uExcludeSun: { value: excludeSun },
        uShowEquilibrium: { value: showEquilibrium },
        uEquilibriumThreshold: { value: equilibriumThreshold },
        uShowEffective: { value: showEffective },
        uOmega: { value: omega },
    }), []);

    useFrame(() => {
        if (!materialRef.current || !meshRef.current || !visible) return;

        materialRef.current.uniforms.uMin.value = minStrength;
        materialRef.current.uniforms.uMax.value = maxStrength;
        materialRef.current.uniforms.uOpacity.value = opacity;
        materialRef.current.uniforms.uIntensityPow.value = intensityPow;
        materialRef.current.uniforms.uDirectionSat.value = directionSat;
        materialRef.current.uniforms.uShowDirection.value = showDirection;
        materialRef.current.uniforms.uShowContours.value = showContours;
        materialRef.current.uniforms.uContourFreq.value = contourFreq;
        materialRef.current.uniforms.uExcludeSun.value = excludeSun;
        materialRef.current.uniforms.uShowEquilibrium.value = showEquilibrium;
        materialRef.current.uniforms.uEquilibriumThreshold.value = equilibriumThreshold;
        materialRef.current.uniforms.uShowEffective.value = showEffective;
        materialRef.current.uniforms.uOmega.value = omega;

        // Update positions - REALLOCATE ARRAYS to force update
        const positions: number[] = [];
        const masses: number[] = [];
        let count = 0;
        const t = timeRef.current;

        const planetPositions = new Map<string, THREE.Vector3>();

        const MASS_SCALE = 2500.0 * AU_SCALE; // Match GravityParticles

        // Sun at index 0
        positions.push(0, 0, 0);
        masses.push(0.0002959122082855911 * MASS_SCALE);
        planetPositions.set('sun', new THREE.Vector3(0, 0, 0));
        count++;

        PLANETS.forEach(p => {
            const [x, y, z] = calculateOrbitalPositionWithPeriod(p.elements, t, p.period);
            planetPositions.set(p.id, new THREE.Vector3(x, y, z));

            if (count < 50) {
                positions.push(x, y, z);
                masses.push(p.mass * MASS_SCALE);
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

                        positions.push(moonPos.x, moonPos.y, moonPos.z);
                        masses.push(m.mass * MASS_SCALE);
                        count++;
                    }
                });
            }
        });

        // Pad arrays
        while (positions.length < 150) positions.push(0);
        while (masses.length < 50) masses.push(0);

        materialRef.current.uniforms.uBodiesPos.value = new Float32Array(positions);
        materialRef.current.uniforms.uBodiesMass.value = new Float32Array(masses);
        materialRef.current.uniforms.uBodyCount.value = count;

        // Find Focus Position
        let focusPos = new THREE.Vector3(0, 0, 0);
        if (focusBodyId && planetPositions.has(focusBodyId)) {
            focusPos.copy(planetPositions.get(focusBodyId)!);
        }

        // Move the plane to follow the focus object, but keep Y offset
        // We only move X and Z, Y is handled by the group/offset props
        // Actually, we want the plane to be at a fixed Y relative to the focus object?
        // User asked for "plane that show the gravitational potential".
        // Usually these planes are "underneath" the solar system or at Y=0.
        // Let's stick to the previous behavior: Centered on Focus Body, at yOffset.
        meshRef.current.position.set(focusPos.x, focusPos.y + yOffset, focusPos.z);
    });

    if (!visible) return null;

    // Ecliptic Tilt (Obliquity)
    const EPSILON = 23.43928 * (Math.PI / 180);
    // Align Ecliptic Plane: Standard plane is XY. Rx(-90) makes it XZ (Equatorial).
    // To align with Ecliptic, we rotate it 'up' by Epsilon.
    // Ecliptic Pole is (0, cos(eps), sin(eps)).
    // Rotation: -90 + 23.44 degrees.
    const rotationX = -Math.PI / 2 + EPSILON;

    return (
        <mesh ref={meshRef} rotation={[rotationX, 0, 0]} position={[0, yOffset, 0]}>
            <planeGeometry args={[planeSize * AU_SCALE, planeSize * AU_SCALE, 128, 128]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

export default GravitationalPotential;
