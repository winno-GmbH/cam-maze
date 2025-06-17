import * as THREE from "three";
import {
  CAMERA_CONFIG,
  startPosition,
  secondPosition,
  lookAtPosition,
} from "./config";

export const camera = new THREE.PerspectiveCamera(
  CAMERA_CONFIG.originalFOV,
  window.innerWidth / window.innerHeight,
  CAMERA_CONFIG.near,
  CAMERA_CONFIG.far
);

export function initCamera(): void {
  camera.position.copy(startPosition);
  camera.lookAt(lookAtPosition);
}

export const startQuaternion = camera.quaternion.clone();
export const endQuaternion = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-1.5708, 0, 0)
);

export function getCameraLookAtPoint(): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

/*(window as any).setCamera = function (lookAt: string | THREE.Vector3): void {
  if (typeof lookAt === "string") {
    const [x, y, z] = lookAt.split(",").map(Number);
    lookAt = new THREE.Vector3(x, y, z);
  }
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  camera.updateMatrix();
  camera.updateMatrixWorld();
};*/

export function setupCameraResize(): void {
  const updateCamera = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  window.addEventListener("resize", updateCamera);
}
