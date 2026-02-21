import React, { useRef, useMemo, useEffect, useCallback, Suspense } from "react";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RealStars from "./RealStars";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ToneMapping,
  ChromaticAberration,
  BrightnessContrast,
  SMAA,
  HueSaturation,
  N8AO,
} from "@react-three/postprocessing";
import * as THREE from "three";

import {
  PLANETS,
  SUN_DATA,
  PLANET_SCALE,
  SATELLITE_ORBIT_FACTOR,
  BASE_AU_SCALE,
} from "../constants";
import { PlanetData, CameraPoint } from "../types";
import { calculateOrbitalPositionWithPeriod, getDynamicMoonOrbitScale } from "../utils/physics";
import Planet from "./planet";

import Sun from "./Sun";
import GravitationalPotential from "./GravitationalPotential";
import GravityParticles from "./GravityParticles";
import VolumetricLight from "./VolumetricLight";
import { useStarData } from "../hooks/useStarData";
import Constellations from "./Constellations";
import CelestialGrid from "./CelestialGrid";
import KeyboardCameraController from "./KeyboardCameraController";

// Module-level camera store: written by SceneContent useFrame, read by DebugPanel
export const cameraPositionStore = { x: 0, y: 0, z: 0 };
// Module-level telescope angle store: written by SceneContent useFrame surface calculations, read by App
export const telescopeAngleStore = { azimuth: 0, altitude: 0 };

interface SceneContentProps {
  speed: number;
  paused: boolean;
  scaleFactor: number;
  auScale: number;
  showOrbits: boolean;
  showLabels: boolean;
  selectedPlanet: PlanetData | null; // For visual highlighting
  followingBody: PlanetData | null; // For camera tracking
  isFollowing: boolean;
  onPlanetClick: (p: PlanetData) => void;
  onBackgroundClick: () => void;
  onTimeUpdate: (t: number) => void;
  onFpsUpdate: (fps: number) => void;
  atmOpacity: number;
  atmPow: number;
  atmSamples: number;
  ambientLightIntensity: number;
  sunLuminosity: number;
  sunShaderEnabled: boolean;
  sunColorA: string;
  sunColorB: string;
  sunSpeed: number;
  sunNoiseScale: number;
  sunTurbulence: number;
  sunRayCount: number;
  sunSpotIntensity: number;
  sunSpotCount: number;
  sunRimPower: number;
  sunRimColor: string;
  sunCoronas: boolean;
  sunCoronaOpacity: number;
  eclipseShadowIntensity: number;
  sunFilamentScale: number;
  sunFilamentIntensity: number;
  sunSurfaceRelief: number;
  sunProminenceSize: number;
  shadowEnabled: boolean;
  shadowMapSize: number;
  shadowRadius: number;
  renderScale: number;
  starsCount: number;
  resetCameraTrigger: number;
  forcedTime?: { value: number; id: number };
  issModel: "small" | "big";
  // Star Settings
  starSize: number;
  starSizeMagShape: number;
  starBrightness: number;
  starBrightnessMagShape: number;
  starSaturation: number;
  // Post-processing
  bloomThreshold: number;
  bloomIntensity: number;
  bloomRadius: number;
  noiseOpacity: number;
  vignetteDarkness: number;
  vignetteOffset: number;
  chromaticAberrationOffset: number;
  brightness: number;
  contrast: number;
  exposure: number;
  bloomSmoothing: number;
  hue: number;
  saturation: number;
  // Hidden
  bloomMipmapBlur: boolean;
  toneMappingAdaptive: boolean;
  vignetteEskil: boolean;
  noisePremultiply: boolean;
  chromaticRadial: boolean;
  chromaticModulation: number;
  // Toggles
  enableBloom: boolean;
  enableNoise: boolean;
  enableVignette: boolean;
  enableChromaticAberration: boolean;
  enableBrightnessContrast: boolean;
  enableHueSaturation: boolean;
  enableAO: boolean;
  aoIntensity: number;
  aoRadius: number;
  aoDistanceFalloff: number;
  aoScreenSpace: boolean;

  // Gravitational Potential
  gravityVisible: boolean;
  gravityOpacity: number;
  gravityMin: number;
  gravityMax: number;
  gravityIntensityPow: number;
  gravityDirectionSat: number;
  gravityShowDirection: boolean;
  gravityPlaneSize: number;
  gravityYOffset: number;
  gravityParticlesVisible: boolean;
  gravityShowContours: boolean;
  gravityContourFreq: number;
  gravityExcludeSun: boolean;
  gravityShowEquilibrium: boolean;
  gravityEquilibriumThreshold: number;
  gravityShowEffective: boolean;

  // Volumetric Light
  volumetricEnabled: boolean;
  volumetricIntensity: number;
  volumetricSamples: number;
  volumetricDecay: number;
  volumetricScatterColor: string;
  volumetricShadowSharpness: number;
  volumetricShadowScale: number;
  volumetricMaxDistance: number;

  showConstellations: boolean;
  showCelestialGrid: boolean;
  showEarthGrid: boolean;
  gridMode: "equatorial" | "ecliptic";
  cameraMode: "equatorial" | "ecliptic";
  cameraTransitionSpeed: number;

  // Earth Graphics props
  earthTextureLOD: "low" | "med" | "high" | "ultra";
  showClouds: boolean;
  cloudSpeed: number;
  cloudOpacity: number;
  showNightLights: boolean;
  bumpScale: number;
  specularStrength: number;
  nightLightIntensity: number;
  dayIntensity: number;
  earthRotationOffset: number;
  earthTextureOffset: number;
  displacementScale: number;
  cloudRotationOffset: number;
  // Lensflare
  lensflareEnabled: boolean;
  lensflareOpacity: number;
  // Surface Target
  surfaceTarget?: {
    planetId: string;
    lat: number;
    lon: number;
    trigger: number;
  } | null;
  cameraPointTarget?: {
    point: CameraPoint;
    trigger: number;
  } | null;
  surfaceCameraAltitude: number;
  telescopeTargetId?: string | null;
  telescopeZoom?: number;
  telescopeMount?: "azimuthal" | "equatorial";
}

