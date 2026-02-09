import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboardControls } from "../hooks/useKeyboardControls";

interface Props {
  controlsRef: React.RefObject<any>;
}

const MOVE_SPEED = 0.8;
const ROTATE_SPEED = 1.5;

const KeyboardCameraController: React.FC<Props> = ({ controlsRef }) => {
  const { camera } = useThree();
  const keysRef = useKeyboardControls();

  // Pre-allocated vectors to avoid GC
  const _forward = useRef(new THREE.Vector3());
  const _right = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const keys = keysRef.current;
    if (keys.size === 0 || !controlsRef.current) return;

    const controls = controlsRef.current;
    const target = controls.target as THREE.Vector3;

    // Speed scales with distance to target
    const dist = camera.position.distanceTo(target);
    const speed = dist * MOVE_SPEED * delta;
    const rotSpeed = ROTATE_SPEED * delta;

    // Forward: camera → target direction (projected on horizontal plane)
    const forward = _forward.current
      .subVectors(target, camera.position)
      .normalize();

    // Right: perpendicular to forward and camera up
    const right = _right.current.crossVectors(forward, camera.up).normalize();

    // Translation (Z/S/Q/D + Arrows)
    let moveX = 0;
    let moveZ = 0;

    if (keys.has("z") || keys.has("ArrowUp")) moveZ += 1;
    if (keys.has("s") || keys.has("ArrowDown")) moveZ -= 1;
    if (keys.has("q") || keys.has("ArrowLeft")) moveX -= 1;
    if (keys.has("d") || keys.has("ArrowRight")) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const dx = right.x * moveX + forward.x * moveZ;
      const dy = right.y * moveX + forward.y * moveZ;
      const dz = right.z * moveX + forward.z * moveZ;

      camera.position.x += dx * speed;
      camera.position.y += dy * speed;
      camera.position.z += dz * speed;
      target.x += dx * speed;
      target.y += dy * speed;
      target.z += dz * speed;
    }

    // Rotation (A/E) — orbit around target
    if (keys.has("a") || keys.has("e")) {
      const angle = keys.has("a") ? rotSpeed : -rotSpeed;

      // Rotate camera position around target on the horizontal plane
      const offset = _forward.current.subVectors(camera.position, target);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const nx = offset.x * cosA - offset.z * sinA;
      const nz = offset.x * sinA + offset.z * cosA;
      camera.position.x = target.x + nx;
      camera.position.z = target.z + nz;
    }
  }, 2); // Priority 2: after camera follow (priority 1)

  return null;
};

export default KeyboardCameraController;
