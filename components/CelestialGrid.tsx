import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';

interface CelestialGridProps {
    radius?: number;
    color?: string;
    opacity?: number;
    visible?: boolean;
    mode?: 'equatorial' | 'ecliptic';
}

const CelestialGrid: React.FC<CelestialGridProps> = ({
    radius = 50000,
    color,
    opacity = 0.4,
    visible = false,
    mode = 'equatorial'
}) => {
    // Ecliptic Obliquity (Tilt)
    const obliquity = 23.43928 * (Math.PI / 180);

    // Determine color based on mode if not specified
    const gridColor = color || (mode === 'equatorial' ? '#6b8cff' : '#ffaa44');

    const { geometry, labels } = useMemo(() => {
        const points: number[] = [];
        const labels: { pos: [number, number, number], text: string }[] = [];

        // We generate the grid in a "Local" frame where Y is the Pole.
        // For Equatorial: Local Y = Celestial Pole (Scene Y) -> No rotation.
        // For Ecliptic: Local Y = Ecliptic Pole -> We must rotate the generated points.

        // --- Generation Logic (Standard Sphere Grid) ---

        // 1. Latitude (Parallels)
        const latStep = 15;
        for (let lat = -75; lat <= 75; lat += latStep) {
            if (lat === 0) continue;

            const latRad = lat * (Math.PI / 180);
            const r = radius * Math.cos(latRad);
            const y = radius * Math.sin(latRad);

            const segments = 128;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const x = r * Math.cos(theta);
                const z = r * Math.sin(theta);

                const thetaNext = ((i + 1) / segments) * Math.PI * 2;
                const xNext = r * Math.cos(thetaNext);
                const zNext = r * Math.sin(thetaNext);

                points.push(x, y, z);
                points.push(xNext, y, zNext);
            }

            labels.push({
                pos: [r, y, 0],
                text: `${lat > 0 ? '+' : ''}${lat}°`
            });
        }

        // 2. Equator / Ecliptic Plane
        {
            const r = radius;
            const y = 0;
            const segments = 128;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const x = r * Math.cos(theta);
                const z = r * Math.sin(theta);

                const thetaNext = ((i + 1) / segments) * Math.PI * 2;
                const xNext = r * Math.cos(thetaNext);
                const zNext = r * Math.sin(thetaNext);

                points.push(x, y, z);
                points.push(xNext, y, zNext);
            }
        }

        // 3. Longitude (Meridians)
        const lonStep = mode === 'equatorial' ? 15 : 30; // 15 deg (1h) for Eq, 30 deg for Ecliptic
        for (let lon = 0; lon < 360; lon += lonStep) {
            const lonRad = lon * (Math.PI / 180);
            const cosLon = Math.cos(lonRad);
            const sinLon = Math.sin(lonRad);

            const segments = 64;
            for (let i = 0; i < segments; i++) {
                const lat1 = -Math.PI / 2 + (i / segments) * Math.PI;
                const lat2 = -Math.PI / 2 + ((i + 1) / segments) * Math.PI;

                const r1 = radius * Math.cos(lat1);
                const y1 = radius * Math.sin(lat1);
                const r2 = radius * Math.cos(lat2);
                const y2 = radius * Math.sin(lat2);

                points.push(r1 * cosLon, y1, r1 * sinLon);
                points.push(r2 * cosLon, y2, r2 * sinLon);
            }

            // Labels
            const labelText = mode === 'equatorial'
                ? `${lon / 15}h`
                : `${lon}°`;

            labels.push({
                pos: [radius * cosLon, 0, radius * sinLon],
                text: labelText
            });
        }

        // --- Rotation for Ecliptic Mode ---
        // If mode is Ecliptic, our "Y" is the Ecliptic Pole. 
        // We must rotate the entire set of points to align with the Scene (Equatorial Frame).
        // Rotate *from* Ecliptic *to* Equatorial.
        // Using the same transform as Physics: 
        // y_eq = y_ecl * cosE - z_ecl * sinE
        // z_eq = y_ecl * sinE + z_ecl * cosE

        if (mode === 'ecliptic') {
            const cosE = Math.cos(obliquity);
            const sinE = Math.sin(obliquity);

            for (let i = 0; i < points.length; i += 3) {
                const x = points[i];
                const y = points[i + 1];
                const z = points[i + 2];

                // x stays x
                const y_eq = y * cosE - z * sinE;
                const z_eq = y * sinE + z * cosE;

                points[i] = x;
                points[i + 1] = y_eq;
                points[i + 2] = z_eq;
            }

            // Rotate labels too
            labels.forEach(l => {
                const [x, y, z] = l.pos;
                const y_eq = y * cosE - z * sinE;
                const z_eq = y * sinE + z * cosE;
                l.pos = [x, y_eq, z_eq];
            });
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        return { geometry: geo, labels };
    }, [radius, mode, gridColor]); // Re-run if mode changes

    if (!visible) return null;

    return (
        <group>
            <lineSegments geometry={geometry} frustumCulled={false}>
                <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
            </lineSegments>
            {labels.map((label, i) => (
                <Billboard
                    key={i}
                    position={label.pos}
                >
                    <Text
                        color={color}
                        fontSize={radius * 0.05} // Scale text with radius
                        anchorX="center"
                        anchorY="middle"
                    >
                        {label.text}
                    </Text>
                </Billboard>
            ))}
        </group>
    );
};

export default CelestialGrid;
