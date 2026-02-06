
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree, extend, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { PLANETS, MOON_ORBIT_SCALE, AU_SCALE } from '../constants';
import { calculateOrbitalPositionWithPeriod } from '../utils/physics';

// --- Simulation Shaders (Position & Velocity) ---

// (Unused shader removed)

// Separate Velocity Shader (Standard GPGPU pattern)
const velocityShader = `
uniform float uTime;
uniform float uDelta;

uniform vec3 uBodiesPos[50];
uniform float uBodiesMass[50];
uniform int uBodyCount;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posTex = texture2D( texturePosition, uv );
    vec4 velTex = texture2D( textureVelocity, uv );

    vec3 p = posTex.xyz;
    vec3 v = velTex.xyz;
    
    // RK4 Integration
    // k1
    vec3 a1 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p;
        float distSq = dot(r, r);
        a1 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v1 = v;

    // k2
    vec3 p2 = p + v1 * 0.5 * uDelta;
    vec3 a2 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p2;
        float distSq = dot(r, r);
        a2 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v2 = v + a1 * 0.5 * uDelta;

    // k3
    vec3 p3 = p + v2 * 0.5 * uDelta;
    vec3 a3 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p3;
        float distSq = dot(r, r);
        a3 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v3 = v + a2 * 0.5 * uDelta;

    // k4
    vec3 p4 = p + v3 * uDelta;
    vec3 a4 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p4;
        float distSq = dot(r, r);
        a4 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v4 = v + a3 * uDelta;

    // Final RK4 Velocity Update
    v = v + (uDelta / 6.0) * (a1 + 2.0*a2 + 2.0*a3 + a4);

    // Initial Velocity Noise (One-time or persistent? Keeping small persistent drift for randomness)
    // Actually, for pure RK4 accuracy, we should reduce this or apply it as external force.
    // Keeping it super subtle for life-like "jitter" prevents identical orbits
    // v += (vec3(rand(vec2(seed,0.0)), rand(vec2(0.0,seed)), rand(vec2(seed,seed))) - 0.5) * 0.0005;

    // Respawn Logic (Must match Position Shader triggers)
    bool respawn = false;
    if (length(p) > 4000.0) respawn = true;

    // Scaling Factor
    float AU = 50.0;

    if (respawn) {
        float seed = uTime + uv.x * 100.0 + uv.y * 100.0;
        
        int bodyIdx = 0; // Force Sun
        float mass = uBodiesMass[bodyIdx];
        
        // Random Radius & Angle: Real Asteroid Belts + Trojans
        float beltType = rand(vec2(seed + 1.0, seed));
        float r;
        float theta;
        
        if (beltType < 0.5) {
             // NEW: Inner System Swarm (50%) - Earth (1.0) to Jupiter (5.2)
             r = (1.0 + rand(vec2(seed + 4.0, seed)) * 4.2) * AU;
             theta = rand(vec2(seed + 2.0, seed)) * 6.28318;
        } else if (beltType < 0.75) {
             // Trojans (25%)
             vec3 jupPos = uBodiesPos[5]; // Already Scaled
             float jupTheta = atan(jupPos.z, jupPos.x);
             
             // Base radius on Jupiter's actual scaled distance 
             float jupDist = length(jupPos);
             r = jupDist + (rand(vec2(seed + 4.0, seed)) - 0.5) * 1.0 * AU; 
             
             float side = (rand(vec2(seed + 5.0, seed)) < 0.5) ? 1.047 : -1.047;
             float spread = (rand(vec2(seed + 6.0, seed)) - 0.5) * 0.5;
             theta = jupTheta + side + spread;
        } else if (beltType < 0.95) {
             // Main Belt (20%): 2.1 - 3.3 AU
             r = (2.1 + rand(vec2(seed + 4.0, seed)) * 1.2) * AU;
             theta = rand(vec2(seed + 2.0, seed)) * 6.28318;
        } else {
             // Kuiper Belt (5%): 30.0 - 50.0 AU
             r = (30.0 + rand(vec2(seed + 4.0, seed)) * 20.0) * AU;
             theta = rand(vec2(seed + 2.0, seed)) * 6.28318;
        }
        
        vec3 relPos = vec3(r * cos(theta), 0.0, r * sin(theta));
        float phi = (rand(vec2(seed + 3.0, seed)) - 0.5) * 0.5;
        relPos.y = r * sin(phi);

        float v_mag = sqrt(mass / length(relPos));
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), relPos));
        
        v = tangent * v_mag;
        
        // Add minimal noise (keep strictly Keplerian for Inner Swarm to avoid collisions?)
        // User requested "100% Keplerian" for the new batch.
        // We'll apply the reduced noise to all for consistency, or strictly 0 for the first batch?
        // Add minimal noise
    }

    gl_FragColor = vec4(v, 1.0);
}
`;

