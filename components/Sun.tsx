import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PLANET_SCALE } from '../constants';

interface SunProps {
    scaleFactor: number;
}

const Sun: React.FC<SunProps> = ({ scaleFactor }) => {
    const size = 5 * PLANET_SCALE * scaleFactor; 

    // Generate procedural glow texture
    const glowTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        if (context) {
            const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
            gradient.addColorStop(0, 'rgba(255, 255, 230, 1)'); // Center white-ish
            gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.8)'); // Inner glow orange
            gradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.2)'); // Outer glow red/orange
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade out
            context.fillStyle = gradient;
            context.fillRect(0, 0, 128, 128);
        }
        return new THREE.CanvasTexture(canvas);
    }, []);

    return (
        <group>
            {/* Main Light Source */}
            <pointLight 
                intensity={3} 
                distance={0} 
                decay={0} // 0 decay to ensure outer planets are lit, physically incorrect but necessary for viz
                color="#fff" 
                castShadow
                shadow-mapSize-width={4096}
                shadow-mapSize-height={4096}
                shadow-bias={-0.00005}
                shadow-radius={2}
            />
            {/* Ambient fill for dark sides */}
            <ambientLight intensity={0.05} />
            
            {/* Sun Sphere */}
            <mesh>
                <sphereGeometry args={[size, 64, 64]} />
                <meshBasicMaterial color="#FFD700" toneMapped={false} />
            </mesh>
            
            {/* Corona Glow Sprite */}
            <sprite scale={[size * 8, size * 8, 1]}>
                <spriteMaterial map={glowTexture} color="#FFD700" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
        </group>
    );
};

export default Sun;