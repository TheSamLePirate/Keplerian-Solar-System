import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { PlanetData } from "../types";
import { calculateOrbitalPositionWithPeriod } from "../utils/physics";
import { PLANET_SCALE, MOON_ORBIT_SCALE } from "../constants";
import ISSModel from "./ISS";

// Module-level LOD store: written by Planet useFrame, read by InfoPanel
export interface PlanetLodInfo {
    samples: number;
    apparentSize: number; // fraction of screen height
}
export const planetLodStore = new Map<string, PlanetLodInfo>();

interface PlanetProps {
    data: PlanetData;
    timeRef: React.MutableRefObject<number>;
    isSelected: boolean;
    onSelect: (planet: PlanetData) => void;
    showOrbit: boolean;
    showLabel: boolean;
    scaleFactor: number;
    atmOpacity?: number;
    atmPow?: number;
    atmSamples?: number;
    issModel?: 'small' | 'big';
}

// ... (AtmosphereMaterial definition remains unchanged - strict overwrite not needed if outside chunk but this is replace_file_content so I need to target specific chunks)

// I will target the component definition start to fix props, and the end to fix JSX.

// FIRST CHUNK: Interface and Component Start
// SECOND CHUNK: JSX for ISS group
// THIRD CHUNK: Recursive Planet call

// Can I do this in one go with multi_replace? NO, I am using replace_file_content.
// I should use multi_replace for non-contiguous edits.
// But wait, the file is small enough? No, 650 lines.

// Let's use multi_replace.


// Volumetric Rayleigh Scattering Shader (Local Space)
const AtmosphereMaterial = {
    vertexShader: `
    varying vec3 vLocalPosition;

    void main() {
      vLocalPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    varying vec3 vLocalPosition;

    uniform vec3 color;
    uniform vec3 localSunPos;
    uniform vec3 localCameraPos;
    uniform float planetRadius;
    uniform float atmosphereRadius;
    uniform float densityFalloff;
    uniform float intensity;
    uniform int numSamples;

    #define PI 3.14159265359

    // Ray-Sphere intersection with sphere centered at (0,0,0)
    vec2 raySphere(vec3 origin, vec3 dir, float radius) {
        float b = dot(origin, dir);
        float c = dot(origin, origin) - radius * radius;
        float h = b*b - c;
        if (h < 0.0) return vec2(-1.0);
        h = sqrt(h);
        return vec2(-b - h, -b + h);
    }

    // Exponential density function
    float densityAtPoint(vec3 point, float pRadius, float aRadius) {
        float height = length(point) - pRadius;
        float height01 = height / (aRadius - pRadius);
        height01 = clamp(height01, 0.0, 1.0);
        return exp(-height01 * densityFalloff) * (1.0 - height01);
    }

    // Optical depth integration along a ray
    float opticalDepth(vec3 origin, vec3 dir, float rayLength, float pRadius, float aRadius) {
        float stepSize = rayLength / float(numSamples);
        float depth = 0.0;
        vec3 currentPos = origin;

        for(int i = 0; i < MAX_SAMPLES; i++) {
            if(i >= numSamples) break;
            vec3 samplePoint = currentPos + dir * (stepSize * 0.5);
            depth += densityAtPoint(samplePoint, pRadius, aRadius) * stepSize;
            currentPos += dir * stepSize;
        }
        return depth;
    }

    void main() {
        // All calculations in Local Space
        // The atmosphere sphere is centered at (0,0,0) in local space
        
        vec3 rayOrigin = localCameraPos;
        vec3 rayDir = normalize(vLocalPosition - localCameraPos);
        
        // Intersect Atmosphere (Outer Shell)
        vec2 atmHit = raySphere(rayOrigin, rayDir, atmosphereRadius);
        
        if (atmHit.y < 0.0) discard;
        
        // Start ray at camera (0) or atmosphere entry (atmHit.x)
        float startDist = max(0.0, atmHit.x);
        float endDist = atmHit.y;
        
        // Intersect Planet (Inner Sphere) to occlude background
        vec2 planetHit = raySphere(rayOrigin, rayDir, planetRadius);
        if (planetHit.x > 0.0) {
            endDist = min(endDist, planetHit.x);
        }

        // Ray Marching
        float rayLength = endDist - startDist;
        if (rayLength <= 0.0) discard;
        
        float stepSize = rayLength / float(numSamples);

        vec3 lightDir = normalize(localSunPos); // Sun direction in local space
        vec3 currentPos = rayOrigin + rayDir * startDist;

        vec3 totalScattering = vec3(0.0);
        float viewOpticalDepth = 0.0;

        // Base Rayleigh scattering coefficient with a subtle red boost
        vec3 baseCoeff = color * intensity * 18.0;
        baseCoeff.r *= 1.35;
        vec3 warmCoeff = vec3(1.0, 0.45, 0.22) * intensity * 18.0;

        float cosTheta = dot(rayDir, lightDir);
        float phase = 0.75 * (1.0 + cosTheta * cosTheta);

        for(int i = 0; i < MAX_SAMPLES; i++) {
            if(i >= numSamples) break;
            vec3 samplePoint = currentPos + rayDir * (stepSize * 0.5);
            
            float localDensity = densityAtPoint(samplePoint, planetRadius, atmosphereRadius);
            
            vec2 sunHit = raySphere(samplePoint, lightDir, atmosphereRadius);
            float sunDist = sunHit.y;
            
            vec2 sunPlanetHit = raySphere(samplePoint, lightDir, planetRadius);
            bool inShadow = false;
            // Intersection must be valid (>0) and closer than atmosphere exit to block sun
            if (sunPlanetHit.x > 0.0 && sunPlanetHit.x < sunDist) {
                inShadow = true;
            }
            
            if (!inShadow) {
                float sunOpticalDepthVal = opticalDepth(samplePoint, lightDir, sunDist, planetRadius, atmosphereRadius);
                viewOpticalDepth += localDensity * stepSize;

                // Warmer tint when the sun is near the horizon (more red/orange Rayleigh)
                float sunHeight = clamp(dot(lightDir, normalize(samplePoint)), 0.0, 1.0);
                float sunset = pow(1.0 - sunHeight, 2.0);
                vec3 scatteringCoeff = mix(baseCoeff, warmCoeff, sunset * 0.6);

                vec3 extinction = scatteringCoeff; 
                vec3 transmittance = exp(-(viewOpticalDepth + sunOpticalDepthVal) * extinction);
                
                totalScattering += localDensity * stepSize * transmittance * scatteringCoeff * phase;
            }
            
            currentPos += rayDir * stepSize;
        }

        // Soften edges slightly based on path length through the atmosphere
        float thickness = rayLength / (atmosphereRadius - planetRadius);
        float edgeFade = smoothstep(0.0, 1.0, thickness);
        gl_FragColor = vec4(totalScattering * edgeFade, 1.0);
    }
  `
};

