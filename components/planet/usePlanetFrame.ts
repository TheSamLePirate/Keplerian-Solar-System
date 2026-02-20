import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PlanetData } from "../../types";
import { calculateOrbitalPositionWithPeriod, getDynamicMoonOrbitScale } from "../../utils/physics";
import {
  planetLodStore,
  planetCullingStore,
  planetPositionStore,
} from "./stores";
import { PLANETS, SUN_DATA, PLANET_SCALE, MOON_ORBIT_SCALE, BASE_AU_SCALE } from "../../constants";

interface UsePlanetFrameParams {
  data: PlanetData;
  timeRef: React.MutableRefObject<number>;
  groupRef: React.RefObject<THREE.Group | null>;
  tiltGroupRef: React.RefObject<THREE.Group | null>;
  meshRef: React.RefObject<THREE.Mesh | null>;
  earthMeshRef: React.RefObject<THREE.Mesh | null>;
  atmMaterialRef: React.RefObject<THREE.ShaderMaterial | null>;
  atmMeshRef: React.RefObject<THREE.Mesh | null>;
  earthMaterialRef: React.RefObject<THREE.ShaderMaterial | null>;
  moonMaterialRef: React.RefObject<THREE.ShaderMaterial | null>;
  jupiterMaterialRef: React.RefObject<THREE.ShaderMaterial | null>;
  issGroupRef: React.RefObject<THREE.Group | null>;
  // Derived values
  size: number;
  atmRadius: number;
  visualOrbitScale: number;
  satelliteMinOrbitRadius: number;
  isSatellite: boolean;
  isEarth: boolean;
  useMoonShader: boolean;
  hasAtmosphere: boolean;
  // Settings
  atmOpacity: number;
  atmPow: number;
  atmSamples: number;
  earthRotationOffset: number;
  cloudSpeed: number;
  cloudRotationOffset: number;
  cloudOpacity: number;
  showClouds: boolean;
  showNightLights: boolean;
  bumpScale: number;
  specularStrength: number;
  nightLightIntensity: number;
  dayIntensity: number;
  earthTextureOffset: number;
  displacementScale: number;
  earthUniforms: Record<string, { value: unknown }>;
  jupiterUniforms: Record<string, { value: unknown }>;
  eclipseShadowIntensity: number;
  scaleFactor: number;
  auScale: number;
  parentId?: string;
  parentRadius?: number;
}