// Helper to calculate exact rotation of a planet
function getPlanetRotation(
  data: PlanetData,
  time: number,
  earthRotOffset: number,
  scaleFactor: number
): THREE.Quaternion {
  if (data.type === 'satellite') {
    const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
    const satelliteMinOrbitRadius = parentPlanetVisualRadius * SATELLITE_ORBIT_FACTOR;

    // Calculate current pos
    const posArr = calculateOrbitalPositionWithPeriod(
      data.elements,
      time,
      data.period,
      BASE_AU_SCALE
    );
    const currentPos = new THREE.Vector3(posArr[0], posArr[1], posArr[2]);
    const dist = currentPos.length();
    if (dist > 0) {
      currentPos.normalize().multiplyScalar(Math.max(dist, satelliteMinOrbitRadius));
    }

    // Calculate future pos
    const dt = 0.0001;
    const futurePosArr = calculateOrbitalPositionWithPeriod(
      data.elements,
      time + dt,
      data.period,
      BASE_AU_SCALE
    );
    const futureVec = new THREE.Vector3(futurePosArr[0], futurePosArr[1], futurePosArr[2]);
    const futureDist = futureVec.length();
    if (futureDist > 0) {
      futureVec.normalize().multiplyScalar(Math.max(futureDist, satelliteMinOrbitRadius));
    }

    const velocity = futureVec.sub(currentPos).normalize();
    const nadir = currentPos.clone().normalize().negate();

    const xAxis = new THREE.Vector3().copy(velocity);
    const zAxis = new THREE.Vector3().copy(nadir).negate();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    xAxis.crossVectors(yAxis, zAxis).normalize();

    const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    return new THREE.Quaternion().setFromRotationMatrix(mat);
  }

  const tiltQuat = new THREE.Quaternion();
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
    tiltQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), target);
  } else if (data.id !== "earth") {
    tiltQuat.setFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(-(data.axialTilt || 0)), 0, 0)
    );
  }

  let spinAngle = 0;
  if (data.rotationPeriod && data.rotationPeriod !== 0) {
    const initialOffset = data.rotationOffset || 0;
    spinAngle =
      ((time * 24) / data.rotationPeriod) * Math.PI * 2 + initialOffset;
    if (data.id === "earth") spinAngle += earthRotOffset;
  }
  const spinQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    spinAngle
  );

  return tiltQuat.multiply(spinQuat);
}

