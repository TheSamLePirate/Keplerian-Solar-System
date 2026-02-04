import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
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
    ambientLightIntensity: number;
    shadowEnabled: boolean;
    shadowMapSize: number;
    shadowRadius: number;
    renderScale: number;
    starsCount: number;
    resetTimeTrigger: number;
    resetCameraTrigger: number;
    issModel: 'small' | 'big';
}

const SceneContentInternal: React.FC<SceneContentProps> = ({
    speed, paused, scaleFactor, showOrbits, showLabels, selectedPlanet, followingBody, isFollowing, onPlanetClick, onBackgroundClick, onTimeUpdate, onFpsUpdate, atmOpacity, atmPow, ambientLightIntensity, shadowEnabled, shadowMapSize, shadowRadius, starsCount, resetTimeTrigger, resetCameraTrigger, issModel
}) => {
    const [time, setTime] = useState(0);
    const lastUiUpdateRef = useRef(0);
    const controlsRef = useRef<any>(null);
    const { camera } = useThree();

    const prevTargetPos = useRef(new THREE.Vector3(0, 0, 0));
    const prevResetTime = useRef(resetTimeTrigger);
    const prevResetCam = useRef(resetCameraTrigger);

    // FPS Counters
    const frameCount = useRef(0);
    const lastFpsUpdate = useRef(0);

    // Reset Time
    if (resetTimeTrigger !== prevResetTime.current) {
        setTime(0);
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
            const newTime = time + speed * delta;
            setTime(newTime);
            const nowSeconds = state.clock.getElapsedTime();
            if (nowSeconds - lastUiUpdateRef.current >= 0.01) {
                onTimeUpdate(newTime);
                lastUiUpdateRef.current = nowSeconds;
            }
        }

        // Follow Logic - Uses followingBody instead of selectedPlanet
        if (isFollowing && followingBody && controlsRef.current) {
            let targetPos = new THREE.Vector3(0, 0, 0);
            const currentTime = time;

            if (followingBody.type === 'moon' || followingBody.type === 'satellite') {
                // Find parent planet for moons and satellites
                const parent = PLANETS.find(p => p.moons?.some(m => m.id === followingBody.id));
                if (parent) {
                    const parentPosArray = calculateOrbitalPositionWithPeriod(parent.elements, currentTime, parent.period);
                    const parentPos = new THREE.Vector3(...parentPosArray);

                    const childPosArray = calculateOrbitalPositionWithPeriod(followingBody.elements, currentTime, followingBody.period);
                    let childPos = new THREE.Vector3(
                        childPosArray[0] * MOON_ORBIT_SCALE,
                        childPosArray[1] * MOON_ORBIT_SCALE,
                        childPosArray[2] * MOON_ORBIT_SCALE
                    );

                    // For satellites, apply minimum orbit radius (same logic as Planet.tsx)
                    if (followingBody.type === 'satellite') {
                        const parentPlanetVisualRadius = 1.0 * PLANET_SCALE * scaleFactor;
                        const satelliteMinOrbitRadius = parentPlanetVisualRadius * 1.8;
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
            const deltaPos = targetPos.clone().sub(prevTargetPos.current);
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
                minDistance={0.01}
                maxDistance={10000}
                enablePan={true}
                dampingFactor={0.05}
            />
            <Stars radius={3000} depth={50} count={starsCount} factor={4} saturation={0} fade speed={1} />

            <Sun
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
                    time={time}
                    isSelected={selectedPlanet?.id === planet.id}
                    onSelect={onPlanetClick}
                    showOrbit={showOrbits}
                    showLabel={showLabels}
                    scaleFactor={scaleFactor}
                    atmOpacity={atmOpacity}
                    atmPow={atmPow}
                    issModel={issModel}
                />
            ))}
        </>
    );
};

const Scene: React.FC<SceneContentProps> = (props) => {
    return (
        <Canvas
            shadows={props.shadowEnabled ? { type: THREE.PCFShadowMap } : false}
            camera={{ position: [0, 50, 100], fov: 45, near: 0.001, far: 100000 }}
            dpr={props.renderScale}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2,
                powerPreference: 'high-performance'
            }}
            onPointerMissed={props.onBackgroundClick}
        >
            <SceneContentInternal {...props} />
        </Canvas>
    );
};

export default Scene;
