import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { getLookAtPosition, getStartPosition } from "../paths/pathpoints";

gsap.registerPlugin(ScrollTrigger);

export const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

export function setupCamera(): void {
  const startPosition = getStartPosition();
  const lookAtPosition = getLookAtPosition();
  console.log("setupCamera - startPosition:", startPosition);
  console.log("setupCamera - lookAtPosition:", lookAtPosition);
  camera.position.set(startPosition.x, startPosition.y, startPosition.z);
  camera.lookAt(lookAtPosition.x, lookAtPosition.y, lookAtPosition.z);
  console.log("setupCamera - camera.position:", camera.position);
  console.log("setupCamera - camera.quaternion:", camera.quaternion);
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
