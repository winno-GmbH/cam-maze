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

export function setupCameraResize(): void {
  const updateCamera = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  window.addEventListener("resize", updateCamera);
}
