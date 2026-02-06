import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, ChromaticAberration, BrightnessContrast, SMAA, HueSaturation, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';

import { PLANETS, MOON_ORBIT_SCALE, PLANET_SCALE } from '../constants';
import { PlanetData } from '../types';
import { calculateOrbitalPositionWithPeriod } from '../utils/physics';
import Planet from './Planet';
import Sun from './Sun';

interface SceneContentProps {
    speed: number;
    paused: boolean;
    scaleFactor: number;
    showOrbits: boolean;
    showLabels: boolean;
    selectedPlanet: PlanetData | null; // For visual highlighting
    followingBody: PlanetData | null;   // For camera tracking
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
    shadowEnabled: boolean;
    shadowMapSize: number;
    shadowRadius: number;
    renderScale: number;
    starsCount: number;
    resetCameraTrigger: number;
    forcedTime?: { value: number, id: number };
    issModel: 'small' | 'big';
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
}

const FocusedLight: React.FC<{ followingBody: PlanetData | null; sunPosition: THREE.Vector3 }> = ({ followingBody, sunPosition }) => {
    const lightRef = useRef<THREE.DirectionalLight>(null);
    const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());
    const { scene } = useThree();

    useEffect(() => {
        scene.add(targetRef.current);
        return () => { scene.remove(targetRef.current); };
    }, [scene]);

    useFrame(() => {
        if (!followingBody || !lightRef.current) return;

        // Position the light "towards the sun" relative to the target
        // We want crisp shadows, so we simulate a directional light coming from the sun
        // but positioned relatively close to the object to manage shadow map resolution

        // Find the object in the scene (it might be moving)
        const object = scene.getObjectByName(`planet-${followingBody.id}`);
        // Alternatively, we can calculate position from physics if we had access to it here,
        // but finding the generic object is easier if named correctly.
        // HOWEVER, we don't name our planets yet. Let's rely on the Planet component to update a ref?
        // OR: We can calculate it here using the same physics logic.
        // Let's use the same logic as Scene camera follow for consistency.

        // Actually, simpler: The Light Target should be the object position.
        // The Light Position should be ObjectPos + (SunPos - ObjectPos).normalized * Offset
    });

    // Changing approach:
    // We can't easily access the exact position here without re-calculating physics.
    // Let's rely on `Planet.tsx` to update layers.
    // Here we just render the light.
    // But the light needs to follow the object.

    // Simplify: Put this logic inside `SceneContentInternal` where we already calc positions!
    return null;
};