export function usePlanetFrame({
  data,
  timeRef,
  groupRef,
  tiltGroupRef,
  meshRef,
  earthMeshRef,
  atmMaterialRef,
  atmMeshRef,
  earthMaterialRef,
  moonMaterialRef,
  jupiterMaterialRef,
  issGroupRef,
  size,
  atmRadius,
  visualOrbitScale,
  satelliteMinOrbitRadius,
  isSatellite,
  isEarth,
  useMoonShader,
  hasAtmosphere,
  atmOpacity,
  atmPow,
  atmSamples,
  earthRotationOffset,
  cloudSpeed,
  cloudRotationOffset,
  cloudOpacity,
  showClouds,
  showNightLights,
  bumpScale,
  specularStrength,
  nightLightIntensity,
  dayIntensity,
  earthTextureOffset,
  displacementScale,
  earthUniforms,
  jupiterUniforms,
  eclipseShadowIntensity,
  scaleFactor,
  auScale,
  parentId,
  parentRadius,
}: UsePlanetFrameParams) {
  const { camera } = useThree();
  const isInsideAtmosphereRef = useRef(false);
  const isVisibleRef = useRef(true);
  const auScaleRef = useRef(auScale);

  useEffect(() => {
    auScaleRef.current = auScale;
  }, [auScale]);

  // Pre-allocate vectors
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tempSun = useMemo(() => new THREE.Vector3(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempXAxis = useMemo(() => new THREE.Vector3(), []);
  const tempYAxis = useMemo(() => new THREE.Vector3(), []);
  const tempZAxis = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);

  // Frustum culling pre-allocated objects
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const boundingSphere = useMemo(() => new THREE.Sphere(), []);
  const currentPosVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const time = timeRef.current;

    // 1. Calculate Orbit Position
    const pos = calculateOrbitalPositionWithPeriod(
      data.elements,
      time,
      data.period,
      (isSatellite || useMoonShader) ? BASE_AU_SCALE : auScaleRef.current
    );
    const currentPos = currentPosVec.set(
      pos[0] * visualOrbitScale,
      pos[1] * visualOrbitScale,
      pos[2] * visualOrbitScale,
    );

    if (isSatellite) {
      const distance = currentPos.length();
      if (distance > 0) {
        currentPos
          .normalize()
          .multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
      }
    }

    if (groupRef.current) {
      groupRef.current.position.copy(currentPos);
      groupRef.current.updateMatrixWorld(true);
    }

    // Frustum Culling
    const visibleRadius = data.ringOuterRadius
      ? size * data.ringOuterRadius
      : hasAtmosphere
        ? atmRadius
        : size;

    projScreenMatrix.multiplyMatrices(
      state.camera.projectionMatrix,
      state.camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    if (groupRef.current) {
      groupRef.current.getWorldPosition(boundingSphere.center);
    } else {
      boundingSphere.center.copy(currentPos);
    }
    boundingSphere.radius = visibleRadius * 1.5;

    const onScreen = frustum.intersectsSphere(boundingSphere);
    isVisibleRef.current = onScreen;

    planetCullingStore.set(data.id, onScreen);

    const c = boundingSphere.center;
    planetPositionStore.set(data.id, { x: c.x, y: c.y, z: c.z });

    if (tiltGroupRef.current) {
      tiltGroupRef.current.visible = onScreen;
    }

    if (!onScreen) return;

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
        (isSatellite || useMoonShader) ? BASE_AU_SCALE : auScaleRef.current
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

      tempSun.set(0, 0, 0);
      earthMeshRef.current.worldToLocal(tempSun);
      u.sunDirection.value.copy(tempSun).normalize();

      u.cloudTime.value = time * cloudSpeed * 100.0;
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
        tempVec.copy(camera.position);
        earthMeshRef.current.worldToLocal(tempVec);
        u.localCameraPos.value.copy(tempVec);

        // Eclipse Logic
        u.dayIntensity.value = dayIntensity;
        u.bumpScale.value = bumpScale;
        u.displacementScale.value = displacementScale;

        // Always update Eclipse Geometry (Positions/Radii) for Debug Line usage

        // CRITICAL: Ensure the Earth's World Matrix is updated with the latest rotation
        // calculated above (lines 120+) BEFORE transforming world coords to local.
        // Otherwise, we use the previous frame's matrix, causing the shadow to drift/lag
        // relative to the spinning texture.
        if (earthMeshRef.current) {
          earthMeshRef.current.updateMatrixWorld();
        }

        // 1. Sun Position in Local Space
        tempSun.set(0, 0, 0);
        earthMeshRef.current.worldToLocal(tempSun);
        u.eclipseSunPos.value.copy(tempSun);

        // CRITICAL FIX: Update Sun Direction for Day/Night Cycle Shader
        // This ensures the visual "Day Side" matches the geometric Sun position
        if (earthUniforms.sunDirection) {
          (earthUniforms.sunDirection.value as THREE.Vector3).copy(tempSun).normalize();
        }

        // 2. Sun Radius (Visual)
        // Hardcoded '10' matches Sun.tsx
        const derivedScaleFactor = size / ((data.radius || 1) * PLANET_SCALE);
        u.eclipseSunRadius.value = 10.0 * PLANET_SCALE * derivedScaleFactor;


        // 3. Identify Moons
        let relevantMoons: PlanetData[] = [];
        if (data.id === 'earth') {
          const moon = PLANETS.find(p => p.id === 'earth')?.moons?.find(m => m.id === 'moon');
          if (moon) relevantMoons.push(moon);
        } else if (data.moons) {
          data.moons.forEach(m => {
            if (m.type === 'moon') relevantMoons.push(m);
          });
        }

        if (relevantMoons.length > 4) relevantMoons = relevantMoons.slice(0, 4);
        u.numEclipseMoons.value = relevantMoons.length;

        // 4. Calculate Moon Positions & Radii
        const moonPosArray = u.eclipseMoons.value as THREE.Vector3[];
        const moonRadiiArray = u.eclipseMoonRadii.value as number[];

        relevantMoons.forEach((moon, index) => {
          const moonOrbitPos = calculateOrbitalPositionWithPeriod(
            moon.elements,
            time,
            moon.period,
            BASE_AU_SCALE
          );

          // Apply Visual Scales (dynamic to cover sun perfectly)
          const moonVisualScale = getDynamicMoonOrbitScale(
            moon.elements,
            moon.period,
            moon.radius,
            data.elements.semiMajorAxis,
            data.radius || 1.0,
            auScale,
            scaleFactor,
            BASE_AU_SCALE,
            PLANET_SCALE,
            10.0
          );

          tempVec.set(moonOrbitPos[0], moonOrbitPos[1], moonOrbitPos[2]).multiplyScalar(moonVisualScale);

          if (groupRef.current) {
            groupRef.current.getWorldPosition(tempSun); // Earth World Pos
            tempVec.add(tempSun); // Moon World Pos
            earthMeshRef.current.worldToLocal(tempVec); // Moon Local Pos
            moonPosArray[index].copy(tempVec);

            // Radius (Visual)
            // Just the radius of the moon mesh.
            moonRadiiArray[index] = moon.radius * PLANET_SCALE * derivedScaleFactor;
          }
        });

        u.eclipseShadowIntensity.value = eclipseShadowIntensity;

      }
    }

    // 6. Update Jupiter Shader Uniforms
    if (data.id === 'jupiter' && jupiterMaterialRef.current && meshRef.current) {
      const u = jupiterMaterialRef.current.uniforms;

      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.sunDirection.value.copy(tempSun).normalize();

      tempVec.copy(camera.position);
      meshRef.current.worldToLocal(tempVec);
      u.localCameraPos.value.copy(tempVec);

      u.dayIntensity.value = dayIntensity;
      u.bumpScale.value = 0.0;
      u.displacementScale.value = 0.0;
      u.eclipseShadowIntensity.value = eclipseShadowIntensity;

      // 1. Sun Position in Local Space
      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.eclipseSunPos.value.copy(tempSun);

      // 2. Sun Radius (Visual)
      const derivedScaleFactor = size / ((data.radius || 1) * PLANET_SCALE);
      // Using same factor as Earth for consistency, though Jupiter is further
      u.eclipseSunRadius.value = 10.0 * PLANET_SCALE * derivedScaleFactor;

      // 3. Identify Moons
      let relevantMoons: PlanetData[] = [];
      if (data.moons) {
        data.moons.forEach(m => {
          if (m.type === 'moon') relevantMoons.push(m);
        });
      }
      if (relevantMoons.length > 4) relevantMoons = relevantMoons.slice(0, 4);
      u.numEclipseMoons.value = relevantMoons.length;

      // 4. Calculate Moon Positions & Radii
      const moonPosArray = u.eclipseMoons.value as THREE.Vector3[];
      const moonRadiiArray = u.eclipseMoonRadii.value as number[];

      relevantMoons.forEach((moon, index) => {
        const moonOrbitPos = calculateOrbitalPositionWithPeriod(
          moon.elements,
          time,
          moon.period,
          BASE_AU_SCALE
        );

        const moonVisualScale = getDynamicMoonOrbitScale(
          moon.elements,
          moon.period,
          moon.radius,
          data.elements.semiMajorAxis,
          data.radius || 1.0,
          auScale,
          scaleFactor,
          BASE_AU_SCALE,
          PLANET_SCALE,
          10.0
        );
        tempVec.set(moonOrbitPos[0], moonOrbitPos[1], moonOrbitPos[2]).multiplyScalar(moonVisualScale);

        if (groupRef.current) {
          groupRef.current.getWorldPosition(tempSun); // Jupiter World Pos
          tempVec.add(tempSun); // Moon World Pos
          meshRef.current.worldToLocal(tempVec); // Moon Local Pos
          moonPosArray[index].copy(tempVec);

          moonRadiiArray[index] = moon.radius * PLANET_SCALE * derivedScaleFactor;
        }
      });
    }


    // 7. Update Moon Shader Uniforms (Generic for Moon and Jupiter's Moons)
    if (useMoonShader && meshRef.current && moonMaterialRef.current) {
      const u = moonMaterialRef.current.uniforms;

      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.sunDirection.value.copy(tempSun).normalize();

      tempVec.copy(camera.position);
      meshRef.current.worldToLocal(tempVec);
      u.localCameraPos.value.copy(tempVec);

      u.dayIntensity.value = dayIntensity;

      // Decouple Jupiter moons from Earth displacement settings if they lack maps.
      if (parentId === 'jupiter') {
        u.bumpScale.value = data.normalMapUrl ? bumpScale : 0.0;
        u.displacementScale.value = data.displacementMapUrl ? displacementScale : 0.0;
      } else {
        u.bumpScale.value = bumpScale;
        u.displacementScale.value = displacementScale;
      }

      u.eclipseShadowIntensity.value = eclipseShadowIntensity;

      // 1. Sun Position in Local Space
      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.eclipseSunPos.value.copy(tempSun);

      u.eclipseShadowIntensity.value = eclipseShadowIntensity;

      // 1. Sun Position in Local Space
      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.eclipseSunPos.value.copy(tempSun);

      // 2. Generic Occluder Logic (Parent Planet)
      if (parentId && groupRef.current && groupRef.current.parent) {
        const parentGroup = groupRef.current.parent;

        // Debug: Check if parent exists
        // console.log("Moon Parent:", parentId);

        tempVec.set(0, 0, 0);
        parentGroup.localToWorld(tempVec); // Parent World Pos (Center of Parent)
        meshRef.current.worldToLocal(tempVec); // Parent Pos in Moon Local Space

        const moonPosArray = u.eclipseMoons.value as THREE.Vector3[];
        const moonRadiiArray = u.eclipseMoonRadii.value as number[];

        moonPosArray[0].copy(tempVec);

        // Calculate Parent Radius (Visual)
        // parentRadius prop is the raw radius (e.g. 1.0 for Earth, 11.2 for Jupiter)
        // We need to scale it exactly like the moon size is scaled.
        // size = data.radius * PLANET_SCALE * scaleFactor
        // parentVisualRadius = parentRadius * PLANET_SCALE * scaleFactor
        const pRadius = parentRadius || 1.0;
        moonRadiiArray[0] = pRadius * PLANET_SCALE * scaleFactor;

        u.numEclipseMoons.value = 1;

        // Sun Radius
        // Using same derived factor for consistency
        const derivedScaleFactor = size / ((data.radius || 1) * PLANET_SCALE);
        u.eclipseSunRadius.value = 10.0 * PLANET_SCALE * derivedScaleFactor;

      } else {
        // Fallback or No Parent (should not happen for moons if setup correctly)
        u.numEclipseMoons.value = 0;
      }
    }
  });

  return { isVisibleRef };
}
