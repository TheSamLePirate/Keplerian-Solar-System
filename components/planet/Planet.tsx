import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { calculateOrbitalPositionWithPeriod, getDynamicMoonOrbitScale } from "../../utils/physics";
import { PLANETS, PLANET_SCALE, MOON_ORBIT_SCALE, SATELLITE_ORBIT_FACTOR, BASE_AU_SCALE } from "../../constants";
import ISSModel from "../ISS";
import { PlanetProps } from "./PlanetProps";
import { AtmosphereMaterial, EarthMaterial, MoonMaterial, JupiterMaterial } from "./shaders";
import { dummyTexture, dummyCube } from "./textures";
import { useTextureLoader } from "./useTextureLoader";
import { usePlanetFrame } from "./usePlanetFrame";
// 1. Updated Component with Green Marker
const EclipseDebugLine = ({ sunPos, moonPos, active, planetSize }: { sunPos: THREE.Vector3; moonPos: THREE.Vector3; active: boolean; planetSize: number }) => {
  const lineRef = useRef<any>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const points = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);

  useFrame(() => {
    // 1. Line Update
    if (lineRef.current) {
      const dist = sunPos.distanceTo(moonPos);
      if (dist < 0.1) {
        lineRef.current.visible = false;
        if (markerRef.current) markerRef.current.visible = false;
      } else {
        lineRef.current.visible = true;
        points[0].copy(sunPos); // Sun
        points[1].copy(moonPos); // Moon

        const dir = new THREE.Vector3().subVectors(moonPos, sunPos).normalize();

        // Extend past Moon to Earth
        // Approximate distance to Earth center is length(moonPos) roughly, or just push it far enough
        const rayEnd = dir.clone().multiplyScalar(planetSize * 30);
        points[2].copy(moonPos).add(rayEnd);

        if (lineRef.current.geometry) {
          lineRef.current.geometry.setFromPoints(points);
        }

        // 2. Intersection (Green Marker)
        // Ray: Origin = MoonPos, Dir = dir
        // Sphere: Center = (0,0,0) (Local Earth), Radius = planetSize

        // Analytic Ray-Sphere Intersection
        // P = O + t*D
        // |P|² = R²
        // |O + t*D|² = R²
        // (O+tD).(O+tD) = R²
        // O.O + 2t(O.D) + t²(D.D) = R²
        // t² + 2t(O.D) + (O.O - R²) = 0

        const O = moonPos;
        const D = dir;
        const R = planetSize;

        const a = 1.0; // D is normalized
        const b = 2.0 * O.dot(D);
        const c = O.dot(O) - R * R;

        const delta = b * b - 4.0 * a * c;

        if (delta >= 0 && markerRef.current) {
          const t1 = (-b - Math.sqrt(delta)) / (2.0 * a);
          const t2 = (-b + Math.sqrt(delta)) / (2.0 * a);

          // We want the closest positive t (intersection in front)
          // But Moon is likely *outside* Earth (t > 0).
          // The intersection *behind* the moon (towards Earth) is what we want.
          // Since Ray is Sun->Moon, and Earth is further, t should be positive.

          let t = -1.0;
          if (t1 > 0) t = t1;
          if (t2 > 0 && (t < 0 || t2 < t1)) t = t2;

          if (t > 0) {
            markerRef.current.visible = true;
            markerRef.current.position.copy(O).add(D.multiplyScalar(t));
            // Push slightly out to avoid z-fighting
            markerRef.current.position.setLength(planetSize * 1.01);
          } else {
            markerRef.current.visible = false;
          }
        } else if (markerRef.current) {
          markerRef.current.visible = false;
        }
      }
    }
  });

  return (
    <group renderOrder={999}>
      <line ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="red" linewidth={2} transparent opacity={1.0} depthTest={false} />
      </line>
      <mesh ref={markerRef}>
        <sphereGeometry args={[planetSize * 0.05, 16, 16]} />
        <meshBasicMaterial color="#00ff00" depthTest={false} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const Planet: React.FC<PlanetProps> = ({
  data,
  timeRef,
  isSelected,
  onSelect,
  showOrbit,
  showLabel,
  scaleFactor,
  auScale,
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
  eclipseShadowIntensity = 0.0,
  onPlanetClick,
  parentId,
  parentRadius,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const issGroupRef = useRef<THREE.Group>(null);
  const atmMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const moonMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const jupiterMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const atmMeshRef = useRef<THREE.Mesh>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  const isFocused = data.id === focusedBodyId;

  // Constants
  const isMoon = data.type === "moon";
  const useMoonShader = data.id === "moon" || (parentId === 'jupiter' && isMoon);
  const isJupiter = data.id === "jupiter";
  const isSatellite = data.type === "satellite";

  const visualOrbitScale = useMemo(() => {
    if (isMoon && parentId) {
      const parent = PLANETS.find(p => p.id === parentId);
      if (parent) {
        return getDynamicMoonOrbitScale(
          data.elements,
          data.period,
          data.radius,
          parent.elements.semiMajorAxis,
          parent.radius || 1.0,
          auScale,
          scaleFactor,
          BASE_AU_SCALE,
          PLANET_SCALE,
          10.0
        );
      }
    }
    return isMoon ? MOON_ORBIT_SCALE * scaleFactor : 1;
  }, [isMoon, parentId, data, auScale, scaleFactor]);

  const hasAtmosphere = !!data.atmosphereColor;
  const isEarth = data.id === "earth";

  const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
  const satelliteMinOrbitRadius = parentPlanetVisualRadius * SATELLITE_ORBIT_FACTOR;

  const size = data.radius * PLANET_SCALE * scaleFactor;
  const atmRadius = size * 1.25;

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

  // Enforce occlusion for lens flares
  React.useEffect(() => {
    if (earthMeshRef.current) earthMeshRef.current.userData.isOccluder = true;
    if (meshRef.current) meshRef.current.userData.isOccluder = true;
    if (moonMaterialRef.current && meshRef.current) meshRef.current.userData.isOccluder = true;
  }, []); // Run once on mount


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
        (isMoon || isSatellite) ? BASE_AU_SCALE : auScale
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
  }, [data, visualOrbitScale, isSatellite, satelliteMinOrbitRadius, auScale]);

  // Initialize Atmosphere Uniforms ONCE
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
        eclipseShadowIntensity: { value: eclipseShadowIntensity },
        eclipseSunPos: { value: new THREE.Vector3() },
        eclipseSunRadius: { value: 696340 }, // km, default
        eclipseMoons: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        eclipseMoonRadii: { value: [0, 0, 0, 0] },
        numEclipseMoons: { value: 0 },
      },
    ]);
  }, []);

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
        eclipseShadowIntensity: { value: eclipseShadowIntensity },
        eclipseSunPos: { value: new THREE.Vector3() },
        eclipseSunRadius: { value: 696340 },
        eclipseMoons: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        eclipseMoonRadii: { value: [0, 0, 0, 0] },
        numEclipseMoons: { value: 0 },
      },
    ]);
  }, []);

  // Jupiter Uniforms
  const jupiterUniforms = useMemo(() => {
    return THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        map: { value: dummyTexture },
        normalMap: { value: dummyTexture },
        displacementMap: { value: dummyTexture }, // Not used but good for compatibility if we add it later
        displacementScale: { value: 0 },
        sunDirection: { value: new THREE.Vector3() },
        localCameraPos: { value: new THREE.Vector3() },
        bumpScale: { value: bumpScale },
        dayIntensity: { value: dayIntensity },
        eclipseShadowIntensity: { value: eclipseShadowIntensity },
        eclipseSunPos: { value: new THREE.Vector3() },
        eclipseSunRadius: { value: 696340 },
        eclipseMoons: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        eclipseMoonRadii: { value: [0, 0, 0, 0] },
        numEclipseMoons: { value: 0 },
      },
    ]);
  }, []);

  // Texture Loading Hook
  const { loadedTextures } = useTextureLoader({
    data,
    earthTextureLOD,
    earthUniforms,
    moonMaterialRef,
    jupiterMaterialRef,
    bumpScale,
    displacementScale,
    dayIntensity,
  });

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
        const lon = i * 15 - 180;
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

  // useFrame hook
  usePlanetFrame({
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
    // In Equatorial Frame, Earth's axis is the reference (Y-Up).
    // So we should NOT tilt Earth, the orbit is what is tilted.
    if (data.id === 'earth') {
      return new THREE.Quaternion(); // Identity
    }

    return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(-(data.axialTilt || 0)), 0, 0),
    );
  }, [data.axialTilt, data.poleDirection, data.id]);

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
        <group ref={tiltGroupRef} quaternion={tiltQuaternion}>
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
                userData={{ isOccluder: true }}
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
              castShadow={eclipseShadowIntensity <= 0}
              receiveShadow={eclipseShadowIntensity <= 0}
              renderOrder={1}
              userData={{ isOccluder: true }}
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
              castShadow={eclipseShadowIntensity <= 0}
              receiveShadow={eclipseShadowIntensity <= 0}
              renderOrder={1}
              userData={{ isOccluder: true }}
            >
              <sphereGeometry args={[size, 128 * 4, 128 * 4]} />
              {/* DEBUG: Eclipse Alignment Line */}
              {earthUniforms.numEclipseMoons.value > 0 && false && (
                <EclipseDebugLine
                  sunPos={earthUniforms.eclipseSunPos.value}
                  moonPos={earthUniforms.eclipseMoons.value[0]}
                  active={true}
                  planetSize={size}
                /* meshRef={earthMeshRef} - removed */
                />
              )}
              <shaderMaterial
                ref={earthMaterialRef}
                key={`earth-mat-${data.id}`}
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

              {(showLabel || hovered) && (
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
              {(showLabel || hovered) && (
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
          ) : isJupiter ? (
            <mesh
              ref={meshRef}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(data);
              }}
              onPointerOver={() => setHover(true)}
              onPointerOut={() => setHover(false)}
              castShadow={eclipseShadowIntensity <= 0}
              receiveShadow={eclipseShadowIntensity <= 0}
              userData={{ isOccluder: true }}
            >
              <sphereGeometry args={[size, 128, 128]} />
              <shaderMaterial
                ref={jupiterMaterialRef}
                key={`jupiter-mat-${data.id}`}
                vertexShader={JupiterMaterial.vertexShader}
                fragmentShader={JupiterMaterial.fragmentShader}
                uniforms={jupiterUniforms}
                lights={true}
                transparent={false}
                depthWrite={true}
                depthTest={true}
              />
              {(showLabel || hovered) && (
                <Html position={[0, size * 1.5, 0]}>
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold pointer-events-none transition-opacity duration-200 select-none whitespace-nowrap flex items-center gap-1.5
                                ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : "bg-black/50 text-white border border-white/20"}
                                `}
                  >
                    {data.name}
                  </div>
                </Html>
              )}
            </mesh>
          ) : (
            <mesh
              ref={meshRef}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(data);
              }}
              onPointerOver={() => setHover(true)}
              onPointerOut={() => setHover(false)}
              castShadow={eclipseShadowIntensity <= 0}
              receiveShadow={eclipseShadowIntensity <= 0}
              userData={{ isOccluder: true }}
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

              {(showLabel || hovered) && (
                <Html position={[0, size * 1.5, 0]}>
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold pointer-events-none transition-opacity duration-200 select-none whitespace-nowrap flex items-center gap-1.5
                                ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50" : "bg-black/50 text-white border border-white/20"}
                                `}
                  >
                    {data.name}
                  </div>
                </Html>
              )}
            </mesh>
          )}
        </group>

        {
          data.moons &&
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
              auScale={auScale}
              onPlanetClick={onPlanetClick}
              parentId={data.id}
              parentRadius={data.radius}
              atmOpacity={atmOpacity}
              atmPow={atmPow}
              atmSamples={atmSamples}
              issModel={issModel}
              focusedBodyId={focusedBodyId}
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
          ))
        }
      </group >
    </>
  );
};

export default React.memo(Planet);
