import { useState, useCallback, useEffect } from 'react';
import { CameraPoint } from '../types';

const STORAGE_KEY = 'orbital_camera_points';

export function useCameraPoints() {
    const [points, setPoints] = useState<CameraPoint[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load camera points', e);
        }
        return [];
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
        } catch (e) {
            console.error('Failed to save camera points', e);
        }
    }, [points]);

    const addPoint = useCallback((point: Omit<CameraPoint, 'id'>) => {
        const newPoint: CameraPoint = {
            ...point,
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        };
        setPoints(prev => [...prev, newPoint]);
    }, []);

    const removePoint = useCallback((id: string) => {
        setPoints(prev => prev.filter(p => p.id !== id));
    }, []);

    const getPointsForPlanet = useCallback((planetId: string) => {
        return points.filter(p => p.planetId === planetId);
    }, [points]);

    return {
        points,
        addPoint,
        removePoint,
        getPointsForPlanet,
    };
}
