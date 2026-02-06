
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import starData from '../data/stars.json';

// Vertex Shader
const vertexShader = `
attribute float magnitude;
attribute float colorIndex;

varying vec3 vColor;
varying float vAlpha;

uniform float uSize;
uniform float uSizeMagShape; // How much magnitude affects size
uniform float uBrightness;
uniform float uBrightnessMagShape; // How much magnitude affects brightness
uniform float uSaturation;

// Color temperature approximation based on B-V index
vec3 colorFromBV(float bv) {
    // Clamped B-V range approx -0.5 (blue) to 2.0 (red)
    float t = clamp((bv + 0.4) / 2.0, 0.0, 1.0);
    
    // Vibrant Palette
    vec3 blue = vec3(0.4, 0.6, 1.0);     // Hot Blue
    vec3 white = vec3(0.9, 0.95, 1.0);   // White (slightly bluish)
    vec3 yellow = vec3(1.0, 0.9, 0.5);   // Yellow
    vec3 orange = vec3(1.0, 0.7, 0.2);   // Orange
    vec3 red = vec3(1.0, 0.4, 0.3);      // Red
    
    vec3 rawColor = white;
    if (t < 0.25) rawColor = mix(blue, white, t / 0.25);
    else if (t < 0.5) rawColor = mix(white, yellow, (t - 0.25) / 0.25);
    else if (t < 0.75) rawColor = mix(yellow, orange, (t - 0.5) / 0.25);
    else rawColor = mix(orange, red, (t - 0.75) / 0.25);

    // Apply Saturation (mix with grayscale)
    float lum = dot(rawColor, vec3(0.299, 0.587, 0.114));
    return mix(vec3(lum), rawColor, uSaturation);
}

void main() {
    vColor = colorFromBV(colorIndex);
    
    // Position
    vec3 pos = position * 50000.0; 
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // --- Scale Logic ---
    // Mag range: -1.5 (brightest) to ~7.5 (dimmest)
    // We want brightness to drive visibility more than size
    
    float invMag = max(0.0, 8.0 - magnitude); // 0 to ~9.5
    
    // Size varies slightly with magnitude to avoid big blobs
    float sizeFactor = 1.0 + (invMag * uSizeMagShape);
    gl_PointSize = uSize * sizeFactor;
    
    // --- Brightness Logic ---
    // Brightness decreases exponentially with magnitude
    // uBrightnessMagShape controls the falloff curve
    float brightFactor = pow(2.5, invMag * uBrightnessMagShape);
    vAlpha = brightFactor * uBrightness;
}
`;

// Fragment Shader
const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
    // Soft Circle with Hard Core
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;
    
    // Core look: very bright center, falling off
    // exp(-dist*dist*16) gives a nice Gaussian-like peak
    float shape = exp(-dist * dist * 16.0); 
    
    // Final color intensity
    vec3 finalColor = vColor * vAlpha * shape;
    
    // Alpha for blending
    // We clamp alpha to ensure very bright stars don't become transparent? 
    // Actually we want additive blending so we output pre-multiplied-ish color usually,
    // but with standard blending we use alpha.
    // With AdditiveBlending, alpha in FragColor acts as a multiplier if we use regular blending equations, 
    // generally gl_FragColor.rgb * alpha is what ends up on screen in additive.
    
    // Let's just output color. Alpha doesn't matter much in pure additive if depth write is off,
    // but useful for slight transparency control.
    float alpha = min(1.0, vAlpha * shape * 2.0); 
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

const RealStars: React.FC<{
    starSize?: number;
    starSizeMagShape?: number;
    starBrightness?: number;
    starBrightnessMagShape?: number;
    starSaturation?: number;
}> = ({
    starSize = 2.0,
    starSizeMagShape = 0.1,
    starBrightness = 0.5,
    starBrightnessMagShape = 0.2,
    starSaturation = 1.0
}) => {
        const shaderRef = useRef<THREE.ShaderMaterial>(null);

        const { positions, magnitudes, colorIndices } = useMemo(() => {
            const count = starData.length;
            const positions = new Float32Array(count * 3);
            const magnitudes = new Float32Array(count);
            const colorIndices = new Float32Array(count);

            starData.forEach((star, i) => {
                // Data format: [x, y, z, mag, bv]
                positions[i * 3] = star[0];
                positions[i * 3 + 1] = star[1];
                positions[i * 3 + 2] = star[2];

                magnitudes[i] = star[3];
                colorIndices[i] = star[4];
            });

            return { positions, magnitudes, colorIndices };
        }, []);

        // Update uniforms when props change
        useEffect(() => {
            if (shaderRef.current) {
                shaderRef.current.uniforms.uSize.value = starSize;
                shaderRef.current.uniforms.uSizeMagShape.value = starSizeMagShape;
                shaderRef.current.uniforms.uBrightness.value = starBrightness;
                shaderRef.current.uniforms.uBrightnessMagShape.value = starBrightnessMagShape;
                shaderRef.current.uniforms.uSaturation.value = starSaturation;
            }
        }, [starSize, starSizeMagShape, starBrightness, starBrightnessMagShape, starSaturation]);

        const uniforms = useMemo(() => ({
            uSize: { value: starSize },
            uSizeMagShape: { value: starSizeMagShape },
            uBrightness: { value: starBrightness },
            uBrightnessMagShape: { value: starBrightnessMagShape },
            uSaturation: { value: starSaturation }
        }), []); // Init once, update via useEffect

        return (
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={positions.length / 3}
                        array={positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-magnitude"
                        count={magnitudes.length}
                        array={magnitudes}
                        itemSize={1}
                    />
                    <bufferAttribute
                        attach="attributes-colorIndex"
                        count={colorIndices.length}
                        array={colorIndices}
                        itemSize={1}
                    />
                </bufferGeometry>
                <shaderMaterial
                    ref={shaderRef}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                    transparent={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>
        );
    };

export default RealStars;
