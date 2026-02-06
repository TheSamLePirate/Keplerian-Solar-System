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
                child.castShadow = true;
                child.receiveShadow = true;
                // Ensure proper material settings for visibility
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((material) => {
                        if (material instanceof THREE.MeshStandardMaterial) {
                            material.metalness = 0.5;
                            material.roughness = 0.5;
                            material.needsUpdate = true;
                        }
                    });
                }
            }
        });
        return clone;
    }, [scene]);

    return (
        <primitive
            object={clonedScene}
            scale={[scale, scale, scale]}
            rotation={modelType === 'big' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
        />
    );
};

// Preload both models
useGLTF.preload("/models/ISS.glb");
useGLTF.preload("/models/ISS2.glb");

export default ISSModel;
