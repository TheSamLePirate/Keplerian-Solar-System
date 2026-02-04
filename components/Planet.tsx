import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import { PlanetData } from "../types";
import { calculateOrbitalPositionWithPeriod } from "../utils/physics";
import { PLANET_SCALE, MOON_ORBIT_SCALE } from "../constants";

interface PlanetProps {
    data: PlanetData;
    time: number;
    isSelected: boolean;
    onSelect: (planet: PlanetData) => void;
    showOrbit: boolean;
    showLabel: boolean;
    scaleFactor: number;
    atmOpacity?: number;
    atmPow?: number;
}

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

    #define SAMPLES 8
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
        float stepSize = rayLength / float(SAMPLES);
        float depth = 0.0;
        vec3 currentPos = origin;
        
        for(int i = 0; i < SAMPLES; i++) {
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
        
        float stepSize = rayLength / float(SAMPLES);
        
        vec3 lightDir = normalize(localSunPos); // Sun direction in local space
        vec3 currentPos = rayOrigin + rayDir * startDist;
        
        vec3 totalScattering = vec3(0.0);
        float viewOpticalDepth = 0.0;
        
        // Boosting the scattering coefficient for visibility
        vec3 scatteringCoeff = color * intensity * 20.0; 
        
        for(int i = 0; i < SAMPLES; i++) {
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
                
                vec3 extinction = scatteringCoeff * 1.0; 
                vec3 transmittance = exp(-(viewOpticalDepth + sunOpticalDepthVal) * extinction);
                
                float cosTheta = dot(rayDir, lightDir);
                float phase = 0.75 * (1.0 + cosTheta * cosTheta);
                
                totalScattering += localDensity * stepSize * transmittance * scatteringCoeff * phase;
            }
            
            currentPos += rayDir * stepSize;
        }

        // Soften edges slightly
        float alpha = 1.0;
        gl_FragColor = vec4(totalScattering, alpha);
    }
  `
};

const Planet: React.FC<PlanetProps> = ({
    data,
    time,
    isSelected,
    onSelect,
    showOrbit,
    showLabel,
    scaleFactor,
    atmOpacity = 2.5,
    atmPow = 4.0
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const atmMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const [hovered, setHover] = useState(false);

    // Constants
    const isMoon = data.type === 'moon';
    const visualOrbitScale = isMoon ? MOON_ORBIT_SCALE : 1;

    // Use atmosphereColor if available
    const hasAtmosphere = !!data.atmosphereColor;
    const isGasGiant = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(data.id);

    // Position Calculation
    const position = useMemo(() => {
        const pos = calculateOrbitalPositionWithPeriod(data.elements, time, data.period);
        return new THREE.Vector3(
            pos[0] * visualOrbitScale,
            pos[1] * visualOrbitScale,
            pos[2] * visualOrbitScale
        );
    }, [data, time, visualOrbitScale]);

    // Orbit Path
    const orbitPath = useMemo(() => {
        const points: THREE.Vector3[] = [];
        const segments = isMoon ? 64 : 180;
        const orbitalPeriodDays = data.period * 365.25;

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * orbitalPeriodDays;
            const pos = calculateOrbitalPositionWithPeriod(data.elements, t, data.period);
            points.push(new THREE.Vector3(
                pos[0] * visualOrbitScale,
                pos[1] * visualOrbitScale,
                pos[2] * visualOrbitScale
            ));
        }
        return points;
    }, [data, visualOrbitScale]);

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
        intensity: { value: atmOpacity }
    }), []); // Empty dependency array ensures referential stability of the uniforms object

    // Pre-allocate vectors to avoid GC in loop
    const tempVec = useMemo(() => new THREE.Vector3(), []);
    const tempSun = useMemo(() => new THREE.Vector3(), []);

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
        if (data.textureUrl) {
            const loader = new THREE.TextureLoader();
            loader.load(data.textureUrl, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                setTextures(prev => ({ ...prev, map: tex }));
            });
        }
        if (data.normalMapUrl) {
            const loader = new THREE.TextureLoader();
            loader.load(data.normalMapUrl, (tex) => {
                setTextures(prev => ({ ...prev, normal: tex }));
            });
        }
        if (data.specularMapUrl) {
            const loader = new THREE.TextureLoader();
            loader.load(data.specularMapUrl, (tex) => {
                setTextures(prev => ({ ...prev, specular: tex }));
            });
        }
        if (data.ringMapUrl) {
            const loader = new THREE.TextureLoader();
            loader.load(data.ringMapUrl, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                setTextures(prev => ({ ...prev, ring: tex }));
            });
        }
    }, [data.textureUrl, data.normalMapUrl, data.specularMapUrl, data.ringMapUrl]);

    useFrame((state) => {
        if (groupRef.current) {
            // 1. Update Planet Position
            groupRef.current.position.copy(position);

            // 2. Rotate Planet (Spin)
            // Spin around LOCAL Y axis (which is tilted by parent group)
            if (meshRef.current) {
                // Calculate rotation angle based on simulated time
                // rotationPeriod is in hours. time is in days.
                // Angle = (time_days * 24 / period_hours) * 2PI (radians)
                if (data.rotationPeriod && data.rotationPeriod !== 0) {
                    // Calculate rotation angle
                    // Use calibrated rotationOffset (GAST for Earth, Tidal Lock for Moon)
                    const initialOffset = data.rotationOffset || 0;
                    const rotationAngle = (time * 24 / data.rotationPeriod) * Math.PI * 2 + initialOffset;
                    meshRef.current.rotation.y = rotationAngle;
                } else {
                    // Fallback default rotation
                    meshRef.current.rotation.y += 0.01 / (data.period > 0.1 ? data.period : 1);
                }
            }

            // 3. Update Matrix World immediately
            // This is critical for the subsequent worldToLocal calculations to be accurate for *this* frame
            groupRef.current.updateMatrixWorld();

            // 4. Update Atmosphere Uniforms
            if (atmMaterialRef.current) {
                const u = atmMaterialRef.current.uniforms;

                // Transform Camera Position to Local Space of the Group (which is Atmosphere's space)
                // Note: We use groupRef because atmMesh has identity transform relative to group.
                tempVec.copy(state.camera.position);
                groupRef.current.worldToLocal(tempVec);
                u.localCameraPos.value.copy(tempVec);

                // Transform Sun Position (0,0,0 World) to Local Space
                tempSun.set(0, 0, 0);
                groupRef.current.worldToLocal(tempSun);
                u.localSunPos.value.copy(tempSun);

                // Update dynamic values every frame to catch prop changes
                u.planetRadius.value = size;
                u.atmosphereRadius.value = atmRadius;
                u.densityFalloff.value = atmPow;
                u.intensity.value = atmOpacity;
                u.color.value.set(data.atmosphereColor);
            }
        }
    });

    // Axial Tilt Quaternion (Static)
    // Tilt around X axis seems appropriate for standard Y-up geometry in XZ orbit plane.
    const tiltRotation = useMemo(() => {
        return new THREE.Euler(THREE.MathUtils.degToRad(data.axialTilt || 0), 0, 0);
    }, [data.axialTilt]);

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
                <group rotation={tiltRotation}>
                    {/* Atmosphere Mesh (Outer Shell) */}
                    {hasAtmosphere && !isMoon && (
                        <mesh>
                            {/* Geometry matches atmRadius exactly */}
                            <sphereGeometry args={[atmRadius, 64, 64]} />
                            <shaderMaterial
                                ref={atmMaterialRef}
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
                                    color={0xffffff} // Ensure no tinting
                                    opacity={1.0}
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
                </group>

                {data.moons && data.moons.map((moon) => (
                    <Planet
                        key={moon.id}
                        data={moon}
                        time={time}
                        isSelected={false}
                        onSelect={onSelect}
                        showOrbit={showOrbit}
                        showLabel={showLabel}
                        scaleFactor={scaleFactor}
                        atmOpacity={atmOpacity}
                        atmPow={atmPow}
                    />
                ))}
            </group>
        </>
    );
};

export default Planet;