const positionShader = `
uniform float uTime;
uniform float uDelta;

uniform vec3 uBodiesPos[50];
uniform float uBodiesMass[50];
uniform int uBodyCount;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posTex = texture2D( texturePosition, uv );
    vec4 velTex = texture2D( textureVelocity, uv );

    vec3 p = posTex.xyz;
    vec3 v = velTex.xyz;
    float life = 1.0;

    // RK4 Integration (Must match Velocity Shader exactly for sync)
    // k1
    vec3 a1 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p;
        float distSq = dot(r, r);
        a1 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v1 = v;

    // k2
    vec3 p2 = p + v1 * 0.5 * uDelta;
    vec3 a2 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p2;
        float distSq = dot(r, r);
        a2 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v2 = v + a1 * 0.5 * uDelta;

    // k3
    vec3 p3 = p + v2 * 0.5 * uDelta;
    vec3 a3 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p3;
        float distSq = dot(r, r);
        a3 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v3 = v + a2 * 0.5 * uDelta;

    // k4
    vec3 p4 = p + v3 * uDelta;
    vec3 a4 = vec3(0.0);
    for(int i=0; i<50; i++) {
        vec3 r = uBodiesPos[i] - p4;
        float distSq = dot(r, r);
        a4 += normalize(r) * (uBodiesMass[i] / max(distSq, 0.04));
    }
    vec3 v4 = v + a3 * uDelta;

    // Final RK4 Position Update
    p = p + (uDelta / 6.0) * (v1 + 2.0*v2 + 2.0*v3 + v4);

    bool respawn = false;
    // Bounds check
    if (length(p) > 4000.0) respawn = true;

    // Scaling Factor
    float AU = 50.0;

    if (respawn) {
        float seed = uTime + uv.x * 100.0 + uv.y * 100.0;
        
        // Force Sun
        int bodyIdx = 0; 
        
        vec3 centerPos = uBodiesPos[bodyIdx];
        float mass = uBodiesMass[bodyIdx]; // Unused here but available
        
        // Random Radius & Angle: Real Asteroid Belts + Trojans
        float beltType = rand(vec2(seed + 1.0, seed));
        float r;
        float theta;
        
        if (beltType < 0.5) {
             // NEW: Inner System Swarm (50%) - Earth (1.0) to Jupiter (5.2)
             r = (1.0 + rand(vec2(seed + 4.0, seed)) * 4.2) * AU;
             theta = rand(vec2(seed + 2.0, seed)) * 6.28318;
        } else if (beltType < 0.75) {
             // Trojans (25%)
             vec3 jupPos = uBodiesPos[5]; // Already scaled
             float jupTheta = atan(jupPos.z, jupPos.x);
             
             // Base radius on Jupiter's actual scaled distance
             float jupDist = length(jupPos);
             r = jupDist + (rand(vec2(seed + 4.0, seed)) - 0.5) * 1.0 * AU;
             
             // L4 (+60) or L5 (-60)
             float side = (rand(vec2(seed + 5.0, seed)) < 0.5) ? 1.047 : -1.047;
             float spread = (rand(vec2(seed + 6.0, seed)) - 0.5) * 0.5;
             theta = jupTheta + side + spread;
        } else if (beltType < 0.95) {
             // Main Belt (20%): 2.1 - 3.3 AU
             r = (2.1 + rand(vec2(seed + 4.0, seed)) * 1.2) * AU;
             theta = rand(vec2(seed + 2.0, seed)) * 6.28318;
        } else {
             // Kuiper Belt (5%): 30.0 - 50.0 AU
             r = (30.0 + rand(vec2(seed + 4.0, seed)) * 20.0) * AU;
             theta = rand(vec2(seed + 2.0, seed)) * 6.28318;
        }
        
        vec3 relPos = vec3(r * cos(theta), 0.0, r * sin(theta));
        float phi = (rand(vec2(seed + 3.0, seed)) - 0.5) * 0.5;
        relPos.y = r * sin(phi);
        
        p = centerPos + relPos;
        life = 5.0 + rand(vec2(seed + 5.0, seed)) * 10.0;
    }

    gl_FragColor = vec4(p, life);
}
`;

