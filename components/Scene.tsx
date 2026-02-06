import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, ChromaticAberration, BrightnessContrast, SMAA, HueSaturation } from '@react-three/postprocessing';
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
    shadowEnabled: boolean;
    shadowMapSize: number;
    shadowRadius: number;
    renderScale: number;
    starsCount: number;
    resetTimeTrigger: number;
    resetCameraTrigger: number;
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
}

const SceneContentInternal: React.FC<SceneContentProps> = ({
    speed, paused, scaleFactor, showOrbits, showLabels, selectedPlanet, followingBody, isFollowing, onPlanetClick, onBackgroundClick, onTimeUpdate, onFpsUpdate, atmOpacity, atmPow, atmSamples, ambientLightIntensity, shadowEnabled, shadowMapSize, shadowRadius, starsCount, resetTimeTrigger, resetCameraTrigger, issModel,
    bloomThreshold, bloomIntensity, bloomRadius, noiseOpacity, vignetteDarkness, vignetteOffset, chromaticAberrationOffset, brightness, contrast, exposure, bloomSmoothing, hue, saturation,
    bloomMipmapBlur, toneMappingAdaptive, vignetteEskil, noisePremultiply, chromaticRadial, chromaticModulation,
    enableBloom, enableNoise, enableVignette, enableChromaticAberration, enableBrightnessContrast, enableHueSaturation
}) => {
    // Optimization: Use ref instead of state for time to avoid re-rendering Scene every frame
    const timeRef = useRef(0);
    const lastUiUpdateRef = useRef(0);
    const controlsRef = useRef<any>(null);
    const sunRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();

    const prevTargetPos = useRef(new THREE.Vector3(0, 0, 0));
    // Pre-allocated vectors for camera follow loop (avoid GC pressure from per-frame allocations)
    const _targetPos = useRef(new THREE.Vector3());
    const _parentPos = useRef(new THREE.Vector3());
    const _childPos = useRef(new THREE.Vector3());
    const _deltaPos = useRef(new THREE.Vector3());
    const prevResetTime = useRef(resetTimeTrigger);
    const prevResetCam = useRef(resetCameraTrigger);

    // FPS Counters
    const frameCount = useRef(0);
    const lastFpsUpdate = useRef(0);

    // Reset Time
    if (resetTimeTrigger !== prevResetTime.current) {
        timeRef.current = 0;
        onTimeUpdate(0);
        lastUiUpdateRef.current = 0;
        prevResetTime.current = resetTimeTrigger;
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

    // Animation Loop
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

        // Follow Logic - Uses followingBody instead of selectedPlanet
        if (isFollowing && followingBody && controlsRef.current) {
            const targetPos = _targetPos.current.set(0, 0, 0);
            const currentTime = timeRef.current;

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

            controlsRef.current.target.copy(targetPos);
            const deltaPos = _deltaPos.current.copy(targetPos).sub(prevTargetPos.current);
            camera.position.add(deltaPos);
            prevTargetPos.current.copy(targetPos);
        } else {
            if (controlsRef.current) {
                prevTargetPos.current.copy(controlsRef.current.target);
            }
        }
    });

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
                shadowEnabled={shadowEnabled}
                shadowMapSize={shadowMapSize}
                shadowRadius={shadowRadius}
            />
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
                />
            ))}

            <EffectComposer depthBuffer={true}>
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

const Scene: React.FC<SceneContentProps> = (props) => {
    return (
        <Canvas
            shadows={props.shadowEnabled ? { type: THREE.PCFShadowMap } : false}
            camera={{ position: [0, 50, 100], fov: 45, near: 0.00001, far: 1000000 }}
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
};

export default Scene;
