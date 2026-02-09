import React, { useMemo } from 'react';
import * as THREE from 'three';
import constellationLines from '../data/constellations.json';

interface ConstellationsProps {
    positions: Float32Array; // Shared star positions
    visible?: boolean;
    opacity?: number;
    color?: string;
    lineWidth?: number;
}

const Constellations: React.FC<ConstellationsProps> = ({
    positions,
    visible = true,
    opacity = 0.4,
    color = '#ffffff',
    lineWidth = 1
}) => {
    // Build line geometry from indices
    const geometry = useMemo(() => {
        if (!positions || positions.length === 0) return null;

        // constellationLines is array of [idx1, idx2]
        // We need to build a Flat32Array of positions for LineSegments
        const lineCount = constellationLines.length;
        const linePositions = new Float32Array(lineCount * 2 * 3); // 2 vertices per line, 3 coords per vertex

        let ptr = 0;
        constellationLines.forEach(([idx1, idx2]: number[]) => {
            // Vertex 1
            linePositions[ptr++] = positions[idx1 * 3];
            linePositions[ptr++] = positions[idx1 * 3 + 1];
            linePositions[ptr++] = positions[idx1 * 3 + 2];

            // Vertex 2
            linePositions[ptr++] = positions[idx2 * 3];
            linePositions[ptr++] = positions[idx2 * 3 + 1];
            linePositions[ptr++] = positions[idx2 * 3 + 2];
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        return geo;
    }, [positions]);

    // Debug logging
    //console.log('Constellations rendering:', { visible, lineCount: constellationLines.length, hasPositions: positions?.length > 0 });

    if (!visible || !geometry) return null;

    return (
        <lineSegments geometry={geometry} frustumCulled={false}>
            <lineBasicMaterial
                color={color}
                transparent
                opacity={0.8} // Increased from 0.4
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </lineSegments>
    );
};

export default Constellations;