// --- Render Shaders ---

const renderVertexShader = `
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
varying vec3 vVelocity;
varying float vLife;

void main() {
    vec4 posTex = texture2D(texturePosition, position.xy); // Access texture using UV coords stored in position.xy (buffer geometry)
    vec4 velTex = texture2D(textureVelocity, position.xy);
    
    vec3 pos = posTex.xyz;
    vVelocity = velTex.xyz;
    vLife = posTex.w;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = (2.0 / -mvPosition.z) * 100.0;
    gl_PointSize = clamp(gl_PointSize, 1.0, 5.0);
}
`;

const renderFragmentShader = `
varying vec3 vVelocity;
varying float vLife;

void main() {
    // Circle shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;
    
    // Color based on velocity speed
    float speed = length(vVelocity);
    vec3 color = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.8, 0.5), smoothstep(0.0, 0.5, speed));
    
    // Fade out
    float alpha = smoothstep(0.0, 1.0, vLife);
    
    gl_FragColor = vec4(color, alpha * 0.8);
}
`;


interface GravityParticlesProps {
    visible: boolean;
    timeRef: React.MutableRefObject<number>;
    speed: number;
    paused: boolean;
}

const GravityParticles: React.FC<GravityParticlesProps> = ({ visible, timeRef, speed, paused }) => {
    const { gl, size } = useThree();
    const gpuCompute = useRef<any>(null);
    const velocityVariable = useRef<any>(null);
    const positionVariable = useRef<any>(null);
    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const WIDTH = 450; // Sqrt(202,500) approx -> 200k+ particles

    useEffect(() => {
        // Initialize GPU Compute
        const gpu = new GPUComputationRenderer(WIDTH, WIDTH, gl);

        // Force High Precision Floats to prevent overflow/underflow in scaled physics
        gpu.setDataType(THREE.FloatType);

        const dtPosition = gpu.createTexture();
        const dtVelocity = gpu.createTexture();

        // Fill initial data
        fillTextures(dtPosition, dtVelocity);

        velocityVariable.current = gpu.addVariable("textureVelocity", velocityShader, dtVelocity);
        positionVariable.current = gpu.addVariable("texturePosition", positionShader, dtPosition);

        gpu.setVariableDependencies(velocityVariable.current, [positionVariable.current, velocityVariable.current]);
        gpu.setVariableDependencies(positionVariable.current, [positionVariable.current, velocityVariable.current]);

        // Initialize Custom Uniforms
        const velUniforms = velocityVariable.current.material.uniforms;
        const posUniforms = positionVariable.current.material.uniforms;

        velUniforms['uTime'] = { value: 0.0 };
        velUniforms['uDelta'] = { value: 0.0 };
        velUniforms['uBodiesPos'] = { value: new Float32Array(150) };
        velUniforms['uBodiesMass'] = { value: new Float32Array(50) };
        velUniforms['uBodyCount'] = { value: 50 };

        posUniforms['uTime'] = { value: 0.0 };
        posUniforms['uDelta'] = { value: 0.0 };
        posUniforms['uBodiesPos'] = { value: new Float32Array(150) };
        posUniforms['uBodiesMass'] = { value: new Float32Array(50) };
        posUniforms['uBodyCount'] = { value: 0 };

        const error = gpu.init();
        if (error !== null) {
            console.error(error);
        }

        gpuCompute.current = gpu;

    }, [gl]);

    function fillTextures(texturePosition: THREE.DataTexture, textureVelocity: THREE.DataTexture) {
        const posArray = texturePosition.image.data;
        const velArray = textureVelocity.image.data;

        // Pre-calculate body positions at t=0 (or current time) for initialization
        const time = timeRef.current;
        const bodyPositions: THREE.Vector3[] = [];
        const bodyMasses: number[] = [];

        // Sun
        bodyPositions.push(new THREE.Vector3(0, 0, 0));
        bodyMasses.push(0.0002959122082855911 * 2500.0 * AU_SCALE);

        PLANETS.forEach(p => {
            const [x, y, z] = calculateOrbitalPositionWithPeriod(p.elements, time, p.period);
            bodyPositions.push(new THREE.Vector3(x, y, z));
            bodyMasses.push(p.mass * 2500.0 * AU_SCALE);
        });

        for (let k = 0, kl = posArray.length; k < kl; k += 4) {
            // Force Sun Orbit
            const bodyIdx = 0;
            const centerPos = bodyPositions[bodyIdx];
            const mass = bodyMasses[bodyIdx];

            // Random Radius & Angle: Real Asteroid Belts + Trojans
            let r, theta;
            const rand = Math.random();

            if (rand < 0.5) {
                // NEW: Inner System Swarm (50%) - Earth (1.0) to Jupiter (5.2)
                r = (1.0 + Math.random() * 4.2) * AU_SCALE;
                theta = Math.random() * Math.PI * 2;
            } else if (rand < 0.75) {
                // Trojans (25%)
                const jupPos = bodyPositions[5]; // Already scaled
                const jupTheta = Math.atan2(jupPos.z, jupPos.x);

                // Use Jupiter's actual distance + random offset (0.5 AU visual spread)
                const jupDist = new THREE.Vector3(jupPos.x, jupPos.y, jupPos.z).length();
                r = jupDist + (Math.random() - 0.5) * 1.0 * AU_SCALE;

                const offset = (Math.random() < 0.5 ? 1.047 : -1.047);
                const spread = (Math.random() - 0.5) * 0.5;
                theta = jupTheta + offset + spread;
            } else if (rand < 0.95) {
                // Main Belt (20%): 2.1 - 3.3 AU
                r = (2.1 + Math.random() * 1.2) * AU_SCALE;
                theta = Math.random() * Math.PI * 2;
            } else {
                // Kuiper Belt (5%): 30.0 - 50.0 AU
                r = (30.0 + Math.random() * 20.0) * AU_SCALE;
                theta = Math.random() * Math.PI * 2;
            }

            const phi = (Math.random() - 0.5) * 0.1; // Small inclination

            // Relative Position
            const x = r * Math.cos(theta);
            const y = r * Math.sin(phi);
            const z = r * Math.sin(theta);

            posArray[k + 0] = centerPos.x + x;
            posArray[k + 1] = centerPos.y + y;
            posArray[k + 2] = centerPos.z + z;
            posArray[k + 3] = Math.random() * 10; // Life

            // Keplerian Velocity
            // v = sqrt(GM / r)
            const dist = Math.sqrt(x * x + y * y + z * z);
            const v = Math.sqrt(mass / dist);

            // Tangent Vector (cross product with up vector)
            const relPos = new THREE.Vector3(x, y, z);
            const up = new THREE.Vector3(0, 1, 0);
            const tangent = new THREE.Vector3().crossVectors(up, relPos).normalize();

            // Apply Velocity
            velArray[k + 0] = tangent.x * v;
            velArray[k + 1] = tangent.y * v;
            velArray[k + 2] = tangent.z * v;
            velArray[k + 3] = 1;
        }
    }

    // Geometry for Points
    const geometry = useMemo(() => {
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(WIDTH * WIDTH * 3);
        const uvs = new Float32Array(WIDTH * WIDTH * 2);

        let p = 0;
        for (let j = 0; j < WIDTH; j++) {
            for (let i = 0; i < WIDTH; i++) {
                uvs[p++] = i / (WIDTH - 1);
                uvs[p++] = j / (WIDTH - 1);
            }
        }

        // We use the "position" attribute to store UV references for lookup in vertex shader
        // Standard geom.setAttribute('position', ...) usually expects 3D coords.
        // But for GPGPU render, we just need the UVs to look up the texture.
        // Let's store UVs in 'position' attribute (x, y, 0)
        for (let k = 0; k < positions.length; k += 3) {
            positions[k] = uvs[(k / 3) * 2];
            positions[k + 1] = uvs[(k / 3) * 2 + 1];
            positions[k + 2] = 0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geom;
    }, []);

    // Physics Update Loop
    useFrame((state, delta) => {
        if (!gpuCompute.current || !visible) return;

        // 1. Update Uniforms (Bodies)
        const time = timeRef.current;
        const positions: number[] = [];
        const masses: number[] = [];
        let count = 0;

        // Mass Scaling:
        // Scaling Factor: 50 * 2500 = 125,000 (Correct theoretical value)
        const MASS_SCALE = 2500.0 * AU_SCALE;

        // Sun
        positions.push(0, 0, 0);
        masses.push(0.0002959122082855911 * MASS_SCALE);
        count++;

        PLANETS.forEach(p => {
            const [x, y, z] = calculateOrbitalPositionWithPeriod(p.elements, time, p.period);
            if (count < 50) {
                positions.push(x, y, z);
                masses.push(p.mass * MASS_SCALE);
                count++;
            }
        });

        // Pad to 50
        while (positions.length < 150) positions.push(0);
        while (masses.length < 50) masses.push(0);

        const uBodiesPos = new Float32Array(positions);
        const uBodiesMass = new Float32Array(masses);

        // Set Uniforms for both shaders
        const velUniforms = velocityVariable.current.material.uniforms;
        const posUniforms = positionVariable.current.material.uniforms;

        // Calculate simulation delta
        // Remove 0.1 scaling. Use raw Delta * Speed for correct physical speed.
        let simDelta = delta * speed;
        if (paused) simDelta = 0;

        velUniforms['uTime'].value = time;
        velUniforms['uDelta'].value = simDelta;
        velUniforms['uBodiesPos'].value = uBodiesPos;
        velUniforms['uBodiesMass'].value = uBodiesMass;
        velUniforms['uBodyCount'].value = count;

        posUniforms['uTime'].value = time;
        posUniforms['uDelta'].value = simDelta;
        posUniforms['uBodiesPos'].value = uBodiesPos;
        posUniforms['uBodiesMass'].value = uBodiesMass;
        posUniforms['uBodyCount'].value = count;

        // 2. Compute
        gpuCompute.current.compute();

        // 3. Update Render Material
        if (materialRef.current) {
            materialRef.current.uniforms.texturePosition.value = gpuCompute.current.getCurrentRenderTarget(positionVariable.current).texture;
            materialRef.current.uniforms.textureVelocity.value = gpuCompute.current.getCurrentRenderTarget(velocityVariable.current).texture;
        }
    });

    if (!visible) return null;

    return (
        <points geometry={geometry}>
            <shaderMaterial
                ref={materialRef}
                vertexShader={renderVertexShader}
                fragmentShader={renderFragmentShader}
                uniforms={{
                    texturePosition: { value: null },
                    textureVelocity: { value: null }
                }}
                transparent={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default GravityParticles;
