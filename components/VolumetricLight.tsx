import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  PLANETS,
  PLANET_SCALE,
  BASE_AU_SCALE,
} from "../constants";
import { calculateOrbitalPositionWithPeriod, getDynamicMoonOrbitScale } from "../utils/physics";

const MAX_BODIES = 20;

const vertexShader = `
varying vec3 vWorldPos;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
precision highp float;

#define MAX_BODIES 20

uniform vec3 uBodyPos[MAX_BODIES];
uniform float uBodyRadius[MAX_BODIES];
uniform int uBodyCount;
uniform float uSunRadius;

uniform float uIntensity;
uniform float uDecay;
uniform vec3 uScatterColor;
uniform float uMaxDistWorld;
uniform vec3 uCameraPos;
uniform float uShadowScale; // Strength Multiplier
uniform float uMinBodyRadius; // Minimum radius for anti-flicker

varying vec3 vWorldPos;

// Helper: Intersect Ray with Plane defined by Point (p) and Normal (n)
// Returns t.
// Plane eq: dot(P - p, n) = 0
float intersectPlane(vec3 ro, vec3 rd, vec3 p, vec3 n) {
    return dot(p - ro, n) / (dot(rd, n) + 1e-9);
}

// UMBRA: Converging Cone with Soft Edges
float getShadowIntersectionLength(vec3 ro, vec3 rd, vec3 planetPos, float planetRadius, float sunRadius, vec3 sunPos, float maxDist) {
    vec3 sunToPlanet = planetPos - sunPos;
    float distSunPlanet = length(sunToPlanet);
    vec3 axis = normalize(sunToPlanet);
    
    // Safety
    if (sunRadius <= planetRadius) sunRadius = planetRadius + 0.001; 
    
    float umbraApexDist = distSunPlanet * planetRadius / (sunRadius - planetRadius);
    vec3 umbraApex = planetPos + axis * umbraApexDist;
    float umbraAngle = asin((sunRadius - planetRadius) / distSunPlanet);
    float cosUmbra = cos(umbraAngle);
    float sinUmbra = sin(umbraAngle);
    
    vec3 coneDir = -axis; // Towards Sun
    vec3 apex = umbraApex; // Cone Tip
    
    // Standard Cone Intersection for Length
    vec3 co = ro - apex;
    float ad = dot(rd, coneDir);
    float cOd = dot(co, coneDir);
    float a = ad * ad - cosUmbra * cosUmbra;
    float b = 2.0 * (ad * cOd - dot(rd, co) * cosUmbra * cosUmbra);
    float c = cOd * cOd - dot(co, co) * cosUmbra * cosUmbra;
    
    float det = b*b - 4.0*a*c;
    if (det < 0.0) return 0.0;
    
    det = sqrt(det);
    float t1 = (-b - det) / (2.0 * a);
    float t2 = (-b + det) / (2.0 * a);
    
    float tNear = min(t1, t2);
    float tFar = max(t1, t2);
    
    tNear = max(tNear, 0.0);
    tFar = min(tFar, maxDist);
    if (tNear >= tFar) return 0.0;
    
    // Clipping along axis: [0, umbraApexDist]
    float h_start = dot(co, coneDir);
    float h_slope = ad;
    
    float t_h0 = -h_start / (h_slope + 1e-9);
    float t_hL = (umbraApexDist - h_start) / (h_slope + 1e-9);
    
    float t_min_h = min(t_h0, t_hL);
    float t_max_h = max(t_h0, t_hL);
    
    if (abs(h_slope) < 1e-5) {
        if (h_start < 0.0 || h_start > umbraApexDist) return 0.0;
    } else {
        tNear = max(tNear, t_min_h);
        tFar = min(tFar, t_max_h);
    }
    
    if (tNear >= tFar) return 0.0;
    
    float intersectionLen = tFar - tNear;
    
    // Anti-Aliasing / Soft Edge
    // We want to soften the edge when the ray grazes the cone surface.
    // The "grazing" condition is related to det.
    // det = 0 means the ray touches the surface perfectly.
    // det > 0 means it passes through.
    // Normalized determinant or distance can be used.
    // A simple heuristic: smoothstep the determinant or the projected distance.
    // det corresponds to the chord length roughly.
    // If chord length is very small, we are at the edge.
    
    // Scale factor for softness - depends on distance?
    // Let's just use a fixed small value for "pixel size" approximation or uniform softness.
    
    float softness = 0.01 * planetRadius; // Relative to planet size
    float edgeFactor = smoothstep(0.0, softness, intersectionLen);
    
    return intersectionLen * edgeFactor;
}

void main() {
    vec3 rayDir = normalize(vWorldPos - uCameraPos);
    
    float b = dot(uCameraPos, rayDir);
    float c = dot(uCameraPos, uCameraPos) - uMaxDistWorld * uMaxDistWorld;
    float d = b*b - c;
    if (d < 0.0) discard;
    float tEnd = -b + sqrt(d);
    
    float rayLength = max(0.0, tEnd);
    
    float totalShadow = 0.0;
    vec3 sunPos = vec3(0.0);
    
    for (int i = 0; i < MAX_BODIES; i++) {
        if (i >= uBodyCount) break;
        
        // Per-planet virtual sun radius to ensure converging cone
        float virtualSunRadius = uBodyRadius[i] * 1.5;
        
        // Anti-flicker: Ensure planet radius is at least somewhat significant relative to distance?
        // Or simply ensure it's not zero.
        // The flicker comes from aliasing on very thin cones.
        // We can slightly inflate the radius for shadow purposes if it's too small.
        float effectiveRadius = max(uBodyRadius[i], uMinBodyRadius); // Enforce minimum size
        
        // Re-calculate virtual Sun based on effective radius to maintain ratio
        virtualSunRadius = max(virtualSunRadius, effectiveRadius * 1.5);
        
        float umbraLen = getShadowIntersectionLength(uCameraPos, rayDir, uBodyPos[i], effectiveRadius, virtualSunRadius, sunPos, rayLength);
        
        // Penumbra disabled for stability/uniformity
        
        float shadowLen = umbraLen * 1.0; 
        
        totalShadow += shadowLen * uShadowScale;
    }
    
    float visibleLength = max(0.0, rayLength - totalShadow);
    
    // Fog decay
    float fogAmount = 1.0 - exp(-uDecay * visibleLength * 0.0001);
    
    vec3 finalColor = uScatterColor * fogAmount * uIntensity;
    
    gl_FragColor = vec4(finalColor, fogAmount * uIntensity); 
}
`;

