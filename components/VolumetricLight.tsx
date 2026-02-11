import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  PLANETS,
  AU_SCALE,
  MOON_ORBIT_SCALE,
  PLANET_SCALE,
} from "../constants";
import { calculateOrbitalPositionWithPeriod } from "../utils/physics";

const MAX_BODIES = 20;

// Vertex Shader
const vertexShader = `
varying vec3 vWorldPos;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Fragment Shader (SAMPLES injected via #define)
const fragmentShaderBody = `
precision highp float;

#define MAX_BODIES 20

uniform vec3 uBodyPos[MAX_BODIES];
uniform float uBodyRadius[MAX_BODIES];
uniform int uBodyCount;
uniform float uSunRadius;

uniform float uIntensity;
uniform float uDecay;
uniform vec3 uScatterColor;
uniform float uShadowSharpness;
uniform float uShadowScale;
uniform float uMaxDistWorld;
uniform vec3 uCameraPos;

varying vec3 vWorldPos;

// Truncated shadow cone test (frustum).
// The shadow is a truncated cone (frustum) behind each body:
//   - Starts at body center with radius = bodyRadius * shadowScale
//   - Opens outward along the Sun->body direction using the geometric
//     half-angle: tan(theta) = sunRadius / D
//   - Extends to the edge of the scene (uMaxDistWorld)
//
// Returns 1.0 = fully lit, 0.0 = fully in shadow.
float shadowFrustumTest(vec3 samplePos, vec3 bodyPos, float bodyRadius) {
    float D = length(bodyPos);
    if (D < 0.001) return 1.0;

    vec3 shadowDir = bodyPos / D;

    // Vector from body to sample, projected along shadow axis
    vec3 bodyToSample = samplePos - bodyPos;
    float alongShadow = dot(bodyToSample, shadowDir);

    // Must be behind the body (away from Sun)
    if (alongShadow < 0.0) return 1.0;

    // Perpendicular distance from sample to the shadow axis
    float perpDist = length(bodyToSample - shadowDir * alongShadow);

    // Frustum: starts at bodyRadius * shadowScale, opens with angle
    // determined by the Sun's angular size as seen from the body.
    // tan(halfAngle) = sunRadius / D (geometric penumbra opening)
    float baseRadius = bodyRadius * uShadowScale;
    float tanAngle = uSunRadius / D;

    // Radius of the truncated cone at distance 'alongShadow' past the body
    float coneRadius = baseRadius + alongShadow * tanAngle * uShadowScale;

    // Smooth edge
    float softness = mix(0.5, 0.05, uShadowSharpness);
    float edgeWidth = max(coneRadius * softness, 0.01);
    return smoothstep(coneRadius - edgeWidth, coneRadius + edgeWidth, perpDist);
}

void main() {
    vec3 rayDir = normalize(vWorldPos - uCameraPos);
    vec3 rayOrigin = uCameraPos;

    // Intersect ray with bounding sphere
    float bCoeff = dot(rayOrigin, rayDir);
    float cCoeff = dot(rayOrigin, rayOrigin) - uMaxDistWorld * uMaxDistWorld;
    float disc = bCoeff * bCoeff - cCoeff;
    if (disc < 0.0) discard;
    float sq = sqrt(disc);
    float tStart = max(-bCoeff - sq, 0.0);
    float tEnd = -bCoeff + sq;
    if (tEnd < 0.0) discard;

    float marchLength = tEnd - tStart;
    float stepSize = marchLength / float(SAMPLES);

    float totalLight = 0.0;

    for (int i = 0; i < SAMPLES; i++) {
        float t = tStart + (float(i) + 0.5) * stepSize;
        vec3 samplePos = rayOrigin + rayDir * t;

        // Light: exponential falloff from Sun
        float distFromSun = length(samplePos);
        if (distFromSun < uSunRadius) continue;

        float normDist = distFromSun / 50.0;
        float lightAtPoint = exp(-normDist * uDecay);

        // Test shadow frustums from all bodies
        float shadowFactor = 1.0;
        for (int j = 0; j < MAX_BODIES; j++) {
            if (j >= uBodyCount) break;
            shadowFactor *= shadowFrustumTest(samplePos, uBodyPos[j], uBodyRadius[j]);
        }

        totalLight += lightAtPoint * shadowFactor;
    }

    // Average over samples, apply intensity
    totalLight = totalLight / float(SAMPLES) * uIntensity;

    gl_FragColor = vec4(uScatterColor * totalLight, totalLight);
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
  scaleFactor: number;
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
  scaleFactor,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const prevSamplesRef = useRef(samples);

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
      uSunRadius: { value: 5 * PLANET_SCALE * scaleFactor },
      uIntensity: { value: intensity },
      uDecay: { value: decay },
      uScatterColor: { value: new THREE.Color(scatterColor) },
      uShadowSharpness: { value: shadowSharpness },
      uShadowScale: { value: shadowScale },
      uMaxDistWorld: { value: maxDistance * AU_SCALE },
      uCameraPos: { value: new THREE.Vector3(0, 50, 100) },
    }),
    [],
  );

  useFrame((state) => {
    if (!materialRef.current || !visible) return;

    // Handle sample count change → shader recompile
    if (prevSamplesRef.current !== samples) {
      materialRef.current.fragmentShader =
        `#define SAMPLES ${samples}\n` + fragmentShaderBody;
      materialRef.current.needsUpdate = true;
      prevSamplesRef.current = samples;
    }

    const u = materialRef.current.uniforms;
    u.uIntensity.value = intensity;
    u.uDecay.value = decay;
    u.uScatterColor.value.set(scatterColor);
    u.uShadowSharpness.value = shadowSharpness;
    u.uShadowScale.value = shadowScale;
    u.uMaxDistWorld.value = maxDistance * AU_SCALE;
    u.uSunRadius.value = 5 * PLANET_SCALE * scaleFactor;
    u.uCameraPos.value.copy(state.camera.position);

    // Collect body positions and radii
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
      );
      tmpVecs[count].set(x, y, z);
      posArray[count].set(x, y, z);
      radArray[count] = p.radius * PLANET_SCALE * scaleFactor;
      count++;
    });

    // Add moons (skip satellites — too small for visible shadow cones)
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
          );
          const orbitScale = m.type === "moon" ? MOON_ORBIT_SCALE : 1;
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

    // Zero out unused slots
    for (let i = count; i < MAX_BODIES; i++) {
      posArray[i].set(0, 0, 0);
      radArray[i] = 0;
    }

    u.uBodyCount.value = count;
  });

  if (!visible) return null;

  const sphereRadius = maxDistance * AU_SCALE;

  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[sphereRadius, 32, 16]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={`#define SAMPLES ${samples}\n` + fragmentShaderBody}
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
