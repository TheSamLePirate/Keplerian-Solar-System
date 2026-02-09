import React, { useRef, useMemo, useState } from "react";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { calculateOrbitalPositionWithPeriod } from "../../utils/physics";
import { PLANET_SCALE, MOON_ORBIT_SCALE } from "../../constants";
import ISSModel from "../ISS";
import { PlanetProps } from "./PlanetProps";
import { AtmosphereMaterial, EarthMaterial, MoonMaterial } from "./shaders";
import { dummyTexture, dummyCube } from "./textures";
import { useTextureLoader } from "./useTextureLoader";
import { usePlanetFrame } from "./usePlanetFrame";

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
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const issGroupRef = useRef<THREE.Group>(null);
  const atmMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const moonMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const atmMeshRef = useRef<THREE.Mesh>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  const isFocused = data.id === focusedBodyId;

  // Constants
  const isMoon = data.type === "moon";
  const useMoonShader = data.id === "moon";
  const isSatellite = data.type === "satellite";
  const visualOrbitScale = isMoon || isSatellite ? MOON_ORBIT_SCALE : 1;

  const hasAtmosphere = !!data.atmosphereColor;
  const isEarth = data.id === "earth";

  const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
  const satelliteMinOrbitRadius = parentPlanetVisualRadius * 1.15;

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

  // Texture Loading Hook
  const { loadedTextures } = useTextureLoader({
    data,
    earthTextureLOD,
    earthUniforms,
    moonMaterialRef,
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
              renderOrder={1}
            >
              <sphereGeometry args={[size, 128, 128]} />
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
