import React, { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ISSModelProps {
    scale?: number;
    modelType?: 'small' | 'big';
    layer?: number;
}

const BASE_URL = import.meta.env.BASE_URL;

/**
 * ISS (International Space Station) 3D model
 * Loads either ISS.glb (small) or ISS2.glb (big) from the public/models folder
 */
const ISSModel: React.FC<ISSModelProps> = ({ scale = 1, modelType = 'small', layer = 0 }) => {
    const modelPath = `${BASE_URL}models/ISS.glb`;
    const { scene } = useGLTF(modelPath);

    useEffect(() => {
        scene.traverse((child) => {
            child.layers.set(layer);
        });
    }, [scene, layer]);

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
                            // Fix for ISS model transparency/holes
                            material.transparent = false;
                            material.alphaTest = 0; // Disable alpha discard
                            material.depthWrite = true; // Force depth writing
                            material.opacity = 1.0;
                            material.side = THREE.FrontSide; // Ensure standard culling
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
            rotation={modelType === 'big' ? [Math.PI / 2, Math.PI, 0] : [0, 0, 0]}
        />
    );
};

// Preload model
useGLTF.preload(`${BASE_URL}models/ISS.glb`);

export default ISSModel;
