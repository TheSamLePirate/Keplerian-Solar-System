import { useMemo } from 'react';
import starData from '../data/stars.json';

// Constants
const STAR_DISTANCE_SCALE = 50000.0;

export interface StarDataProcessed {
    positions: Float32Array;
    magnitudes: Float32Array;
    colorIndices: Float32Array;
}

export const useStarData = (): StarDataProcessed => {
    return useMemo(() => {
        if (!Array.isArray(starData)) {
            console.error('starData is not an array');
            return { positions: new Float32Array(0), magnitudes: new Float32Array(0), colorIndices: new Float32Array(0) };
        }
        const count = starData.length;
        const positions = new Float32Array(count * 3);
        const magnitudes = new Float32Array(count);
        const colorIndices = new Float32Array(count);

        starData.forEach((star: any[], i: number) => {
            // Data format: [x, y, z, mag, bv]
            positions[i * 3] = star[0] * STAR_DISTANCE_SCALE;
            positions[i * 3 + 1] = star[1] * STAR_DISTANCE_SCALE;
            positions[i * 3 + 2] = star[2] * STAR_DISTANCE_SCALE;

            magnitudes[i] = star[3];
            colorIndices[i] = star[4];
        });

        return { positions, magnitudes, colorIndices };
    }, []);
};
