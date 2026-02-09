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
  const _quat = useRef(new THREE.Quaternion());
  const _offset = useRef(new THREE.Vector3());

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

    // Vertical (W/C) — along camera up axis
    let moveY = 0;
    if (keys.has("w")) moveY += 1;
    if (keys.has("c")) moveY -= 1;

    if (moveX !== 0 || moveZ !== 0 || moveY !== 0) {
      const up = camera.up;
      const dx = right.x * moveX + forward.x * moveZ + up.x * moveY;
      const dy = right.y * moveX + forward.y * moveZ + up.y * moveY;
      const dz = right.z * moveX + forward.z * moveZ + up.z * moveY;

      camera.position.x += dx * speed;
      camera.position.y += dy * speed;
      camera.position.z += dz * speed;
      target.x += dx * speed;
      target.y += dy * speed;
      target.z += dz * speed;
    }

    // Rotation (A/E) — orbit around target, respecting camera up axis
    if (keys.has("a") || keys.has("e")) {
      const angle = keys.has("a") ? rotSpeed : -rotSpeed;

      // Rotate camera position around the camera.up axis through target
      const offset = _offset.current.subVectors(camera.position, target);
      const quat = _quat.current.setFromAxisAngle(camera.up, angle);
      offset.applyQuaternion(quat);
      camera.position.copy(target).add(offset);
    }
  }, 2); // Priority 2: after camera follow (priority 1)

  return null;
};

export default KeyboardCameraController;
