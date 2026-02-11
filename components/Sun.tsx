import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLANET_SCALE } from '../constants';
import { SunMaterial, SunCoronaMaterial } from './planet/sun-shader';
import { LensflareEffect } from './Lensflare';

interface SunProps {
    scaleFactor: number;
    luminosity: number;
    shadowEnabled: boolean;
    shadowMapSize: number;
    shadowRadius: number;
    // New Props
    sunShaderEnabled: boolean;
    sunColorA: string;
    sunColorB: string;
    sunSpeed: number;
    sunNoiseScale: number;
    sunTurbulence: number;
    sunRayCount: number;
    // Advanced
    sunSpotIntensity: number;
    sunSpotCount: number;
    sunRimPower: number;
    sunRimColor: string;
    sunCoronas: boolean;
    sunProminenceSize: number;
    sunCoronaOpacity: number;
    sunFilamentScale: number;
    sunFilamentIntensity: number;
    sunSurfaceRelief: number;
    // Lensflare
    lensflareEnabled?: boolean;
    lensflareOpacity?: number;
}

const Sun = React.forwardRef<THREE.Mesh, SunProps>(({
    scaleFactor,
    luminosity,
    shadowEnabled,
    shadowMapSize,
    shadowRadius,
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
    sunProminenceSize,
    sunCoronaOpacity,
    sunFilamentScale,
    sunFilamentIntensity,
    sunSurfaceRelief,
    lensflareEnabled = false,
    lensflareOpacity = 1.0
}, ref) => {
    const { gl } = useThree();
    const lightRef = useRef<THREE.PointLight>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const coronaMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const size = 100 * PLANET_SCALE * scaleFactor;

    const cappedShadowSize = useMemo(() => {
        const maxSize = gl.capabilities.maxTextureSize || 4096;
        const pow2 = THREE.MathUtils.floorPowerOfTwo(maxSize);
        return Math.max(256, Math.min(shadowMapSize, pow2));
    }, [gl, shadowMapSize]);

    useEffect(() => {
        if (!lightRef.current) return;
        const shadow = lightRef.current.shadow;
        if (!shadow) return;

        // Update shadow config and force a reallocation when size changes
        shadow.mapSize.set(cappedShadowSize, cappedShadowSize);
        shadow.radius = shadowRadius;
        shadow.needsUpdate = true;

        if (shadow.map) {
            shadow.map.dispose();
            shadow.map = null;
        }

        gl.shadowMap.needsUpdate = true;
    }, [cappedShadowSize, shadowRadius, shadowEnabled, gl]);

    // Generate procedural glow texture (Keep for fallback/glow sprite)
    const glowTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, 128, 128); // Explicit clear
            const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
            gradient.addColorStop(0, 'rgba(255, 255, 230, 1)'); // Center white-ish
            gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.8)'); // Inner glow orange
            gradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.2)'); // Outer glow red/orange
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade out
            context.fillStyle = gradient;
            context.fillRect(0, 0, 128, 128);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, []);

    // Uniforms for the shader
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(sunColorA) },
        uColorB: { value: new THREE.Color(sunColorB) },
        uSpeed: { value: sunSpeed },
        uNoiseScale: { value: sunNoiseScale },
        uTurbulence: { value: sunTurbulence },
        uRayCount: { value: sunRayCount },
        uSpotIntensity: { value: sunSpotIntensity },
        uSpotCount: { value: sunSpotCount },
        uRimPower: { value: sunRimPower },
        uRimColor: { value: new THREE.Color(sunRimColor) },
        uSurfaceRelief: { value: sunSurfaceRelief },
    }), []); // Init once, update in loop or effect

    // Uniforms for the corona shader
    const coronaUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uSpeed: { value: sunSpeed },
        uColorA: { value: new THREE.Color(sunColorA) },
        uColorB: { value: new THREE.Color(sunColorB) },
        uOpacity: { value: 0.6 }, // Default opacity
        uSpotCount: { value: sunSpotCount }, // Add uSpotCount
        uProminenceSize: { value: sunProminenceSize }, // Add uProminenceSize
        uFilamentScale: { value: sunFilamentScale },
        uFilamentIntensity: { value: sunFilamentIntensity },
    }), []);

    // Update Uniforms
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uColorA.value.set(sunColorA);
            materialRef.current.uniforms.uColorB.value.set(sunColorB);
            materialRef.current.uniforms.uSpeed.value = sunSpeed;
            materialRef.current.uniforms.uNoiseScale.value = sunNoiseScale;
            materialRef.current.uniforms.uTurbulence.value = sunTurbulence;
            materialRef.current.uniforms.uRayCount.value = sunRayCount;
            materialRef.current.uniforms.uSpotIntensity.value = sunSpotIntensity;
            materialRef.current.uniforms.uSpotCount.value = sunSpotCount;
            materialRef.current.uniforms.uRimPower.value = sunRimPower;
            materialRef.current.uniforms.uRimColor.value.set(sunRimColor);
            materialRef.current.uniforms.uSurfaceRelief.value = sunSurfaceRelief;
        }
        if (coronaMaterialRef.current) {
            coronaMaterialRef.current.uniforms.uColorA.value.set(sunColorA);
            coronaMaterialRef.current.uniforms.uColorB.value.set(sunColorB);
            coronaMaterialRef.current.uniforms.uSpeed.value = sunSpeed;
            coronaMaterialRef.current.uniforms.uSpotCount.value = sunSpotCount;
            coronaMaterialRef.current.uniforms.uProminenceSize.value = sunProminenceSize;
            coronaMaterialRef.current.uniforms.uOpacity.value = sunCoronaOpacity;
            coronaMaterialRef.current.uniforms.uFilamentScale.value = sunFilamentScale;
            coronaMaterialRef.current.uniforms.uFilamentIntensity.value = sunFilamentIntensity;
        }
    }, [sunColorA, sunColorB, sunSpeed, sunNoiseScale, sunTurbulence, sunRayCount, sunSpotIntensity, sunSpotCount, sunRimPower, sunRimColor, sunProminenceSize, sunCoronaOpacity, sunFilamentScale, sunFilamentIntensity, sunSurfaceRelief]);

    useFrame((state) => {
        if (materialRef.current && sunShaderEnabled) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
        if (coronaMaterialRef.current && sunCoronas) {
            coronaMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <group>
            {/* Main Light Source */}
            <pointLight
                ref={lightRef}
                intensity={luminosity}
                distance={0}
                decay={0}
                color="#fff"
                castShadow={shadowEnabled}
                shadow-mapSize-width={cappedShadowSize}
                shadow-mapSize-height={cappedShadowSize}
                shadow-bias={-0.000001}
                shadow-radius={shadowRadius}
                shadow-camera-far={1000000}
                shadow-camera-near={0.1}
            >
                {lensflareEnabled && <LensflareEffect opacity={lensflareOpacity} color={sunColorA} />}
            </pointLight>

            <ambientLight intensity={Math.max(0.02, luminosity * 0.02)} />

            {/* Sun Sphere */}
            <mesh ref={ref}>
                <sphereGeometry args={[size, 64, 64]} />
                {sunShaderEnabled ? (
                    <shaderMaterial
                        ref={materialRef}
                        vertexShader={SunMaterial.vertexShader}
                        fragmentShader={SunMaterial.fragmentShader}
                        uniforms={uniforms}
                        toneMapped={false}
                    />
                ) : (
                    <meshBasicMaterial color="#FFD700" toneMapped={false} />
                )}
            </mesh>

            {/* Corona / Prominence Mesh */}
            {sunShaderEnabled && sunCoronas && (
                <mesh>
                    {/* Slightly larger sphere for corona - Increased buffer to avoid z-fighting */}
                    <sphereGeometry args={[size * 1.15, 64, 64]} />
                    <shaderMaterial
                        ref={coronaMaterialRef}
                        vertexShader={SunCoronaMaterial.vertexShader}
                        fragmentShader={SunCoronaMaterial.fragmentShader}
                        uniforms={coronaUniforms}
                        transparent
                        depthWrite={false}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}

            {/* Far Glow Sprite */}
            <sprite scale={[size * 8, size * 8, 1]}>
                <spriteMaterial map={glowTexture} color={sunColorA} transparent opacity={Math.min(1, luminosity * 0.2)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
        </group>
    );
});

Sun.displayName = 'Sun';

export default Sun;
