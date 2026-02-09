import * as THREE from "three";

// Global Dummy Textures to reuse across Earth and Moon
export const dummyTexture = new THREE.DataTexture(
  new Uint8Array([128, 128, 128, 255]),
  1,
  1,
);
dummyTexture.needsUpdate = true;

const dummyCanvas = document.createElement("canvas");
dummyCanvas.width = 1;
dummyCanvas.height = 1;
const dummyCtx = dummyCanvas.getContext("2d");
if (dummyCtx) {
  dummyCtx.fillStyle = "rgba(128, 128, 128, 1)";
  dummyCtx.fillRect(0, 0, 1, 1);
}
export const dummyCube = new THREE.CubeTexture([
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
  dummyCanvas,
]);
dummyCube.needsUpdate = true;