const Planet: React.FC<PlanetProps> = ({
    data,
    timeRef,
    isSelected,
    onSelect,
    showOrbit,
    showLabel,
    scaleFactor,
    atmOpacity = 2.5,
    atmPow = 4.0,
    atmSamples = 32,
    issModel = 'small'
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const issGroupRef = useRef<THREE.Group>(null);
    const atmMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const atmMeshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    // Constants
    const isMoon = data.type === 'moon';
    const isSatellite = data.type === 'satellite';
    const visualOrbitScale = (isMoon || isSatellite) ? MOON_ORBIT_SCALE : 1;

    // Use atmosphereColor if available
    const hasAtmosphere = !!data.atmosphereColor;
    const isGasGiant = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(data.id);

    // For satellites, we need a minimum orbit radius based on parent planet's visual size
    // Earth radius=1.0, PLANET_SCALE=0.5, so Earth visual size = 0.5 * scaleFactor
    // We want ISS to orbit at ~1.15x the planet's visual radius (physically ~1.06, but keeping strictly above surface)
    const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor; // Assuming Earth as parent
    const satelliteMinOrbitRadius = parentPlanetVisualRadius * 1.15;

    // Orbit Path
    const orbitPath = useMemo(() => {
        const points: THREE.Vector3[] = [];
        const segments = isSatellite ? 128 : (isMoon ? 64 : 180);
        const orbitalPeriodDays = data.period * 365.25;

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * orbitalPeriodDays;
            const pos = calculateOrbitalPositionWithPeriod(data.elements, t, data.period);

            if (isSatellite) {
                const orbitPos = new THREE.Vector3(
                    pos[0] * visualOrbitScale,
                    pos[1] * visualOrbitScale,
                    pos[2] * visualOrbitScale
                );
                const distance = orbitPos.length();
                if (distance > 0) {
                    orbitPos.normalize().multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
                }
                points.push(orbitPos);
            } else {
                points.push(new THREE.Vector3(
                    pos[0] * visualOrbitScale,
                    pos[1] * visualOrbitScale,
                    pos[2] * visualOrbitScale
                ));
            }
        }
        return points;
    }, [data, visualOrbitScale, isSatellite, satelliteMinOrbitRadius]);

    const size = data.radius * PLANET_SCALE * scaleFactor;
    // Atmosphere shell size - slightly larger to separate from surface
    const atmRadius = size * 1.25;

    // Material setup
    const materialProps = {
        color: data.color,
        roughness: isGasGiant ? 0.4 : 0.8,
        metalness: 0.1,
        emissive: data.color,
        emissiveIntensity: isSelected || hovered ? 0.1 : 0,
    };

    // Initialize Uniforms ONCE. Do not add dependencies that change frequently (like atmOpacity, size).
    // We will update their values in useFrame.
    const uniforms = useMemo(() => ({
        color: { value: new THREE.Color(data.atmosphereColor) },
        localSunPos: { value: new THREE.Vector3() },
        localCameraPos: { value: new THREE.Vector3() },
        planetRadius: { value: size },
        atmosphereRadius: { value: atmRadius },
        densityFalloff: { value: atmPow },
        intensity: { value: atmOpacity },
        numSamples: { value: atmSamples }
    }), []); // Empty dependency array ensures referential stability of the uniforms object

    // Pre-allocate vectors to avoid GC in loop
    const tempVec = useMemo(() => new THREE.Vector3(), []);
    const tempSun = useMemo(() => new THREE.Vector3(), []);
    const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
    const tempXAxis = useMemo(() => new THREE.Vector3(), []);
    const tempYAxis = useMemo(() => new THREE.Vector3(), []);
    const tempZAxis = useMemo(() => new THREE.Vector3(), []);
    const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);

    // Grid Texture Generation
    const gridTexture = useMemo(() => {
        if (data.id !== 'earth') return null;

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Transparent background
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 1024, 512);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        // Longitude lines (every 30 degrees)
        for (let i = 0; i <= 12; i++) {
            const x = (i / 12) * 1024;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();

            // Labels
            if (i < 12) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = '12px Arial';
                ctx.fillText(`${i * 30}°`, x + 5, 256);
            }
        }

        // Latitude lines (every 30 degrees)
        for (let i = 0; i <= 6; i++) {
            const y = (i / 6) * 512;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1024, y);
            ctx.stroke();

            // Labels
            if (i > 0 && i < 6) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = '12px Arial';
                const lat = 90 - (i * 30);
                ctx.fillText(`${lat}°`, 512, y - 5);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }, [data.id]);



    // Texture Loading
    const [loadedTextures, setTextures] = useState<{ map: THREE.Texture | null, normal: THREE.Texture | null, specular: THREE.Texture | null, ring: THREE.Texture | null }>({ map: null, normal: null, specular: null, ring: null });

    React.useEffect(() => {
        let cancelled = false;
        const loadedTextures: THREE.Texture[] = [];
        const loader = new THREE.TextureLoader();

        if (data.textureUrl) {
            loader.load(data.textureUrl, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                tex.colorSpace = THREE.SRGBColorSpace;
                loadedTextures.push(tex);
                setTextures(prev => ({ ...prev, map: tex }));
            }, undefined, (err) => {
                console.warn(`Failed to load texture: ${data.textureUrl}`, err);
            });
        }
        if (data.normalMapUrl) {
            loader.load(data.normalMapUrl, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                loadedTextures.push(tex);
                setTextures(prev => ({ ...prev, normal: tex }));
            }, undefined, (err) => {
                console.warn(`Failed to load normal map: ${data.normalMapUrl}`, err);
            });
        }
        if (data.specularMapUrl) {
            loader.load(data.specularMapUrl, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                loadedTextures.push(tex);
                setTextures(prev => ({ ...prev, specular: tex }));
            }, undefined, (err) => {
                console.warn(`Failed to load specular map: ${data.specularMapUrl}`, err);
            });
        }
        if (data.ringMapUrl) {
            loader.load(data.ringMapUrl, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                tex.colorSpace = THREE.SRGBColorSpace;
                loadedTextures.push(tex);
                setTextures(prev => ({ ...prev, ring: tex }));
            }, undefined, (err) => {
                console.warn(`Failed to load ring texture: ${data.ringMapUrl}`, err);
            });
        }

        return () => {
            cancelled = true;
            loadedTextures.forEach(tex => tex.dispose());
        };
    }, [data.textureUrl, data.normalMapUrl, data.specularMapUrl, data.ringMapUrl]);

    useFrame((state) => {
        const time = timeRef.current;

        // 1. Calculate Orbit Position
        let pos = calculateOrbitalPositionWithPeriod(data.elements, time, data.period);
        let currentPos = new THREE.Vector3(
            pos[0] * visualOrbitScale,
            pos[1] * visualOrbitScale,
            pos[2] * visualOrbitScale
        );

        if (isSatellite) {
            const distance = currentPos.length();
            if (distance > 0) {
                // Scale to ensure orbit is outside planet
                currentPos.normalize().multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
            }
        }

        if (groupRef.current) {
            // Update Planet Position
            groupRef.current.position.copy(currentPos);

            // Update Matrix World immediately for accurate worldToLocal lookups
            groupRef.current.updateMatrixWorld(true);
        }

        // 2. Rotate Planet (Spin)
        if (meshRef.current) {
            if (data.rotationPeriod && data.rotationPeriod !== 0) {
                const initialOffset = data.rotationOffset || 0;
                const rotationAngle = (time * 24 / data.rotationPeriod) * Math.PI * 2 + initialOffset;
                meshRef.current.rotation.y = rotationAngle;
            } else {
                meshRef.current.rotation.y += 0.01 / (data.period > 0.1 ? data.period : 1);
            }
        }

        // 3. Update ISS Orientation
        if (isSatellite && issGroupRef.current) {
            // Get position slightly in the future to calculate velocity direction
            const dt = 0.0001; // Small time step in days
            const futurePosArr = calculateOrbitalPositionWithPeriod(data.elements, time + dt, data.period);
            const futureVec = tempVec.set(
                futurePosArr[0] * visualOrbitScale,
                futurePosArr[1] * visualOrbitScale,
                futurePosArr[2] * visualOrbitScale
            );

            // Normalize future pos if needed (same logic as currentPos)
            const futureDist = futureVec.length();
            if (futureDist > 0) {
                futureVec.normalize().multiplyScalar(Math.max(futureDist, satelliteMinOrbitRadius));
            }

            // Velocity direction (prograde) - this will be the ISS +X axis
            const velocity = futureVec.sub(currentPos).normalize();

            // Nadir direction (toward Earth/parent center) - this will be the ISS -Z axis
            // Since ISS orbits relative to parent, nadir points to origin (0,0,0)
            const nadir = currentPos.clone().normalize().negate();

            // Calculate the orientation matrix
            // X = velocity (prograde)
            // Z = -nadir (away from Earth, so +Z is zenith, -Z is nadir)
            // Y = Z cross X (perpendicular to orbital plane)

            tempXAxis.copy(velocity);
            tempZAxis.copy(nadir).negate(); // +Z points away from Earth (zenith)
            tempYAxis.crossVectors(tempZAxis, tempXAxis).normalize();

            // Recompute X to ensure orthogonality
            tempXAxis.crossVectors(tempYAxis, tempZAxis).normalize();

            // Create rotation matrix from axes
            tempMatrix.makeBasis(tempXAxis, tempYAxis, tempZAxis);
            tempQuaternion.setFromRotationMatrix(tempMatrix);

            issGroupRef.current.quaternion.copy(tempQuaternion);
        }

        // 4. Update Atmosphere Uniforms
        if (atmMaterialRef.current && atmMeshRef.current) {
            const u = atmMaterialRef.current.uniforms;

            tempVec.copy(state.camera.position);
            atmMeshRef.current.worldToLocal(tempVec);
            u.localCameraPos.value.copy(tempVec);

            // Transform Sun Position (0,0,0 World) to Local Space
            tempSun.set(0, 0, 0);
            atmMeshRef.current.worldToLocal(tempSun);
            u.localSunPos.value.copy(tempSun);

            // Update dynamic values every frame to catch prop changes
            u.planetRadius.value = size;
            u.atmosphereRadius.value = atmRadius;
            u.densityFalloff.value = atmPow;
            u.intensity.value = atmOpacity;
            u.color.value.set(data.atmosphereColor);

            // LOD: adjust sample count based on screen-space apparent size
            atmMeshRef.current.getWorldPosition(tempVec);
            const distance = state.camera.position.distanceTo(tempVec);
            const fov = (state.camera as THREE.PerspectiveCamera).fov;
            const screenHeight = 2 * Math.tan((fov * Math.PI) / 360) * distance;
            const apparentSize = (atmRadius * 2) / screenHeight; // fraction of screen height
            const MIN_SAMPLES = 4;
            const maxSamples = atmSamples;
            const t = Math.min(Math.max(apparentSize * 4, 0), 1); // 0 at far, 1 when planet fills ~25% of screen
            const lodSamples = Math.round(MIN_SAMPLES + t * (maxSamples - MIN_SAMPLES));
            u.numSamples.value = lodSamples;

            // Write LOD info to module-level store for UI display
            planetLodStore.set(data.id, { samples: lodSamples, apparentSize });
        }
    });

    // Axial Tilt Quaternion
    // If poleDirection is available (from IAU data), align visual Up (Y) to that pole.
    // Otherwise fall back to simple axialTilt X-rotation.
    const tiltQuaternion = useMemo(() => {
        if (data.poleDirection) {
            const pd = data.poleDirection;
            // Ecliptic coordinates (x, y, z) map to Scene coordinates (x, z, -y)
            // Physics Z (Up) maps to Scene Y (Up).
            // Wait, let's verify mapping in "Physic and coordinates.md":
            // "Z (Angular Momentum) | Y | Up"
            // "Y (Orbital Plane) | -Z | Depth"
            // "X (Perihelion) | X | Right"

            // Our get_pole_vector returns Ecliptic J2000 (x, y, z).
            // We need to map this to Scene vector.
            // v_scene.x = v_ecl.x
            // v_scene.y = v_ecl.z  <-- Z is Up in Physics? No, Z is Angular Momentum (Normal to Ecliptic).
            //                         Wait, "Ecliptic J2000" usually has Z pointing to Ecliptic North Pole.
            //                         So (0,0,1) Ecliptic is Normal.
            //                         In Scene, Y is Up. So (0,1,0) should act as Normal.
            //                         So v_ecl.z -> v_scene.y.
            // v_scene.z = -v_ecl.y <-- Y in Ecliptic is in plane. Maps to Scene -Z.

            const target = new THREE.Vector3(pd.x, pd.z, -pd.y).normalize();
            return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), target);
        }

        // Legacy fallback
        return new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-(data.axialTilt || 0)), 0, 0));
    }, [data.axialTilt, data.poleDirection]);

    return (
        <>
            {showOrbit && (
                <Line
                    points={orbitPath}
                    color={isSelected ? "#ffffff" : (data.color || "white")}
                    opacity={isSelected ? 0.6 : (isMoon ? 0.2 : 0.3)}
                    transparent
                    lineWidth={isSelected ? 2 : (isMoon ? 1 : 1.5)}
                />
            )}

            <group ref={groupRef}>
                <group quaternion={tiltQuaternion}>
                    {/* Atmosphere Mesh (Outer Shell) */}
                    {hasAtmosphere && !isMoon && (
                        <mesh ref={atmMeshRef}>
                            {/* Geometry matches atmRadius exactly */}
                            <sphereGeometry args={[atmRadius, 64, 64]} />
                            <shaderMaterial
                                ref={atmMaterialRef}
                                defines={{ MAX_SAMPLES: 64 }}
                                vertexShader={AtmosphereMaterial.vertexShader}
                                fragmentShader={AtmosphereMaterial.fragmentShader}
                                uniforms={uniforms}
                                blending={THREE.AdditiveBlending}
                                side={THREE.FrontSide}
                                transparent
                                depthWrite={false}
                            />
                        </mesh>
                    )}

                    {/* Render ISS 3D model for satellites, sphere for other bodies */}
                    {isSatellite ? (
                        <group
                            ref={issGroupRef}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(data);
                            }}
                            onPointerOver={() => setHover(true)}
                            onPointerOut={() => setHover(false)}
                        >
                            <ISSModel scale={size * 0.5} modelType={issModel} />
                            {(showLabel || hovered || isSelected) && (
                                <Html position={[0, size * 3, 0]}>
                                    <div
                                        className={`px-2 py-1 rounded text-[10px] font-bold pointer-events-none transition-opacity duration-200 select-none whitespace-nowrap flex items-center gap-1.5
                                ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'bg-black/50 text-white border border-white/20'}
                                `}
                                    >
                                        {data.name}
                                    </div>
                                </Html>
                            )}
                        </group>
                    ) : (
                        <mesh
                            ref={meshRef}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(data);
                            }}
                            onPointerOver={() => setHover(true)}
                            onPointerOut={() => setHover(false)}
                            castShadow
                            receiveShadow
                        >
                            <sphereGeometry args={[size, 64, 64]} />
                            {loadedTextures.map ? (
                                <meshPhongMaterial
                                    color="white"
                                    map={loadedTextures.map || gridTexture || undefined}
                                    normalMap={loadedTextures.normal || undefined}
                                    normalScale={new THREE.Vector2(1, 1)}
                                    specularMap={loadedTextures.specular || undefined}
                                    specular={loadedTextures.specular ? new THREE.Color('grey') : new THREE.Color(0x111111)}
                                    shininess={loadedTextures.specular ? 50 : 5}
                                />
                            ) : (
                                <meshStandardMaterial
                                    {...materialProps}
                                    map={undefined}
                                    normalMap={undefined}
                                />
                            )}

                            {/* Ring System */}
                            {loadedTextures.ring && data.ringInnerRadius && data.ringOuterRadius && (
                                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
                                    <ringGeometry
                                        args={[size * data.ringInnerRadius, size * data.ringOuterRadius, 64]}
                                        onUpdate={(geom) => {
                                            // Fix UVs for radial texture strip (1D radial gradient)
                                            // Map Radius (inner->outer) to U (0->1)
                                            const pos = geom.attributes.position;
                                            const uv = geom.attributes.uv;
                                            const v3 = new THREE.Vector3();
                                            const inner = size * (data.ringInnerRadius || 1.2);
                                            const outer = size * (data.ringOuterRadius || 2.5);

                                            for (let i = 0; i < pos.count; i++) {
                                                v3.fromBufferAttribute(pos, i);
                                                const len = v3.length();
                                                const u = (len - inner) / (outer - inner);
                                                // V is irrelevant for 1D strip, mostly
                                                uv.setXY(i, u, 0.5);
                                            }
                                            uv.needsUpdate = true;
                                        }}
                                    />
                                    <meshStandardMaterial
                                        map={loadedTextures.ring}
                                        side={THREE.DoubleSide}
                                        transparent
                                        alphaTest={0.12}
                                        color={0xffffff} // Ensure no tinting
                                        opacity={1.0}
                                        roughness={0.85}
                                        metalness={0.05}
                                        shadowSide={THREE.DoubleSide}
                                    />
                                </mesh>
                            )}

                            {(showLabel || hovered || isSelected) && (
                                <Html position={[0, size * 1.5, 0]}>
                                    <div
                                        className={`px-2 py-1 rounded text-[10px] font-bold pointer-events-none transition-opacity duration-200 select-none whitespace-nowrap flex items-center gap-1.5
                                ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'bg-black/50 text-white border border-white/20'}
                                `}
                                    >
                                        {data.textureUrl && (
                                            <img src={data.textureUrl} alt="" className="w-3 h-3 rounded-full object-cover border border-white/50" />
                                        )}
                                        {data.name}
                                    </div>
                                </Html>
                            )}
                        </mesh>
                    )}
                </group>

                {data.moons && data.moons.map((moon) => (
                    <Planet
                        key={moon.id}
                        data={moon}
                        timeRef={timeRef}
                        isSelected={false}
                        onSelect={onSelect}
                        showOrbit={showOrbit}
                        showLabel={showLabel}
                        scaleFactor={scaleFactor}
                        atmOpacity={atmOpacity}
                        atmPow={atmPow}
                        atmSamples={atmSamples}
                        issModel={issModel}
                    />
                ))}
            </group>
        </>
    );
};

export default Planet;
