import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ISSModelProps {
    scale?: number;
}

/**
 * ISS (International Space Station) 3D model
 * Loads the ISS.glb model from the public/models folder
 */
const ISSModel: React.FC<ISSModelProps> = ({ scale = 1 }) => {
    const { scene } = useGLTF("/models/ISS.glb");
    
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

// Preload the model
useGLTF.preload("/models/ISS.glb");

export default ISSModel;