const SceneContentInternal: React.FC<SceneContentProps> = ({
  speed,
  paused,
  scaleFactor,
  auScale,
  showOrbits,
  showLabels,
  selectedPlanet,
  followingBody,
  isFollowing,
  onPlanetClick,
  onBackgroundClick,
  onTimeUpdate,
  onFpsUpdate,
  atmOpacity,
  atmPow,
  atmSamples,
  ambientLightIntensity,
  sunLuminosity,
  sunShaderEnabled,
  sunColorA,
  sunColorB,
  sunSpeed,
  sunNoiseScale,
  sunTurbulence,
  sunRayCount,
  sunSpotIntensity,
  sunSpotCount,
  sunRimPower,
  sunRimColor,
  sunCoronas,
  sunCoronaOpacity,
  eclipseShadowIntensity,
  sunFilamentScale,
  sunFilamentIntensity,
  sunSurfaceRelief,
  sunProminenceSize,
  shadowEnabled,
  shadowMapSize,
  shadowRadius,
  resetCameraTrigger,
  forcedTime,
  issModel,
  starSize,
  starSizeMagShape,
  starBrightness,
  starBrightnessMagShape,
  starSaturation,
  bloomThreshold,
  bloomIntensity,
  bloomRadius,
  noiseOpacity,
  vignetteDarkness,
  vignetteOffset,
  chromaticAberrationOffset,
  brightness,
  contrast,
  exposure,
  bloomSmoothing,
  hue,
  saturation,
  bloomMipmapBlur,
  toneMappingAdaptive,
  vignetteEskil,
  noisePremultiply,
  chromaticRadial,
  chromaticModulation,
  enableBloom,
  enableNoise,
  enableVignette,
  enableChromaticAberration,
  enableBrightnessContrast,
  enableHueSaturation,
  enableAO,
  aoIntensity,
  aoRadius,
  aoDistanceFalloff,
  aoScreenSpace,

  gravityVisible,
  gravityOpacity,
  gravityMin,
  gravityMax,
  gravityIntensityPow,
  gravityDirectionSat,
  gravityShowDirection,
  gravityPlaneSize,
  gravityYOffset,
  gravityParticlesVisible,
  gravityShowContours,
  gravityContourFreq,
  gravityExcludeSun,
  gravityEquilibriumThreshold,
  gravityShowEffective,
  gravityShowEquilibrium,
  volumetricEnabled,
  volumetricIntensity,
  volumetricSamples,
  volumetricDecay,
  volumetricScatterColor,
  volumetricShadowSharpness,
  volumetricShadowScale,
  volumetricMaxDistance,
  showConstellations,
  showCelestialGrid,
  showEarthGrid,
  gridMode,
  cameraMode,
  cameraTransitionSpeed,
  earthTextureLOD,
  showClouds,
  cloudSpeed,
  cloudOpacity,
  showNightLights,
  bumpScale,
  specularStrength,
  nightLightIntensity,
  dayIntensity,
  earthRotationOffset,
  earthTextureOffset,
  displacementScale,
  cloudRotationOffset,
  lensflareEnabled,
  lensflareOpacity,
  surfaceTarget,
  cameraPointTarget,
  surfaceCameraAltitude,
  telescopeTargetId,
  telescopeZoom,
  telescopeMount,
}) => {
  // Optimization: Use ref instead of state for time to avoid re-rendering Scene every frame
  const timeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const controlsRef = useRef<any>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const focusedLightRef = useRef<THREE.DirectionalLight>(null);
  const focusedLightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const { camera, scene } = useThree();

  // ... (imports)

  // ... (inside SceneContentInternal)
  const { positions, magnitudes, colorIndices } = useStarData();

  // Enable Layer 1 for camera to see focused objects
  useEffect(() => {
    camera.layers.enable(1);
  }, [camera]);

  // Add focused light target to scene
  useEffect(() => {
    scene.add(focusedLightTargetRef.current);
    return () => {
      scene.remove(focusedLightTargetRef.current);
    };
  }, [scene]);

  const prevTargetPos = useRef(new THREE.Vector3(0, 0, 0));
  // Pre-allocated vectors for camera follow loop (avoid GC pressure from per-frame allocations)
  const _targetPos = useRef(new THREE.Vector3());
  const _parentPos = useRef(new THREE.Vector3());
  const _childPos = useRef(new THREE.Vector3());
  const _telescopePos = useRef(new THREE.Vector3());
  const _deltaPos = useRef(new THREE.Vector3());

  // Helper to find any body
  const findBody = useCallback((id: string): PlanetData | null => {
    if (id === "sun") return SUN_DATA;
    for (const p of PLANETS) {
      if (p.id === id) return p;
      if (p.moons) {
        for (const m of p.moons) {
          if (m.id === id) return m;
        }
      }
    }
    return null;
  }, []);

  // Helper to get world position of any body
  const getBodyWorldPosition = useCallback((id: string, time: number, outVec: THREE.Vector3) => {
    const body = findBody(id);
    if (!body) return outVec.set(0, 0, 0);

    if (body.type === "star") {
      return outVec.set(0, 0, 0);
    } else if (body.type === "moon" || body.type === "satellite") {
      // Find parent planet
      const parent = PLANETS.find((p) => p.moons?.some((m) => m.id === body.id));
      if (parent) {
        const parentPosArray = calculateOrbitalPositionWithPeriod(parent.elements, time, parent.period, auScale);
        const childPosArray = calculateOrbitalPositionWithPeriod(body.elements, time, body.period, (body.type === "moon" || body.type === "satellite") ? BASE_AU_SCALE : auScale);

        let orbitScale = 1;
        if (body.type === "moon") {
          orbitScale = getDynamicMoonOrbitScale(
            body.elements,
            body.period,
            body.radius,
            parent.elements.semiMajorAxis,
            parent.radius || 1.0,
            auScale,
            scaleFactor,
            BASE_AU_SCALE,
            PLANET_SCALE,
            10.0
          );
        }

        const parentPos = new THREE.Vector3(parentPosArray[0], parentPosArray[1], parentPosArray[2]);
        const childPos = new THREE.Vector3(
          childPosArray[0] * orbitScale,
          childPosArray[1] * orbitScale,
          childPosArray[2] * orbitScale
        );

        if (body.type === "satellite") {
          const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
          const satelliteMinOrbitRadius = parentPlanetVisualRadius * SATELLITE_ORBIT_FACTOR;
          const distance = childPos.length();
          if (distance > 0) {
            childPos.normalize().multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
          }
        }
        return outVec.copy(parentPos).add(childPos);
      }
    } else {
      const posArray = calculateOrbitalPositionWithPeriod(body.elements, time, body.period, auScale);
      return outVec.set(posArray[0], posArray[1], posArray[2]);
    }
    return outVec.set(0, 0, 0);
  }, [findBody, scaleFactor]);

  const prevResetCam = useRef(resetCameraTrigger);

  // FPS Counters
  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(0);

  // Forced Time Update (Reset or Seek)
  const prevForcedTimeId = useRef(0);

  if (forcedTime && forcedTime.id !== prevForcedTimeId.current) {
    timeRef.current = forcedTime.value;
    onTimeUpdate(forcedTime.value);
    lastUiUpdateRef.current = 0;
    prevForcedTimeId.current = forcedTime.id;
  }

  // Reset Camera
  if (resetCameraTrigger !== prevResetCam.current) {
    if (controlsRef.current) {
      controlsRef.current.reset();
      camera.position.set(0, 50, 100);
      controlsRef.current.target.set(0, 0, 0);
      prevTargetPos.current.set(0, 0, 0);
    }
    prevResetCam.current = resetCameraTrigger;
  }

  // Priority -1: Update Time (Before everything else)
  useFrame((state, delta) => {
    // FPS Calculation
    frameCount.current++;
    const now = state.clock.getElapsedTime();
    if (now - lastFpsUpdate.current >= 0.5) {
      const fps = Math.round(
        frameCount.current / (now - lastFpsUpdate.current),
      );
      onFpsUpdate(fps);
      frameCount.current = 0;
      lastFpsUpdate.current = now;
    }

    if (!paused) {
      // Update time ref directly without state update
      timeRef.current += speed * delta;

      const nowSeconds = state.clock.getElapsedTime();
      // Throttle UI updates to ~60 FPS (~0.016s) to reduce App re-renders
      if (nowSeconds - lastUiUpdateRef.current >= 0.016) {
        onTimeUpdate(timeRef.current);
        lastUiUpdateRef.current = nowSeconds;
      }
    }

    // Update camera position store for debug panel
    const cp = state.camera.position;
    cameraPositionStore.x = cp.x;
    cameraPositionStore.y = cp.y;
    cameraPositionStore.z = cp.z;
  }, -1);

  // Priority 1: Update Camera Follow (After planets have updated)
  const transitionProgress = useRef(1); // 1 = arrived, <1 = transitioning
  const transitionStartCamPos = useRef(new THREE.Vector3());
  const transitionStartTarget = useRef(new THREE.Vector3());
  const prevFollowId = useRef<string | null>(null);
  const prevFollowRadius = useRef(1); // radius of the previously followed body

  const surfaceLock = useRef<{
    active: boolean;
    planetId: string;
    triggerId: number;
    prevQuat: THREE.Quaternion;
    prevCorePos: THREE.Vector3;
    surfaceRelCamera: THREE.Vector3; // Position of camera relative to core
  }>({
    active: false,
    planetId: "",
    triggerId: 0,
    prevQuat: new THREE.Quaternion(),
    prevCorePos: new THREE.Vector3(),
    surfaceRelCamera: new THREE.Vector3(),
  });

  const cameraPointLock = useRef<{
    active: boolean;
    planetId: string;
    triggerId: number;
    prevQuat: THREE.Quaternion;
    surfaceRelCamera: THREE.Vector3;
    fov: number;
  }>({
    active: false,
    planetId: "",
    triggerId: 0,
    prevQuat: new THREE.Quaternion(),
    surfaceRelCamera: new THREE.Vector3(),
    fov: 45,
  });

  useFrame((_, delta) => {
    // Follow Logic - Uses followingBody instead of selectedPlanet
    if (isFollowing && followingBody && controlsRef.current) {
      // Detect body change → start smooth transition
      const currentFollowId = followingBody.id;
      if (currentFollowId !== prevFollowId.current) {
        transitionProgress.current = 0;
        transitionStartCamPos.current.copy(camera.position);
        transitionStartTarget.current.copy(controlsRef.current.target);
        prevFollowId.current = currentFollowId;
        // Store previous body radius so we can scale offset for the new body
        prevFollowRadius.current = Math.max(prevFollowRadius.current, 0.01);
      }

      const targetPos = _targetPos.current.set(0, 0, 0);
      const currentTime = timeRef.current; // Read the updated time

      if (followingBody.type === "star") {
        // Sun is at origin, targetPos already (0,0,0)
      } else if (
        followingBody.type === "moon" ||
        followingBody.type === "satellite"
      ) {
        // Find parent planet for moons and satellites
        const parent = PLANETS.find((p) =>
          p.moons?.some((m) => m.id === followingBody.id),
        );
        if (parent) {
          const parentPosArray = calculateOrbitalPositionWithPeriod(
            parent.elements,
            currentTime,
            parent.period,
            auScale
          );
          const parentPos = _parentPos.current.set(
            parentPosArray[0],
            parentPosArray[1],
            parentPosArray[2],
          );

          const childPosArray = calculateOrbitalPositionWithPeriod(
            followingBody.elements,
            currentTime,
            followingBody.period,
            BASE_AU_SCALE
          );

          let orbitScale = 1;
          if (followingBody.type === "moon") {
            orbitScale = getDynamicMoonOrbitScale(
              followingBody.elements,
              followingBody.period,
              followingBody.radius,
              parent.elements.semiMajorAxis,
              parent.radius || 1.0,
              auScale,
              scaleFactor,
              BASE_AU_SCALE,
              PLANET_SCALE,
              10.0
            );
          }

          const childPos = _childPos.current.set(
            childPosArray[0] * orbitScale,
            childPosArray[1] * orbitScale,
            childPosArray[2] * orbitScale,
          );

          // For satellites, apply minimum orbit radius (same logic as Planet.tsx)
          if (followingBody.type === "satellite") {
            const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
            const satelliteMinOrbitRadius =
              parentPlanetVisualRadius * SATELLITE_ORBIT_FACTOR;
            const distance = childPos.length();
            if (distance > 0) {
              childPos
                .normalize()
                .multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
            }
          }

          targetPos.copy(parentPos).add(childPos);
        }
      } else {
        const posArray = calculateOrbitalPositionWithPeriod(
          followingBody.elements,
          currentTime,
          followingBody.period,
          auScale
        );
        targetPos.set(posArray[0], posArray[1], posArray[2]);
      }

      if (
        surfaceTarget &&
        surfaceTarget.trigger !== surfaceLock.current.triggerId
      ) {
        // Init Surface Lock
        transitionProgress.current = 1.0;

        const rad = Math.max(
          followingBody.radius * PLANET_SCALE * scaleFactor,
          0.01
        );
        const phi = (surfaceTarget.lat * Math.PI) / 180;
        const lambda = (-surfaceTarget.lon * Math.PI) / 180; // Negative to match typical left/right mapping

        const localPos = new THREE.Vector3(
          rad * Math.cos(phi) * Math.cos(lambda),
          rad * Math.sin(phi),
          rad * Math.cos(phi) * Math.sin(lambda)
        );

        const planetQuat = getPlanetRotation(
          followingBody,
          currentTime,
          earthRotationOffset,
          scaleFactor
        );

        const worldRelPos = localPos.clone().applyQuaternion(planetQuat);
        const surfaceWorldPos = targetPos.clone().add(worldRelPos);
        const surfaceWorldNormal = worldRelPos.clone().normalize();

        const altOffset = surfaceCameraAltitude * PLANET_SCALE * scaleFactor;

        // Push camera slightly above surface
        camera.position
          .copy(surfaceWorldPos)
          .add(surfaceWorldNormal.clone().multiplyScalar(altOffset));

        camera.up.copy(surfaceWorldNormal);

        let tangent = new THREE.Vector3(0, 1, 0).cross(surfaceWorldNormal);
        if (tangent.lengthSq() < 0.001)
          tangent = new THREE.Vector3(1, 0, 0).cross(surfaceWorldNormal);
        tangent.normalize();

        // Target is just straight ahead laterally
        controlsRef.current.target
          .copy(camera.position)
          .add(tangent.multiplyScalar(rad * 0.01));

        surfaceLock.current = {
          active: true,
          planetId: surfaceTarget.planetId,
          triggerId: surfaceTarget.trigger,
          prevQuat: planetQuat,
          prevCorePos: targetPos.clone(),
          surfaceRelCamera: worldRelPos.clone().add(surfaceWorldNormal.clone().multiplyScalar(altOffset))
        };

        prevTargetPos.current.copy(controlsRef.current.target);
        if (controlsRef.current) {
          controlsRef.current.enablePan = false;
          controlsRef.current.enableZoom = false;
          controlsRef.current.update();
        }
      } else if (
        cameraPointTarget &&
        cameraPointTarget.trigger !== cameraPointLock.current.triggerId
      ) {
        // Init Camera Point Lock
        transitionProgress.current = 1.0;

        const pt = cameraPointTarget.point;
        const planetQuat = getPlanetRotation(
          followingBody,
          currentTime,
          earthRotationOffset,
          scaleFactor
        );

        let worldRelPos: THREE.Vector3;
        let altOffset = 0;
        let initialUp = new THREE.Vector3(0, 1, 0).applyQuaternion(planetQuat);
        let lookTargetOffset = new THREE.Vector3();
        let useFixedTarget = false;

        if (followingBody.type === 'satellite' && pt.pos && pt.rot) {
          const localPos = new THREE.Vector3(pt.pos[0], pt.pos[1], pt.pos[2]);
          worldRelPos = localPos.clone().applyQuaternion(planetQuat);

          const localEuler = new THREE.Euler(
            pt.rot[0] * Math.PI / 180,
            pt.rot[1] * Math.PI / 180,
            pt.rot[2] * Math.PI / 180,
            'XYZ'
          );
          const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
          const combinedQuat = localQuat.clone().premultiply(planetQuat);

          initialUp = new THREE.Vector3(0, 1, 0).applyQuaternion(combinedQuat);
          lookTargetOffset = new THREE.Vector3(0, 0, -1).applyQuaternion(combinedQuat);
          useFixedTarget = true;
        } else {
          const rad = Math.max(
            followingBody.radius * PLANET_SCALE * scaleFactor,
            0.01
          );
          altOffset = pt.altitude * PLANET_SCALE * scaleFactor;

          const phi = (pt.lat * Math.PI) / 180;
          const lambda = (-pt.lon * Math.PI) / 180;

          const localPos = new THREE.Vector3(
            rad * Math.cos(phi) * Math.cos(lambda),
            rad * Math.sin(phi),
            rad * Math.cos(phi) * Math.sin(lambda)
          );

          worldRelPos = localPos.clone().applyQuaternion(planetQuat);
          const surfaceWorldNormal = worldRelPos.clone().normalize();
          worldRelPos.add(surfaceWorldNormal.clone().multiplyScalar(altOffset));
        }

        const cameraPos = targetPos.clone().add(worldRelPos);

        camera.position.copy(cameraPos);
        if (useFixedTarget) {
          controlsRef.current.target.copy(cameraPos).add(lookTargetOffset);
        } else {
          controlsRef.current.target.copy(targetPos);
        }

        camera.up.copy(initialUp).normalize();

        cameraPointLock.current = {
          active: true,
          planetId: pt.planetId,
          triggerId: cameraPointTarget.trigger,
          prevQuat: planetQuat,
          surfaceRelCamera: worldRelPos.clone(),
          fov: pt.fov,
        };

        const pCam = camera as THREE.PerspectiveCamera;
        if (pCam.fov !== pt.fov) {
          pCam.fov = pt.fov;
          pCam.updateProjectionMatrix();
        }

        prevTargetPos.current.copy(controlsRef.current.target);
        if (controlsRef.current) {
          controlsRef.current.enablePan = false;
          controlsRef.current.enableZoom = false;
          controlsRef.current.enableRotate = false; // Look at the planet from this fixed point
          controlsRef.current.update();
        }
      } else if (transitionProgress.current < 1) {
        // Smooth transition: lerp from start positions to destination
        transitionProgress.current = Math.min(
          1,
          transitionProgress.current + delta * cameraTransitionSpeed,
        );
        // Smooth easing (ease-in-out cubic: smooth start + smooth end)
        const t = transitionProgress.current;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Scale camera offset by ratio of new body radius to old body radius
        // so we don't end up inside a larger body
        const radiusRatio =
          Math.max(followingBody.radius, 0.01) / prevFollowRadius.current;
        const desiredCamOffset = _deltaPos.current
          .copy(transitionStartCamPos.current)
          .sub(transitionStartTarget.current)
          .multiplyScalar(radiusRatio);
        const desiredCamPos = _childPos.current
          .copy(targetPos)
          .add(desiredCamOffset);

        // Lerp camera and target from start to destination
        camera.position.lerpVectors(
          transitionStartCamPos.current,
          desiredCamPos,
          ease,
        );
        controlsRef.current.target.lerpVectors(
          transitionStartTarget.current,
          targetPos,
          ease,
        );
        prevTargetPos.current.copy(controlsRef.current.target);
      } else {
        // Arrived — update stored radius for next transition
        prevFollowRadius.current = followingBody.radius;

        if (
          surfaceLock.current.active &&
          surfaceLock.current.planetId === followingBody.id
        ) {
          // Locked to Surface: apply delta rotation and translation
          const planetQuat = getPlanetRotation(
            followingBody,
            currentTime,
            earthRotationOffset,
            scaleFactor
          );
          const prevQuatInv = surfaceLock.current.prevQuat.clone().invert();
          const deltaQuat = planetQuat.clone().multiply(prevQuatInv);

          // 1. Process user movement from OrbitControls
          // OrbitControls rotates the Camera around the Target.
          // Wait, we want the CAMERA to stay attached to the surface, and the TARGET to rotate around it (First Person).
          // To achieve this, we look at how the camera moved relative to the target, and reverse it!

          // Where did OrbitControls put the camera?
          const currentCamPos = camera.position.clone();
          const currentTargetPos = controlsRef.current.target.clone();

          // The vector from TARGET to CAMERA:
          const targetToCam = currentCamPos.clone().sub(currentTargetPos);

          // Apply planet's rotation to the look direction as well
          targetToCam.applyQuaternion(deltaQuat);

          // 2. Rotate our anchor point to the new frame
          surfaceLock.current.surfaceRelCamera.applyQuaternion(deltaQuat);

          // Update altitude live if slider changes
          const altOffset = surfaceCameraAltitude * PLANET_SCALE * scaleFactor;
          const rad = Math.max(
            followingBody.radius * PLANET_SCALE * scaleFactor,
            0.01
          );
          surfaceLock.current.surfaceRelCamera.normalize().multiplyScalar(rad + altOffset);

          // 3. Force Camera to the Exact Surface Position
          camera.position.copy(targetPos).add(surfaceLock.current.surfaceRelCamera);

          // Telescope Mode handling
          if (telescopeTargetId) {
            // Get accurate position of target body in world space
            getBodyWorldPosition(telescopeTargetId, currentTime, _telescopePos.current);
            controlsRef.current.target.copy(_telescopePos.current);

            // Adjust Up vector based on mount
            if (telescopeMount === "equatorial") {
              camera.up.set(0, 1, 0);
            } else {
              // Azimuthal: Up is the surface normal (which is just the normalized surfaceRelCamera)
              camera.up.copy(surfaceLock.current.surfaceRelCamera).normalize();
            }
          } else {
            // Standard first-person look-around behavior
            // 4. Force Target to be exactly opposite to how OrbitControls moved the camera
            controlsRef.current.target.copy(camera.position).sub(targetToCam);

            // 5. Rotate Up Vector
            camera.up.applyQuaternion(deltaQuat);
          }

          // Adjust FOV (Zoom) applied globally for surface mode
          const pCam = camera as THREE.PerspectiveCamera;
          if (pCam.fov !== telescopeZoom) {
            pCam.fov = telescopeZoom || 45;
            pCam.updateProjectionMatrix();
          }

          // Calculate Azimuth and Altitude for the UI
          const worldNorth = new THREE.Vector3(0, 1, 0).applyQuaternion(planetQuat);
          const up = surfaceLock.current.surfaceRelCamera.clone().normalize();
          const localNorth = worldNorth.clone().sub(up.clone().multiplyScalar(worldNorth.dot(up))).normalize();
          const localEast = localNorth.clone().cross(up).normalize();

          const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

          const altitudeRad = Math.asin(Math.max(-1, Math.min(1, lookDir.dot(up))));
          telescopeAngleStore.altitude = altitudeRad * (180 / Math.PI);

          const projLook = lookDir.clone().sub(up.clone().multiplyScalar(lookDir.dot(up))).normalize();
          const cosAz = projLook.dot(localNorth);
          const sinAz = projLook.dot(localEast);
          let azDeg = Math.atan2(sinAz, cosAz) * (180 / Math.PI);
          if (azDeg < 0) azDeg += 360;
          telescopeAngleStore.azimuth = azDeg;

          surfaceLock.current.prevQuat = planetQuat;
          surfaceLock.current.prevCorePos.copy(targetPos);

          prevTargetPos.current.copy(controlsRef.current.target);
        } else if (
          cameraPointLock.current.active &&
          cameraPointLock.current.planetId === followingBody.id
        ) {
          const planetQuat = getPlanetRotation(
            followingBody,
            currentTime,
            earthRotationOffset,
            scaleFactor
          );
          const prevQuatInv = cameraPointLock.current.prevQuat.clone().invert();
          const deltaQuat = planetQuat.clone().multiply(prevQuatInv);

          // Rotate anchor point to the new frame
          cameraPointLock.current.surfaceRelCamera.applyQuaternion(deltaQuat);

          // Force Camera to the Exact Position
          camera.position.copy(targetPos).add(cameraPointLock.current.surfaceRelCamera);

          const pt = cameraPointTarget?.point;
          if (followingBody.type === 'satellite' && pt && pt.pos && pt.rot) {
            const localEuler = new THREE.Euler(
              pt.rot[0] * Math.PI / 180,
              pt.rot[1] * Math.PI / 180,
              pt.rot[2] * Math.PI / 180,
              'XYZ'
            );
            const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
            const combinedQuat = localQuat.clone().premultiply(planetQuat);

            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(combinedQuat);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(combinedQuat);

            controlsRef.current.target.copy(camera.position).add(forward);
            camera.up.copy(up).normalize();
          } else {
            // Force Target to look at planet center
            controlsRef.current.target.copy(targetPos);

            // Force Up Vector to North pole
            const worldNorth = new THREE.Vector3(0, 1, 0).applyQuaternion(planetQuat);
            camera.up.copy(worldNorth).normalize();
          }

          // Apply FOV continuously
          const pCam = camera as THREE.PerspectiveCamera;
          if (pCam.fov !== cameraPointLock.current.fov) {
            pCam.fov = cameraPointLock.current.fov;
            pCam.updateProjectionMatrix();
          }

          cameraPointLock.current.prevQuat = planetQuat;
          prevTargetPos.current.copy(controlsRef.current.target);
        } else {
          // Break surface lock if body changed
          if (surfaceLock.current.active) {
            surfaceLock.current.active = false;
            if (controlsRef.current) {
              controlsRef.current.enablePan = true;
              controlsRef.current.enableZoom = true;
            }
            if (cameraMode === "equatorial") camera.up.set(0, 1, 0);
            else {
              const obliquity = 23.43928 * (Math.PI / 180);
              camera.up.set(0, Math.cos(obliquity), Math.sin(obliquity));
            }
            const pCam = camera as THREE.PerspectiveCamera;
            if (pCam.fov !== 45) {
              pCam.fov = 45;
              pCam.updateProjectionMatrix();
            }
          }
          if (cameraPointLock.current.active) {
            cameraPointLock.current.active = false;
            if (controlsRef.current) {
              controlsRef.current.enablePan = true;
              controlsRef.current.enableZoom = true;
              controlsRef.current.enableRotate = true;
            }
            if (cameraMode === "equatorial") camera.up.set(0, 1, 0);
            else {
              const obliquity = 23.43928 * (Math.PI / 180);
              camera.up.set(0, Math.cos(obliquity), Math.sin(obliquity));
            }
            const pCam = camera as THREE.PerspectiveCamera;
            if (pCam.fov !== 45) {
              pCam.fov = 45;
              pCam.updateProjectionMatrix();
            }
          }
          // Normal follow: maintain relative offset securely
          controlsRef.current.target.copy(targetPos);
          const deltaPos = _deltaPos.current
            .copy(targetPos)
            .sub(prevTargetPos.current);
          camera.position.add(deltaPos);
          prevTargetPos.current.copy(targetPos);
        }
      }

      // Update Focused Light
      if (focusedLightRef.current) {
        // Target is the object being followed
        focusedLightTargetRef.current.position.copy(targetPos);
        focusedLightRef.current.target = focusedLightTargetRef.current;

        // Light position: Toward the Sun (0,0,0)
        const toSun = _deltaPos.current.copy(targetPos).negate().normalize();
        const distance = 10 * PLANET_SCALE * scaleFactor;
        focusedLightRef.current.position
          .copy(targetPos)
          .add(toSun.multiplyScalar(distance));
        focusedLightRef.current.updateMatrixWorld();
      }
    } else {
      if (surfaceLock.current.active) {
        surfaceLock.current.active = false;
        if (controlsRef.current) {
          controlsRef.current.enablePan = true;
          controlsRef.current.enableZoom = true;
        }
        if (cameraMode === "equatorial") camera.up.set(0, 1, 0);
        else {
          const obliquity = 23.43928 * (Math.PI / 180);
          camera.up.set(0, Math.cos(obliquity), Math.sin(obliquity));
        }
        const pCam = camera as THREE.PerspectiveCamera;
        if (pCam.fov !== 45) {
          pCam.fov = 45;
          pCam.updateProjectionMatrix();
        }
      }
      if (controlsRef.current) {
        prevTargetPos.current.copy(controlsRef.current.target);
      }
      prevFollowId.current = null;
    }
  }, 1);

  // Calculate Omega (angular velocity) if showing Effective Potential
  const omega = useMemo(() => {
    if (!gravityShowEffective) return 0.0;

    // Find focused body
    const focusedBody = selectedPlanet || followingBody;
    if (!focusedBody) return 0.0;

    // We need the distance of the focused body to the Sun (0,0,0)
    // Since we don't have the realtime vector here easily without subs,
    // We use the semi-major axis (distance in AU) from the elements.
    // This assumes circular orbit for the "Rotating Frame" approximation.
    const distanceAU = focusedBody.elements?.semiMajorAxis; // In AU
    if (!distanceAU || distanceAU === 0) return 0.0;

    // Calculate distance in World Units
    const r = distanceAU * auScale;

    // Calculate Mass of Sun in Simulation Units
    // We MUST match the logic in GravitationalPotential.tsx exactly.
    // There, M_sun_base = 0.0002959122082855911 (Gaussian Gravitational Constant squared, k^2)
    // And MASS_SCALE = 2500.0 * auScale
    // So M_shader = M_sun_base * MASS_SCALE
    const k2 = 0.0002959122082855911;
    const MASS_SCALE = 2500.0 * auScale;
    const M_shader = k2 * MASS_SCALE;

    // omega = sqrt(GM / r^3) -> Here G is folded into M_shader
    const omegaVal = Math.sqrt(M_shader / Math.pow(r, 3));

    return omegaVal;
  }, [gravityShowEffective, selectedPlanet, followingBody]);

  // Handle Camera Up Alignment (Equatorial vs Ecliptic)
  useEffect(() => {
    if (cameraMode === "equatorial") {
      // Y-Up (Celestial North)
      camera.up.set(0, 1, 0);
    } else {
      // Ecliptic Up (Orbital North)
      // Pole is (0, cosE, sinE) in Equatorial Frame
      const obliquity = 23.43928 * (Math.PI / 180);
      const y = Math.cos(obliquity);
      const z = Math.sin(obliquity);
      camera.up.set(0, y, z);
    }
    camera.updateProjectionMatrix();

    // Force update controls to respect new Up vector
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  }, [cameraMode, camera]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        minDistance={0.0001}
        maxDistance={10000}
        enablePan={true}
        dampingFactor={0.05}
      />
      <KeyboardCameraController controlsRef={controlsRef} />
      <RealStars
        positions={positions}
        magnitudes={magnitudes}
        colorIndices={colorIndices}
        starSize={starSize}
        starSizeMagShape={starSizeMagShape}
        starBrightness={starBrightness}
        starBrightnessMagShape={starBrightnessMagShape}
        starSaturation={starSaturation}
      />
      <Constellations
        positions={positions}
        visible={showConstellations}
        opacity={0.3}
      />
      <CelestialGrid
        visible={showCelestialGrid}
        mode={gridMode}
        opacity={0.15}
        radius={50000} // Match star scale
      />

      <Sun
        ref={sunRef}
        scaleFactor={scaleFactor}
        luminosity={sunLuminosity}
        sunShaderEnabled={sunShaderEnabled}
        sunColorA={sunColorA}
        sunColorB={sunColorB}
        sunSpeed={sunSpeed}
        sunNoiseScale={sunNoiseScale}
        sunTurbulence={sunTurbulence}
        sunRayCount={sunRayCount}
        sunSpotIntensity={sunSpotIntensity}
        sunSpotCount={sunSpotCount}
        sunRimPower={sunRimPower}
        sunRimColor={sunRimColor}
        sunCoronas={sunCoronas}
        sunCoronaOpacity={sunCoronaOpacity}
        sunFilamentScale={sunFilamentScale}
        sunFilamentIntensity={sunFilamentIntensity}
        sunSurfaceRelief={sunSurfaceRelief}
        sunProminenceSize={sunProminenceSize}
        shadowEnabled={shadowEnabled}
        shadowMapSize={shadowMapSize}
        shadowRadius={shadowRadius}
        lensflareEnabled={lensflareEnabled}
        lensflareOpacity={lensflareOpacity}
      />

      {/* Focused Light for crisp shadows on followed object */}
      {isFollowing && followingBody && (
        <directionalLight
          ref={focusedLightRef}
          intensity={sunLuminosity * 2} // Boost intensity slightly as it replaces the point light
          castShadow
          layers={[1]} // Only affect Layer 1
          shadow-bias={-0.00001} // Tuned bias for directional light (smaller for smaller scale)
          shadow-mapSize={[4096, 4096]} // Increase resolution
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-0.05, 0.05, 0.05, -0.05, 0.01, 10]}
          />
        </directionalLight>
      )}

      <ambientLight intensity={ambientLightIntensity} />

      <GravitationalPotential
        visible={gravityVisible}
        opacity={gravityOpacity}
        minStrength={gravityMin}
        maxStrength={gravityMax}
        intensityPow={gravityIntensityPow}
        directionSat={gravityDirectionSat}
        showDirection={gravityShowDirection}
        planeSize={gravityPlaneSize}
        yOffset={gravityYOffset}
        timeRef={timeRef}
        scaleFactor={scaleFactor}
        auScale={auScale}
        focusBodyId={selectedPlanet?.id || followingBody?.id || null}
        showContours={gravityShowContours}
        contourFreq={gravityContourFreq}
        excludeSun={gravityExcludeSun}
        showEquilibrium={gravityShowEquilibrium}
        equilibriumThreshold={gravityEquilibriumThreshold}
        showEffective={gravityShowEffective}
        omega={omega}
      />

      <GravityParticles
        visible={gravityParticlesVisible}
        timeRef={timeRef}
        speed={speed}
        paused={paused}
        auScale={auScale}
      />

      <VolumetricLight
        visible={volumetricEnabled}
        intensity={volumetricIntensity}
        samples={volumetricSamples}
        decay={volumetricDecay}
        scatterColor={volumetricScatterColor}
        shadowSharpness={volumetricShadowSharpness}
        shadowScale={volumetricShadowScale}
        maxDistance={volumetricMaxDistance}
        timeRef={timeRef}
        scaleFactor={scaleFactor}
        auScale={auScale}
      />

      {PLANETS.map((planet) => (
        <Planet
          key={planet.id}
          data={planet}
          timeRef={timeRef}
          isSelected={selectedPlanet?.id === planet.id}
          onSelect={onPlanetClick}
          showOrbit={showOrbits}
          showLabel={showLabels}
          scaleFactor={scaleFactor}
          auScale={auScale}
          atmOpacity={atmOpacity}
          atmPow={atmPow}
          atmSamples={atmSamples}
          issModel={issModel}
          focusedBodyId={isFollowing && followingBody ? followingBody.id : null}
          showEarthGrid={showEarthGrid}
          // Earth Graphics
          earthTextureLOD={earthTextureLOD}
          showClouds={showClouds}
          cloudSpeed={cloudSpeed}
          cloudOpacity={cloudOpacity}
          showNightLights={showNightLights}
          bumpScale={bumpScale}
          specularStrength={specularStrength}
          nightLightIntensity={nightLightIntensity}
          dayIntensity={dayIntensity}
          earthRotationOffset={earthRotationOffset}
          earthTextureOffset={earthTextureOffset}
          displacementScale={displacementScale}
          cloudRotationOffset={cloudRotationOffset}
          eclipseShadowIntensity={eclipseShadowIntensity}
        />
      ))}

      <EffectComposer depthBuffer={true} multisampling={0}>
        {enableAO && (
          <N8AO
            aoRadius={aoRadius}
            distanceFalloff={aoDistanceFalloff}
            intensity={aoIntensity}
            screenSpaceRadius={aoScreenSpace}
            quality="performance"
            halfRes
          />
        )}
        <SMAA />
        {enableBloom && (
          <Bloom
            luminanceThreshold={bloomThreshold}
            mipmapBlur={bloomMipmapBlur}
            intensity={bloomIntensity}
            radius={bloomRadius}
            luminanceSmoothing={bloomSmoothing}
          />
        )}
        <ToneMapping adaptive={toneMappingAdaptive} />
        {enableVignette && (
          <Vignette
            eskil={vignetteEskil}
            offset={vignetteOffset}
            darkness={vignetteDarkness}
          />
        )}
        {enableNoise && (
          <Noise opacity={noiseOpacity} premultiply={noisePremultiply} />
        )}
        {enableChromaticAberration && (
          <ChromaticAberration
            offset={
              new THREE.Vector2(
                chromaticAberrationOffset,
                chromaticAberrationOffset,
              )
            }
            radialModulation={chromaticRadial}
            modulationOffset={chromaticModulation}
          />
        )}
        {enableBrightnessContrast && (
          <BrightnessContrast brightness={brightness} contrast={contrast} />
        )}
        {enableHueSaturation && (
          <HueSaturation hue={hue} saturation={saturation} />
        )}
      </EffectComposer>
    </>
  );
};

const Scene: React.FC<SceneContentProps> = React.memo((props) => {
  return (
    <Canvas
      shadows={props.shadowEnabled ? { type: THREE.PCFShadowMap } : false}
      camera={{ position: [0, 50, 100], fov: 45, near: 0.0001, far: 1000000 }}
      dpr={props.renderScale}
      gl={{
        antialias: false,
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: props.exposure,
        powerPreference: "high-performance",
      }}
      onPointerMissed={props.onBackgroundClick}
    >
      <Suspense fallback={null}>
        <SceneContentInternal {...props} />
      </Suspense>
    </Canvas>
  );
});

export default Scene;
