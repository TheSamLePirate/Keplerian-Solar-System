import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, extend, Object3DNode } from '@react-three/fiber';
import * as THREE from 'three';
import { PLANET_SCALE } from '../constants';

interface SunProps {
    scaleFactor: number;
    luminosity: number;
    shadowEnabled: boolean;
    shadowMapSize: number;
    shadowRadius: number;
}

const Sun = React.forwardRef<THREE.Mesh, SunProps>(({ scaleFactor, luminosity, shadowEnabled, shadowMapSize, shadowRadius }, ref) => {
    const { gl } = useThree();
    const lightRef = useRef<THREE.PointLight>(null);
    const size = 5 * PLANET_SCALE * scaleFactor;
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

    // Generate procedural glow texture
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

    return (
        <group>
            {/* Main Light Source */}
            <pointLight
                ref={lightRef}
                intensity={luminosity}
                distance={0}
                decay={0} // 0 decay to ensure outer planets are lit, physically incorrect but necessary for viz
                color="#fff"
                castShadow={shadowEnabled}
                shadow-mapSize-width={cappedShadowSize}
                shadow-mapSize-height={cappedShadowSize}
                shadow-bias={-0.000001}
                shadow-radius={shadowRadius}
            />
            {/* Ambient fill for dark sides - scales with luminosity */}
            <ambientLight intensity={Math.max(0.02, luminosity * 0.02)} />

            {/* Sun Sphere */}
            <mesh ref={ref}>
                <sphereGeometry args={[size, 64, 64]} />
                <meshBasicMaterial color="#FFD700" toneMapped={false} />
            </mesh>

            {/* Corona Glow Sprite - Optional but good for static glow */}
            <sprite scale={[size * 8, size * 8, 1]}>
                <spriteMaterial map={glowTexture} color="#FFD700" transparent opacity={Math.min(1, luminosity * 0.2)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
        </group>
    );
});

Sun.displayName = 'Sun';

export default Sun;
