import * as THREE from "three";
import {
  CAMERA_CONFIG,
  startPosition,
  secondPosition,
  lookAtPosition,
} from "./config";
import { container } from "./scene";

// Camera Setup
export const camera = new THREE.PerspectiveCamera(
  CAMERA_CONFIG.originalFOV,
  container.clientWidth / container.clientHeight,
  CAMERA_CONFIG.near,
  CAMERA_CONFIG.far
);

// Initialize Camera
export function initCamera(): void {
  console.log("Camera start position:", startPosition);
  console.log("Camera look at position:", lookAtPosition);

  camera.position.copy(startPosition);
  camera.lookAt(lookAtPosition);

  console.log("Camera actual position:", camera.position);
  console.log("Camera actual target:", lookAtPosition);

  // Add a simple fallback position for debugging
  // Position camera to look at the maze center (0.5, 0.5, 0.5)
  camera.position.set(2, 2, 2);
  camera.lookAt(0.5, 0.5, 0.5);

  console.log("Camera debug position set to:", camera.position);
  console.log("Camera looking at maze center: (0.5, 0.5, 0.5)");
}

// Camera Quaternions
export const startQuaternion = camera.quaternion.clone();
export const endQuaternion = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-1.5708, 0, 0)
);

// Camera Utility Functions
export function getCameraLookAtPoint(): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

// Global camera setter for debugging
(window as any).setCamera = function (lookAt: string | THREE.Vector3): void {
  if (typeof lookAt === "string") {
    const [x, y, z] = lookAt.split(",").map(Number);
    lookAt = new THREE.Vector3(x, y, z);
  }
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  camera.updateMatrix();
  camera.updateMatrixWorld();
};

// Resize Handler
export function setupCameraResize(): void {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}
