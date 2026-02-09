import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PlanetData } from "../../types";
import { calculateOrbitalPositionWithPeriod } from "../../utils/physics";
import {
  planetLodStore,
  planetCullingStore,
  planetPositionStore,
} from "./stores";

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
}: UsePlanetFrameParams) {
  const { camera } = useThree();
  const isInsideAtmosphereRef = useRef(false);
  const isVisibleRef = useRef(true);

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
      }
    }

    if (useMoonShader && meshRef.current && moonMaterialRef.current) {
      const u = moonMaterialRef.current.uniforms;

      tempSun.set(0, 0, 0);
      meshRef.current.worldToLocal(tempSun);
      u.sunDirection.value.copy(tempSun).normalize();

      tempVec.copy(camera.position);
      meshRef.current.worldToLocal(tempVec);
      u.localCameraPos.value.copy(tempVec);

      u.dayIntensity.value = dayIntensity;
      u.bumpScale.value = bumpScale;
      u.displacementScale.value = displacementScale;
    }
  });

  return { isVisibleRef };
}