const SceneContentInternal: React.FC<SceneContentProps> = ({
    speed, paused, scaleFactor, showOrbits, showLabels, selectedPlanet, followingBody, isFollowing, onPlanetClick, onBackgroundClick, onTimeUpdate, onFpsUpdate, atmOpacity, atmPow, atmSamples, ambientLightIntensity, sunLuminosity, shadowEnabled, shadowMapSize, shadowRadius, starsCount, resetCameraTrigger, forcedTime, issModel,
    bloomThreshold, bloomIntensity, bloomRadius, noiseOpacity, vignetteDarkness, vignetteOffset, chromaticAberrationOffset, brightness, contrast, exposure, bloomSmoothing, hue, saturation,
    bloomMipmapBlur, toneMappingAdaptive, vignetteEskil, noisePremultiply, chromaticRadial, chromaticModulation,
    enableBloom, enableNoise, enableVignette, enableChromaticAberration, enableBrightnessContrast, enableHueSaturation,
    enableAO, aoIntensity, aoRadius, aoDistanceFalloff, aoScreenSpace
}) => {
    // Optimization: Use ref instead of state for time to avoid re-rendering Scene every frame
    const timeRef = useRef(0);
    const lastUiUpdateRef = useRef(0);
    const controlsRef = useRef<any>(null);
    const sunRef = useRef<THREE.Mesh>(null);
    const focusedLightRef = useRef<THREE.DirectionalLight>(null);
    const focusedLightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
    const { camera, scene } = useThree();

    // Enable Layer 1 for camera to see focused objects
    useEffect(() => {
        camera.layers.enable(1);
    }, [camera]);

    // Add focused light target to scene
    useEffect(() => {
        scene.add(focusedLightTargetRef.current);
        return () => { scene.remove(focusedLightTargetRef.current); };
    }, [scene]);

    const prevTargetPos = useRef(new THREE.Vector3(0, 0, 0));
    // Pre-allocated vectors for camera follow loop (avoid GC pressure from per-frame allocations)
    const _targetPos = useRef(new THREE.Vector3());
    const _parentPos = useRef(new THREE.Vector3());
    const _childPos = useRef(new THREE.Vector3());
    const _deltaPos = useRef(new THREE.Vector3());

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
            const fps = Math.round(frameCount.current / (now - lastFpsUpdate.current));
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
    }, -1);

    // Priority 1: Update Camera Follow (After planets have updated)
    useFrame(() => {
        // Follow Logic - Uses followingBody instead of selectedPlanet
        if (isFollowing && followingBody && controlsRef.current) {
            const targetPos = _targetPos.current.set(0, 0, 0);
            const currentTime = timeRef.current; // Read the updated time

            if (followingBody.type === 'moon' || followingBody.type === 'satellite') {
                // Find parent planet for moons and satellites
                const parent = PLANETS.find(p => p.moons?.some(m => m.id === followingBody.id));
                if (parent) {
                    const parentPosArray = calculateOrbitalPositionWithPeriod(parent.elements, currentTime, parent.period);
                    const parentPos = _parentPos.current.set(parentPosArray[0], parentPosArray[1], parentPosArray[2]);

                    const childPosArray = calculateOrbitalPositionWithPeriod(followingBody.elements, currentTime, followingBody.period);
                    const childPos = _childPos.current.set(
                        childPosArray[0] * MOON_ORBIT_SCALE,
                        childPosArray[1] * MOON_ORBIT_SCALE,
                        childPosArray[2] * MOON_ORBIT_SCALE
                    );

                    // For satellites, apply minimum orbit radius (same logic as Planet.tsx)
                    if (followingBody.type === 'satellite') {
                        const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
                        const satelliteMinOrbitRadius = parentPlanetVisualRadius * 1.15;
                        const distance = childPos.length();
                        if (distance > 0) {
                            childPos.normalize().multiplyScalar(Math.max(distance, satelliteMinOrbitRadius));
                        }
                    }

                    targetPos.copy(parentPos).add(childPos);
                }
            } else {
                const posArray = calculateOrbitalPositionWithPeriod(followingBody.elements, currentTime, followingBody.period);
                targetPos.set(posArray[0], posArray[1], posArray[2]);
            }

            // Sync controls target to calculated position
            controlsRef.current.target.copy(targetPos);

            // Move camera to maintain relative position to target (no damping on this part)
            const deltaPos = _deltaPos.current.copy(targetPos).sub(prevTargetPos.current);
            camera.position.add(deltaPos);
            prevTargetPos.current.copy(targetPos);

            // Update Focused Light
            if (focusedLightRef.current) {
                // Target is the object being followed
                focusedLightTargetRef.current.position.copy(targetPos);
                focusedLightRef.current.target = focusedLightTargetRef.current;

                // Light position: Toward the Sun (0,0,0)
                // Direction from Object to Sun = (0,0,0) - targetPos = -targetPos
                // We place the light some distance away in that direction
                const toSun = _deltaPos.current.copy(targetPos).negate().normalize();
                // Distance: Enough to clear the object radius but close enough for precision
                // ISS Radius is ~0.008 -> distance should be small
                const distance = 5 * PLANET_SCALE * scaleFactor;
                focusedLightRef.current.position.copy(targetPos).add(toSun.multiplyScalar(distance));
                focusedLightRef.current.updateMatrixWorld();
            }
        } else {
            if (controlsRef.current) {
                prevTargetPos.current.copy(controlsRef.current.target);
            }
        }
    }, 1);

    return (
        <>
            <OrbitControls
                ref={controlsRef}
                minDistance={0.0001}
                maxDistance={10000}
                enablePan={true}
                dampingFactor={0.05}
            />
            <Stars radius={3000} depth={50} count={starsCount} factor={4} saturation={0} fade speed={1} />

            <Sun
                ref={sunRef}
                scaleFactor={scaleFactor}
                luminosity={sunLuminosity}
                shadowEnabled={shadowEnabled}
                shadowMapSize={shadowMapSize}
                shadowRadius={shadowRadius}
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
                    <orthographicCamera attach="shadow-camera" args={[-0.05, 0.05, 0.05, -0.05, 0.01, 10]} />
                </directionalLight>
            )}

            <ambientLight intensity={ambientLightIntensity} />

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
                    atmOpacity={atmOpacity}
                    atmPow={atmPow}
                    atmSamples={atmSamples}
                    issModel={issModel}
                    focusedBodyId={isFollowing && followingBody ? followingBody.id : null}
                />
            ))}

            <EffectComposer depthBuffer={true}>
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
                {enableBloom && <Bloom luminanceThreshold={bloomThreshold} mipmapBlur={bloomMipmapBlur} intensity={bloomIntensity} radius={bloomRadius} luminanceSmoothing={bloomSmoothing} />}
                <ToneMapping adaptive={toneMappingAdaptive} />
                {enableVignette && <Vignette eskil={vignetteEskil} offset={vignetteOffset} darkness={vignetteDarkness} />}
                {enableNoise && <Noise opacity={noiseOpacity} premultiply={noisePremultiply} />}
                {enableChromaticAberration && (
                    <ChromaticAberration
                        offset={new THREE.Vector2(chromaticAberrationOffset, chromaticAberrationOffset)}
                        radialModulation={chromaticRadial}
                        modulationOffset={chromaticModulation}
                    />
                )}
                {enableBrightnessContrast && <BrightnessContrast brightness={brightness} contrast={contrast} />}
                {enableHueSaturation && <HueSaturation hue={hue} saturation={saturation} />}
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
                powerPreference: 'high-performance'
            }}
            onPointerMissed={props.onBackgroundClick}
        >
            <SceneContentInternal {...props} />
        </Canvas>
    );
});

export default Scene;
