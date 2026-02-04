import React from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ISSModelProps {
    scale?: number;
    modelType?: 'small' | 'big';
}

/**
 * ISS (International Space Station) 3D model
 * Loads either ISS.glb (small) or ISS2.glb (big) from the public/models folder
 */
const ISSModel: React.FC<ISSModelProps> = ({ scale = 1, modelType = 'small' }) => {
    const modelPath = modelType === 'big' ? "/models/ISS2.glb" : "/models/ISS.glb";
    const { scene } = useGLTF(modelPath);

    // Clone the scene to avoid issues with multiple instances
    const clonedScene = React.useMemo(() => {
        const clone = scene.clone();
        // Traverse and update materials if needed
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Ensure proper material settings for visibility
                if (child.material) {
                    const material = child.material as THREE.MeshStandardMaterial;
                    material.metalness = 0.5;
                    material.roughness = 0.5;
                }
            }
        });
        return clone;
    }, [scene]);

    return (
        <primitive
            object={clonedScene}
            scale={[scale, scale, scale]}
        />
    );
};

// Preload both models
useGLTF.preload("/models/ISS.glb");
useGLTF.preload("/models/ISS2.glb");

export default ISSModel;
