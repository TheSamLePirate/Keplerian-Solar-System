import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
  issModel?: "small" | "big";
  focusedBodyId?: string | null;
  showEarthGrid?: boolean;
  // Earth Graphics
  earthTextureLOD?: "low" | "med" | "high" | "ultra";
  showClouds?: boolean;
  cloudSpeed?: number;
  cloudOpacity?: number;
  showNightLights?: boolean;
  bumpScale?: number;
  specularStrength?: number;
  nightLightIntensity?: number;
  dayIntensity?: number;
  earthRotationOffset?: number;
  earthTextureOffset?: number;
  displacementScale?: number;
  cloudRotationOffset?: number;
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
    `,
};

const EarthMaterial = {
  vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    #include <shadowmap_pars_vertex>

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vLocalPosition;
    varying vec3 vSunDirection;
    
    uniform sampler2D displacementMap;
    uniform float displacementScale;
    
    void main() {
        vUv = uv;
        vLocalPosition = position;
        vNormal = normal; // Local normal
        
        // Vertex Displacement
        float disp = texture2D(displacementMap, uv).r;
        vec3 displacedPosition = position + normal * (disp * displacementScale);

        vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
        
        #include <logdepthbuf_vertex>

        // Create world position for shadow map calculations
        vec3 transformedNormal = normal; 
        // Note: For perfect shadows with displacement, we would recalculate normal here, 
        // but original normal is fine for bias usually.
        
        #include <shadowmap_vertex>
    }
    `,
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    uniform samplerCube dayMap;
    uniform samplerCube nightMap;
    uniform samplerCube cloudMap;
    uniform sampler2D normalMap;
    uniform sampler2D specularMap;

    uniform vec3 sunDirection; // Local space
    uniform vec3 localCameraPos; // Local space
    uniform float cloudTime;
    uniform float cloudRotationOffset;
    uniform float cloudOpacity;
    uniform bool showClouds;
    uniform bool showNightLights;
    uniform float bumpScale;
    uniform float specularStrength;
    uniform float nightLightIntensity;
    uniform float dayIntensity;
    uniform float earthTextureOffset; 

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    // Easy normal mapping for sphere
    vec3 getNormal() {
        vec3 objectNormal = normalize(vNormal);
        vec3 normalSample = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;
        
        // TBN Matrix
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), objectNormal));
        if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);
        vec3 bitangent = normalize(cross(objectNormal, tangent));
        
        mat3 tbn = mat3(tangent, bitangent, objectNormal);
        
        // Use normalStrength for XY (slope) and keeping Z (up) relative
        vec3 perturbed = tbn * normalize(vec3(normalSample.xy * bumpScale, normalSample.z)); 
        return normalize(perturbed);
    }

    void main() {
        #include <logdepthbuf_fragment>

        vec3 normal = getNormal();
        vec3 lightDir = normalize(sunDirection);
        vec3 viewDir = normalize(localCameraPos - vLocalPosition);

        // Diffuse factor
        float NdotL = dot(normal, lightDir);
        float diffuse = max(0.0, NdotL);

        // Calculate Shadow Mask (0.0 = shadowed, 1.0 = lit)
        float shadowMask = getShadowMask();

        // Apply shadow to diffuse lighting
        diffuse *= shadowMask;

        // Day/Night Mix Factor 
        // We use the SHADOWED diffuse for mixing, so night lights turn on in shadow
        float mixFactor = smoothstep(-0.2, 0.2, diffuse); 

        // Sample Cubemaps
        vec3 sampleDir = normalize(vLocalPosition);
        
        float theta = earthTextureOffset;
        float c = cos(theta);
        float s = sin(theta);
        mat3 rot = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
        
        vec3 rotatedSampleDir = rot * sampleDir;
        
        vec4 dayColor = textureCube(dayMap, rotatedSampleDir);
        vec4 nightColor = textureCube(nightMap, rotatedSampleDir);

        // Specular (Ocean only)
        float specularMask = texture2D(specularMap, vUv).r;
        float specular = 0.0;
        if (NdotL > 0.0) {
            vec3 halfVector = normalize(lightDir + viewDir);
            float NdotH = max(0.0, dot(normal, halfVector));
            specular = pow(NdotH, 60.0) * specularMask * specularStrength * shadowMask;
        }

        // Base Color Mixing
        vec3 finalColor = dayColor.rgb * diffuse * dayIntensity + specular;

        if (showNightLights) {
             // Night lights should appear where it is "dark" (low mixFactor)
             // Use original NdotL for mixFactor if we want lights ONLY on night side 
             // OR use shadowMask if we want lights during eclipses too. 
             // Use NdotL for terminator mixing, but maybe shadowMask for eclipses?
             // Standard: Night lights are permanent on night side. Eclipses are just dark day.
             // So let's use the GEOMETRIC day/night for mixing night lights, not shadow.
             
             float geoMix = smoothstep(-0.2, 0.2, NdotL);
             finalColor += nightColor.rgb * (1.0 - geoMix) * nightLightIntensity;
        } else {
             float geoMix = smoothstep(-0.2, 0.2, NdotL);
             finalColor += dayColor.rgb * (1.0 - geoMix) * 0.05;
        }

        // Clouds
        if (showClouds) {
            float totalCloudAngle = cloudTime + cloudRotationOffset;
            float c = cos(totalCloudAngle);
            float s = sin(totalCloudAngle);
            mat3 rotation = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
            
            vec3 cloudDir = rotation * rotatedSampleDir;
            vec4 cloudSample = textureCube(cloudMap, cloudDir);
            
            vec3 shadowDir = rotation * normalize(rotatedSampleDir + lightDir * 0.02);
            float cloudShadow = textureCube(cloudMap, shadowDir).r;
            
            finalColor *= (1.0 - cloudShadow * cloudOpacity * 0.5 * diffuse);

            float cloudDiffuse = max(0.0, dot(normalize(cloudDir), lightDir));
            float cloudLight = max(cloudDiffuse, 0.1) * shadowMask; // Cloud also receives shadow
            
            vec3 cloudColor = vec3(1.0) * cloudLight;
            finalColor = mix(finalColor, cloudColor, cloudSample.r * cloudOpacity);
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
    `,
};

const MoonMaterial = {
  vertexShader: EarthMaterial.vertexShader, // Reuse Earth Vertex Shader (Displacement + LogDepth + Shadows)
  fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    uniform sampler2D map;
    uniform sampler2D normalMap;
    
    uniform vec3 sunDirection; // Local space
    uniform vec3 localCameraPos; // Local space
    uniform float bumpScale;
    uniform float dayIntensity;

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    // Easy normal mapping for sphere
    vec3 getNormal() {
        vec3 objectNormal = normalize(vNormal);
        vec3 normalSample = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;
        
        // TBN Matrix
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), objectNormal));
        if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);
        vec3 bitangent = normalize(cross(objectNormal, tangent));
        
        mat3 tbn = mat3(tangent, bitangent, objectNormal);
        
        // Use normalStrength for XY (slope) and keeping Z (up) relative
        vec3 perturbed = tbn * normalize(vec3(normalSample.xy * bumpScale, normalSample.z)); 
        return normalize(perturbed);
    }

    void main() {
        #include <logdepthbuf_fragment>

        vec3 normal = getNormal();
        vec3 lightDir = normalize(sunDirection);
        // vec3 viewDir = normalize(localCameraPos - vLocalPosition); // Not needed for diffuse only

        // Diffuse factor
        float NdotL = dot(normal, lightDir);
        float diffuse = max(0.0, NdotL);

        // Calculate Shadow Mask (0.0 = shadowed, 1.0 = lit)
        float shadowMask = getShadowMask();

        // Apply shadow to diffuse lighting
        diffuse *= shadowMask;

        // Sample Texture
        vec4 texColor = texture2D(map, vUv);

        // Final Color
        // Simple Diffuse Lighting
        vec3 finalColor = texColor.rgb * diffuse * dayIntensity;
        
        // Ambient fill (simulated bounce light)
        finalColor += texColor.rgb * 0.02; 

        gl_FragColor = vec4(finalColor, 1.0);
    }
    `,
};

// Global Dummy Textures to reuse across Earth and Moon
const dummyTexture = new THREE.DataTexture(
  new Uint8Array([128, 128, 128, 255]),
  1,
  1,
);
dummyTexture.needsUpdate = true;

const dummyCanvas = document.createElement("canvas");
dummyCanvas.width = 1;
dummyCanvas.height = 1;
const dummyCtx = dummyCanvas.getContext("2d");
if (dummyCtx) {
  dummyCtx.fillStyle = "rgba(128, 128, 128, 1)";
  dummyCtx.fillRect(0, 0, 1, 1);
}
const dummyCube = new THREE.CubeTexture([
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
]);
dummyCube.needsUpdate = true;

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
  issModel = "small",
  focusedBodyId = null,
  showEarthGrid = false,
  earthTextureLOD = "high",
  showClouds = true,
  cloudSpeed = 0.05,
  cloudOpacity = 1.0,
  showNightLights = true,
  bumpScale = 0.02,
  specularStrength = 1.0,
  nightLightIntensity = 2.0,
  dayIntensity = 1.0,
  earthRotationOffset = 0.0,
  earthTextureOffset = 0.0,
  displacementScale = 0.0,
  cloudRotationOffset = 0.0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const issGroupRef = useRef<THREE.Group>(null);
  const atmMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const moonMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const atmMeshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  const isInsideAtmosphereRef = useRef(false);

  // Texture Loading State (Moved to top)
  const [loadedTextures, setTextures] = useState<{
    map: THREE.Texture | null;
    normal: THREE.Texture | null;
    specular: THREE.Texture | null;
    ring: THREE.Texture | null;
    displacement: THREE.Texture | null;
  }>({
    map: null,
    normal: null,
    specular: null,
    ring: null,
    displacement: null,
  });

  const [earthTextures, setEarthTextures] = useState<{
    day: THREE.CubeTexture | null;
    night: THREE.CubeTexture | null;
    clouds: THREE.CubeTexture | null;
    normal: THREE.Texture | null;
    specular: THREE.Texture | null;
    loadedLOD: string | null;
  }>({
    day: null,
    night: null,
    clouds: null,
    normal: null,
    specular: null,
    loadedLOD: null,
  });

  const isFocused = data.id === focusedBodyId;

  // Layer Management
  React.useEffect(() => {
    if (!groupRef.current) return;

    const targetLayer = isFocused ? 1 : 0;

    groupRef.current.traverse((child) => {
      child.layers.set(targetLayer);
    });

    return () => {
      if (groupRef.current) {
        groupRef.current.traverse((child) => {
          child.layers.set(0);
        });
      }
    };
  }, [isFocused]);

  // Constants
  const isMoon = data.type === "moon";
  const useMoonShader = data.id === "moon"; // Only apply custom shader to Luna for now
  const isSatellite = data.type === "satellite";
  const visualOrbitScale = isMoon || isSatellite ? MOON_ORBIT_SCALE : 1;

  // Use atmosphereColor if available
  const hasAtmosphere = !!data.atmosphereColor;
  const isGasGiant = ["jupiter", "saturn", "uranus", "neptune"].includes(
    data.id,
  );
  const isEarth = data.id === "earth";

  // For satellites, we need a minimum orbit radius based on parent planet's visual size
  // Earth radius=1.0, PLANET_SCALE=0.5, so Earth visual size = 0.5 * scaleFactor
  // We want ISS to orbit at ~1.15x the planet's visual radius (physically ~1.06, but keeping strictly above surface)
  const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor; // Assuming Earth as parent
  const satelliteMinOrbitRadius = parentPlanetVisualRadius * 1.15;

  // Orbit Path
  const orbitPath = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = isSatellite ? 128 : isMoon ? 64 : 180;
    const orbitalPeriodDays = data.period * 365.25;

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * orbitalPeriodDays;
      const pos = calculateOrbitalPositionWithPeriod(
        data.elements,
        t,
        data.period,
      );

      if (isSatellite) {
        const orbitPos = new THREE.Vector3(
          pos[0] * visualOrbitScale,
          pos[1] * visualOrbitScale,
          pos[2] * visualOrbitScale,
        );
        const distance = orbitPos.length();
        if (distance > 0) {
          orbitPos
            .normalize()
            .multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
        }
        points.push(orbitPos);
      } else {
        points.push(
          new THREE.Vector3(
            pos[0] * visualOrbitScale,
            pos[1] * visualOrbitScale,
            pos[2] * visualOrbitScale,
          ),
        );
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

  // Initialize Uniforms ONCE
  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(data.atmosphereColor) },
      localSunPos: { value: new THREE.Vector3() },
      localCameraPos: { value: new THREE.Vector3() },
      planetRadius: { value: size },
      atmosphereRadius: { value: atmRadius },
      densityFalloff: { value: atmPow },
      intensity: { value: atmOpacity },
      numSamples: { value: atmSamples },
    }),
    [],
  );

  // Earth Uniforms
  const earthUniforms = useMemo(() => {
    return THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        dayMap: { value: dummyCube },
        nightMap: { value: dummyCube },
        cloudMap: { value: dummyCube },
        normalMap: { value: dummyTexture },
        specularMap: { value: dummyTexture },
        displacementMap: { value: dummyTexture },
        sunDirection: { value: new THREE.Vector3() },
        localCameraPos: { value: new THREE.Vector3() },
        cloudTime: { value: 0 },
        cloudRotationOffset: { value: cloudRotationOffset },
        cloudOpacity: { value: cloudOpacity },
        showClouds: { value: showClouds },
        showNightLights: { value: showNightLights },
        bumpScale: { value: bumpScale },
        specularStrength: { value: specularStrength },
        nightLightIntensity: { value: nightLightIntensity },
        dayIntensity: { value: dayIntensity },
        earthTextureOffset: { value: earthTextureOffset },
        displacementScale: { value: displacementScale },
      },
    ]);
  }, []);

  // Moon Uniforms
  const moonUniforms = useMemo(() => {
    return THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        map: { value: dummyTexture },
        normalMap: { value: dummyTexture },
        displacementMap: { value: dummyTexture },
        displacementScale: { value: 0 },
        sunDirection: { value: new THREE.Vector3() },
        localCameraPos: { value: new THREE.Vector3() },
        bumpScale: { value: bumpScale },
        dayIntensity: { value: dayIntensity },
      },
    ]);
  }, []);

  // Sync Moon Textures to Uniforms (using material ref)
  useEffect(() => {
    if (data.id === "moon" && moonMaterialRef.current) {
      const u = moonMaterialRef.current.uniforms;

      if (loadedTextures.map) {
        console.log("Moon: Setting map texture");
        u.map.value = loadedTextures.map;
      }
      if (loadedTextures.normal) {
        console.log("Moon: Setting normal texture");
        u.normalMap.value = loadedTextures.normal;
      }
      if (loadedTextures.displacement) {
        console.log(
          "Moon: Setting displacement texture",
          loadedTextures.displacement,
        );
        u.displacementMap.value = loadedTextures.displacement;
      }

      u.bumpScale.value = bumpScale;
      u.displacementScale.value = displacementScale;
      u.dayIntensity.value = dayIntensity;

      console.log("Moon displacement scale:", displacementScale);
    }
  }, [data.id, loadedTextures, bumpScale, displacementScale, dayIntensity]);

  // Pre-allocate vectors
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tempSun = useMemo(() => new THREE.Vector3(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempXAxis = useMemo(() => new THREE.Vector3(), []);
  const tempYAxis = useMemo(() => new THREE.Vector3(), []);
  const tempZAxis = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);

  // Grid Texture Generation
  const gridTexture = useMemo(() => {
    if (data.id !== "earth" || !showEarthGrid) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;

    const w = 2048;
    const h = 1024;

    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      if (i <= 24) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "24px Arial";
        let lon = i * 15 - 180;
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(`${lon}°`, x + 5, h / 2);
        ctx.shadowBlur = 0;
      }
    }

    for (let i = 0; i <= 12; i++) {
      const y = (i / 12) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      if (i > 0 && i < 12) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "24px Arial";
        const lat = 90 - i * 15;
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(`${lat}°`, w / 2, y - 5);
        ctx.shadowBlur = 0;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
  }, [data.id, showEarthGrid]);

  // Texture Loading (Standard 2D)
  // loadedTextures moved to top

  // ... (Loader logic) ...

  React.useEffect(() => {
    let cancelled = false;

    // Earth Specific Loader
    if (data.id === "earth") {
      const manager = new THREE.LoadingManager();
      const loader = new THREE.TextureLoader(manager);
      const cubeLoader = new THREE.CubeTextureLoader(manager);
      const lod = earthTextureLOD || "high";

      // Only reload if LOD changed
      if (earthTextures.loadedLOD === lod) return;

      const path = "/tex";
      // Construct paths
      // Construct paths
      // Fallback for ULTRA textures (if they don't exist yet, use HIGH)
      const mapLod = lod;
      const fallbackLod = lod === "ultra" ? "high" : lod;

      const dayPath = `${path}/cubemap/earth-day-${lod}/`; // Check if Ultra exists
      const nightPath = `${path}/cubemap/earth-night-${lod}/`;
      // For clouds, normal, specular, use fallback if ultra
      const cloudPath = `${path}/cubemap/earth-cloud-${fallbackLod}/`;

      const normalPath = `${path}/base/earth-normal-${fallbackLod}.jpg`;
      const specularPath = `${path}/base/earth-specular-${fallbackLod}.jpg`;
      const heightPath = `${path}/base/earth-height-${fallbackLod}.jpg`;

      const loadCubemap = (p: string, prefix: string) =>
        new Promise<THREE.CubeTexture>((resolve, reject) => {
          const suffixes = [
            "_rt.jpg",
            "_lf.jpg",
            "_up.jpg",
            "_dn.jpg",
            "_ft.jpg",
            "_bk.jpg",
          ];
          const files = suffixes.map((s) => `${prefix}${s}`);

          cubeLoader.setPath(p).load(
            files,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              resolve(tex);
            },
            undefined,
            reject,
          );
        });

      const load2D = (p: string, isSRGB = true) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            p,
            (tex) => {
              tex.colorSpace = isSRGB
                ? THREE.SRGBColorSpace
                : THREE.NoColorSpace;
              resolve(tex);
            },
            undefined,
            reject,
          );
        });

      Promise.all([
        loadCubemap(dayPath, "earth-day"),
        loadCubemap(nightPath, "earth-night"),
        loadCubemap(cloudPath, "earth-cloud"),
        load2D(normalPath, false),
        load2D(specularPath, true),
        load2D(heightPath, true),
      ])
        .then(([day, night, clouds, normal, specular, height]) => {
          if (cancelled) return;
          setEarthTextures({
            day,
            night,
            clouds,
            normal,
            specular,
            loadedLOD: lod,
          });

          // Update Uniforms
          if (earthUniforms) {
            earthUniforms.dayMap.value = day;
            earthUniforms.nightMap.value = night;
            earthUniforms.cloudMap.value = clouds;
            earthUniforms.normalMap.value = normal;
            earthUniforms.specularMap.value = specular;
            earthUniforms.displacementMap.value = height;
          }
        })
        .catch((err) => {
          console.error("Failed to load earth textures for LOD " + lod, err);
        });

      return () => {
        cancelled = true;
      };
    }

    // Standard Loader for other planets
    const loadedTexturesList: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();

    if (data.textureUrl) {
      loader.load(
        data.textureUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, map: tex }));
        },
        undefined,
        (err) => {
          console.warn(`Failed to load texture: ${data.textureUrl}`, err);
        },
      );
    }
    if (data.normalMapUrl) {
      loader.load(
        data.normalMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, normal: tex }));
        },
        undefined,
        (err) => {
          console.warn(`Failed to load normal map: ${data.normalMapUrl}`, err);
        },
      );
    }
    if (data.specularMapUrl) {
      loader.load(
        data.specularMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, specular: tex }));
        },
        undefined,
        (err) => {
          console.warn(
            `Failed to load specular map: ${data.specularMapUrl}`,
            err,
          );
        },
      );
    }
    if (data.displacementMapUrl) {
      loader.load(
        data.displacementMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, displacement: tex }));
        },
        undefined,
        (err) => {
          console.warn(
            `Failed to load displacement map: ${data.displacementMapUrl}`,
            err,
          );
        },
      );
    }
    if (data.ringMapUrl) {
      loader.load(
        data.ringMapUrl,
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          loadedTexturesList.push(tex);
          setTextures((prev) => ({ ...prev, ring: tex }));
        },
        undefined,
        (err) => {
          console.warn(`Failed to load ring texture: ${data.ringMapUrl}`, err);
        },
      );
    }

    return () => {
      cancelled = true;
      loadedTexturesList.forEach((tex) => tex.dispose());
    };
  }, [
    data.id,
    data.textureUrl,
    data.normalMapUrl,
    data.specularMapUrl,
    data.ringMapUrl,
    earthTextureLOD,
  ]);

  useFrame((state) => {
    const time = timeRef.current;

    // 1. Calculate Orbit Position
    let pos = calculateOrbitalPositionWithPeriod(
      data.elements,
      time,
      data.period,
    );
    let currentPos = new THREE.Vector3(
      pos[0] * visualOrbitScale,
      pos[1] * visualOrbitScale,
      pos[2] * visualOrbitScale,
    );

    if (isSatellite) {
      const distance = currentPos.length();
      if (distance > 0) {
        // Scale to ensure orbit is outside planet
        currentPos
          .normalize()
          .multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
      }
    }

    if (groupRef.current) {
      // Update Planet Position
      groupRef.current.position.copy(currentPos);
      // Update Matrix World immediately
      groupRef.current.updateMatrixWorld(true);
    }

    // 2. Rotate Planet (Spin)
    if (meshRef.current) {
      if (data.rotationPeriod && data.rotationPeriod !== 0) {
        const initialOffset = data.rotationOffset || 0;
        const rotationAngle =
          ((time * 24) / data.rotationPeriod) * Math.PI * 2 + initialOffset;
        meshRef.current.rotation.y = rotationAngle;
      } else {
        meshRef.current.rotation.y +=
          0.01 / (data.period > 0.1 ? data.period : 1);
      }
    }
    if (earthMeshRef.current) {
      if (data.rotationPeriod && data.rotationPeriod !== 0) {
        const initialOffset = data.rotationOffset || 0;
        const rotationAngle =
          ((time * 24) / data.rotationPeriod) * Math.PI * 2 + initialOffset;
        // Add manual calibration offset
        earthMeshRef.current.rotation.y = rotationAngle + earthRotationOffset;
      } else {
        earthMeshRef.current.rotation.y +=
          0.01 / (data.period > 0.1 ? data.period : 1);
      }
    }

    // 3. Update ISS Orientation
    if (isSatellite && issGroupRef.current) {
      const dt = 0.0001;
      const futurePosArr = calculateOrbitalPositionWithPeriod(
        data.elements,
        time + dt,
        data.period,
      );
      const futureVec = tempVec.set(
        futurePosArr[0] * visualOrbitScale,
        futurePosArr[1] * visualOrbitScale,
        futurePosArr[2] * visualOrbitScale,
      );

      const futureDist = futureVec.length();
      if (futureDist > 0) {
        futureVec
          .normalize()
          .multiplyScalar(Math.max(futureDist, satelliteMinOrbitRadius));
      }

      const velocity = futureVec.sub(currentPos).normalize();
      const nadir = currentPos.clone().normalize().negate();

      tempXAxis.copy(velocity);
      tempZAxis.copy(nadir).negate();
      tempYAxis.crossVectors(tempZAxis, tempXAxis).normalize();
      tempXAxis.crossVectors(tempYAxis, tempZAxis).normalize();

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

      tempSun.set(0, 0, 0);
      atmMeshRef.current.worldToLocal(tempSun);
      u.localSunPos.value.copy(tempSun);

      u.planetRadius.value = size;
      u.atmosphereRadius.value = atmRadius;
      u.densityFalloff.value = atmPow;
      u.intensity.value = atmOpacity;
      u.color.value.set(data.atmosphereColor);

      atmMeshRef.current.getWorldPosition(tempVec);
      const distance = state.camera.position.distanceTo(tempVec);
      const fov = (state.camera as THREE.PerspectiveCamera).fov;
      const screenHeight = 2 * Math.tan((fov * Math.PI) / 360) * distance;
      const apparentSize = (atmRadius * 2) / screenHeight;
      const MIN_SAMPLES = 4;
      const maxSamples = atmSamples;
      const t = Math.min(Math.max(apparentSize * 4, 0), 1);
      const lodSamples = Math.round(
        MIN_SAMPLES + t * (maxSamples - MIN_SAMPLES),
      );
      u.numSamples.value = lodSamples;

      planetLodStore.set(data.id, { samples: lodSamples, apparentSize });

      const isInside = distance < atmRadius;

      if (isInside !== isInsideAtmosphereRef.current) {
        isInsideAtmosphereRef.current = isInside;
        atmMaterialRef.current.depthTest = !isInside;
        atmMaterialRef.current.needsUpdate = true;
      }
    }

    // 5. Update Earth Shader Uniforms
    if (isEarth && earthMaterialRef.current && earthMeshRef.current) {
      const u = earthMaterialRef.current.uniforms;

      // Sun Position in Local Space
      // We can reuse the calculation from Atmosphere or redo it.
      // Local Sun is (0,0,0) transformed to local space
      // BUT, for texturing, we want the Sun direction relative to the rotating earth.

      // The Sun is at World (0,0,0).
      // The Planet is at World P.
      // The Planet is rotated by R.
      // We want Vector S (Sun) in Local Frame.
      // LocalS = Inverse(ModelMatrix) * WorldS

      // We can use worldToLocal to transform (0,0,0).
      tempSun.set(0, 0, 0);
      earthMeshRef.current.worldToLocal(tempSun);

      // Note: worldToLocal transforms the point. For a direction, we normalize.
      // Since sun is at 0,0,0 and planet is at P, the direction from planet to sun in world space is -P.
      // In local space, it's normalized(tempSun).
      // However, calculateOrbitalPosition returns (0,0,0) is the sun.
      // worldToLocal(0,0,0) gives the local coordinate of the sun.
      u.sunDirection.value.copy(tempSun).normalize();

      // Update dynamic uniforms
      u.cloudTime.value = time * cloudSpeed * 100.0; // scale up speed
      earthUniforms.cloudRotationOffset.value = cloudRotationOffset;
      earthUniforms.cloudOpacity.value = cloudOpacity;
      earthUniforms.showClouds.value = showClouds;
      earthUniforms.showNightLights.value = showNightLights;
      earthUniforms.bumpScale.value = bumpScale;
      earthUniforms.specularStrength.value = specularStrength;
      earthUniforms.displacementScale.value = displacementScale;
      earthUniforms.nightLightIntensity.value = nightLightIntensity;
      earthUniforms.dayIntensity.value = dayIntensity;
      earthUniforms.earthTextureOffset.value = earthTextureOffset;

      if (earthMeshRef.current) {
        // Get Local Camera Position
        tempVec.copy(camera.position);
        earthMeshRef.current.worldToLocal(tempVec);
        u.localCameraPos.value.copy(tempVec);
      }
    }

    if (useMoonShader && meshRef.current && moonMaterialRef.current) {
      // Update Moon Uniforms on the MATERIAL instance
      const u = moonMaterialRef.current.uniforms;

      // Sun Position (Same logic as Earth)
      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.sunDirection.value.copy(tempSun).normalize();

      // Camera Position
      tempVec.copy(camera.position);
      meshRef.current.worldToLocal(tempVec);
      u.localCameraPos.value.copy(tempVec);

      // Dynamic Uniforms
      u.dayIntensity.value = dayIntensity;
      u.bumpScale.value = bumpScale;
      u.displacementScale.value = displacementScale;
    }
  });

  const tiltQuaternion = useMemo(() => {
    if (data.poleDirection) {
      const pd = data.poleDirection;
      const obliquity = 23.43928 * (Math.PI / 180);
      const cosE = Math.cos(obliquity);
      const sinE = Math.sin(obliquity);
      const y_ecl = pd.z;
      const z_ecl = -pd.y;
      const y_eq = y_ecl * cosE - z_ecl * sinE;
      const z_eq = y_ecl * sinE + z_ecl * cosE;
      const target = new THREE.Vector3(pd.x, y_eq, z_eq).normalize();
      return new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        target,
      );
    }
    return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(-(data.axialTilt || 0)), 0, 0),
    );
  }, [data.axialTilt, data.poleDirection]);

  return (
    <>
      {showOrbit && (
        <Line
          points={orbitPath}
          color={isSelected ? "#ffffff" : data.color || "white"}
          opacity={isSelected ? 0.6 : isMoon ? 0.2 : 0.3}
          transparent
          lineWidth={isSelected ? 2 : isMoon ? 1 : 1.5}
        />
      )}

      <group ref={groupRef}>
        <group quaternion={tiltQuaternion}>
          {/* Atmosphere Mesh (Outer Shell) */}
          {hasAtmosphere && !isMoon && (
            <mesh ref={atmMeshRef}>
              <sphereGeometry args={[atmRadius, 64, 64]} />
              <shaderMaterial
                ref={atmMaterialRef}
                defines={{ MAX_SAMPLES: 64 }}
                vertexShader={AtmosphereMaterial.vertexShader}
                fragmentShader={AtmosphereMaterial.fragmentShader}
                uniforms={uniforms}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                transparent
                depthWrite={false}
              />
            </mesh>
          )}

          {useMoonShader ? (
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
              renderOrder={1}
            >
              <sphereGeometry args={[size, 128, 128]} />
              <shaderMaterial
                ref={moonMaterialRef}
                key={`moon-mat-${data.id}`}
                vertexShader={MoonMaterial.vertexShader}
                fragmentShader={MoonMaterial.fragmentShader}
                uniforms={moonUniforms}
                lights={true}
                transparent={false}
                depthWrite={true}
                depthTest={true}
              />
            </mesh>
          ) : isEarth ? (
            <mesh
              ref={earthMeshRef}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(data);
              }}
              onPointerOver={() => setHover(true)}
              onPointerOut={() => setHover(false)}
              castShadow
              receiveShadow
              renderOrder={1} // Ensure it sorts correctly
            >
              <sphereGeometry args={[size, 128, 128]} />
              <shaderMaterial
                ref={earthMaterialRef}
                key={`earth-mat-${data.id}`} // Force remount if needed
                vertexShader={EarthMaterial.vertexShader}
                fragmentShader={EarthMaterial.fragmentShader}
                uniforms={earthUniforms}
                lights={true}
                transparent={false}
                depthWrite={true}
                depthTest={true}
              />
              {/* Grid Overlay for Earth */}
              {gridTexture && (
                <mesh>
                  <sphereGeometry args={[size * 1.002, 64, 64]} />
                  <meshBasicMaterial
                    map={gridTexture}
                    transparent
                    opacity={0.8}
                    side={THREE.FrontSide}
                    depthWrite={false}
                  />
                </mesh>
              )}

              {(showLabel || hovered || isSelected) && (
                <Html position={[0, size * 1.5, 0]}>
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold pointer-events-none transition-opacity duration-200 select-none whitespace-nowrap flex items-center gap-1.5
                                ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : "bg-black/50 text-white border border-white/20"}
                                `}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {data.name}
                  </div>
                </Html>
              )}
            </mesh>
          ) : isSatellite ? (
            <group
              ref={issGroupRef}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(data);
              }}
              onPointerOver={() => setHover(true)}
              onPointerOut={() => setHover(false)}
            >
              <ISSModel
                scale={size * 0.5}
                modelType={issModel}
                layer={isFocused ? 1 : 0}
              />
              {(showLabel || hovered || isSelected) && (
                <Html position={[0, size * 3, 0]}>
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold pointer-events-none transition-opacity duration-200 select-none whitespace-nowrap flex items-center gap-1.5
                                ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : "bg-black/50 text-white border border-white/20"}
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
              <sphereGeometry args={[size, 128, 128]} />
              <meshStandardMaterial
                map={loadedTextures.map}
                normalMap={loadedTextures.normal}
                normalScale={new THREE.Vector2(bumpScale, bumpScale)}
                roughness={0.8}
                metalness={0.1}
                displacementMap={loadedTextures.displacement}
                displacementScale={
                  loadedTextures.displacement ? displacementScale * 0.1 : 0
                }
                color={data.color}
              />

              {/* Ring System */}
              {loadedTextures.ring &&
                data.ringInnerRadius &&
                data.ringOuterRadius && (
                  <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                    castShadow
                  >
                    <ringGeometry
                      args={[
                        size * data.ringInnerRadius,
                        size * data.ringOuterRadius,
                        64,
                      ]}
                      onUpdate={(geom) => {
                        const pos = geom.attributes.position;
                        const uv = geom.attributes.uv;
                        // Correctly handle UVs for ring
                        const v3 = new THREE.Vector3();
                        const inner = size * (data.ringInnerRadius || 1.2);
                        const outer = size * (data.ringOuterRadius || 2.5);

                        for (let i = 0; i < pos.count; i++) {
                          v3.fromBufferAttribute(pos, i);
                          const len = v3.length();
                          const u = (len - inner) / (outer - inner);
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
                      color={0xffffff}
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
                                ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : "bg-black/50 text-white border border-white/20"}
                                `}
                  >
                    {data.textureUrl && (
                      <img
                        src={data.textureUrl}
                        alt=""
                        className="w-3 h-3 rounded-full object-cover border border-white/50"
                      />
                    )}
                    {data.name}
                  </div>
                </Html>
              )}
            </mesh>
          )}
        </group>

        {data.moons &&
          data.moons.map((moon) => (
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
              focusedBodyId={focusedBodyId}
              // Pass Earth Graphics props safely even for moons (ignored but valid prop)
              earthTextureLOD={earthTextureLOD}
              showClouds={showClouds}
              cloudSpeed={cloudSpeed}
              cloudOpacity={cloudOpacity}
              showNightLights={showNightLights}
              bumpScale={bumpScale}
              specularStrength={specularStrength}
              nightLightIntensity={nightLightIntensity}
              dayIntensity={dayIntensity}
              displacementScale={displacementScale}
            />
          ))}
      </group>
    </>
  );
};

export default React.memo(Planet);