interface VolumetricLightProps {
  visible: boolean;
  intensity: number;
  samples: number;
  decay: number;
  scatterColor: string;
  shadowSharpness: number;
  shadowScale: number;
  maxDistance: number;
  timeRef: React.MutableRefObject<number>;
  scaleFactor: number; auScale: number;
}

const VolumetricLight: React.FC<VolumetricLightProps> = ({
  visible,
  intensity,
  samples,
  decay,
  scatterColor,
  shadowSharpness,
  shadowScale,
  maxDistance,
  timeRef,
  scaleFactor, auScale,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const auScaleRef = useRef(auScale);
  const scaleFactorRef = useRef(scaleFactor);
  useEffect(() => {
    auScaleRef.current = auScale;
    scaleFactorRef.current = scaleFactor;
  }, [auScale, scaleFactor]);

  // Pre-allocate Vector3 array for body positions (avoid GC)
  const bodyVec3Array = useRef<THREE.Vector3[]>(
    Array.from({ length: MAX_BODIES }, () => new THREE.Vector3()),
  );

  const uniforms = useMemo(
    () => ({
      uBodyPos: {
        value: Array.from({ length: MAX_BODIES }, () => new THREE.Vector3()),
      },
      uBodyRadius: { value: new Float32Array(MAX_BODIES) },
      uBodyCount: { value: 0 },
      // Artificially reduce Sun Radius for shadows to make Umbra longer and more prominent
      uSunRadius: { value: 2.0 * PLANET_SCALE * scaleFactor },
      uMinBodyRadius: { value: 0.05 * PLANET_SCALE * scaleFactor },
      uIntensity: { value: intensity },
      uDecay: { value: decay },
      uScatterColor: { value: new THREE.Color(scatterColor) },
      uMaxDistWorld: { value: maxDistance * auScaleRef.current },
      uCameraPos: { value: new THREE.Vector3(0, 50, 100) },
      uShadowScale: { value: shadowScale }, // Used as Strength Multiplier
    }),
    [],
  );

  useFrame((state) => {
    if (!materialRef.current || !visible) return;

    const u = materialRef.current.uniforms;
    u.uIntensity.value = intensity;
    u.uDecay.value = decay;
    u.uScatterColor.value.set(scatterColor);
    u.uMaxDistWorld.value = maxDistance * auScaleRef.current;
    // Artificially reduce Sun Radius for shadows to make Umbra longer and more prominent
    // "Cinematic" shadowing often prefers longer, near-parallel rays.
    u.uSunRadius.value = 1.2 * PLANET_SCALE * scaleFactorRef.current;
    u.uMinBodyRadius.value = 0.05 * PLANET_SCALE * scaleFactorRef.current;
    u.uCameraPos.value.copy(state.camera.position);
    u.uShadowScale.value = shadowScale;

    const posArray = u.uBodyPos.value as THREE.Vector3[];
    const radArray = u.uBodyRadius.value as Float32Array;
    let count = 0;
    const t = timeRef.current;
    const tmpVecs = bodyVec3Array.current;

    PLANETS.forEach((p) => {
      if (count >= MAX_BODIES) return;
      const [x, y, z] = calculateOrbitalPositionWithPeriod(
        p.elements,
        t,
        p.period,
        auScaleRef.current
      );
      tmpVecs[count].set(x, y, z);
      posArray[count].set(x, y, z);
      radArray[count] = p.radius * PLANET_SCALE * scaleFactor;
      count++;
    });

    // Add moons
    PLANETS.forEach((p) => {
      if (p.moons) {
        const parentIdx = PLANETS.indexOf(p);
        if (parentIdx < 0) return;
        const parentPos = tmpVecs[parentIdx];

        p.moons.forEach((m) => {
          if (count >= MAX_BODIES) return;
          if (m.type === "satellite") return;
          const [mx, my, mz] = calculateOrbitalPositionWithPeriod(
            m.elements,
            t,
            m.period,
            BASE_AU_SCALE
          );
          let orbitScale = 1;
          if (m.type === "moon") {
            orbitScale = getDynamicMoonOrbitScale(
              m.elements,
              m.period,
              m.radius,
              p.elements.semiMajorAxis,
              p.radius || 1.0,
              auScaleRef.current,
              scaleFactorRef.current,
              BASE_AU_SCALE,
              PLANET_SCALE,
              10.0
            );
          }
          posArray[count].set(
            parentPos.x + mx * orbitScale,
            parentPos.y + my * orbitScale,
            parentPos.z + mz * orbitScale,
          );
          radArray[count] = m.radius * PLANET_SCALE * scaleFactor;
          count++;
        });
      }
    });

    u.uBodyCount.value = count;
  });

  if (!visible) return null;

  const sphereRadius = maxDistance * auScale;

  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[sphereRadius, 32, 16]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default VolumetricLight;
