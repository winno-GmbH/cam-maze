import * as THREE from "three";
import { getLookAtPosition, getStartPosition } from "../paths/pathpoints";

const CAMERA_NEAR = 0.001;
const CAMERA_FAR = 100;

export const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  CAMERA_NEAR,
  CAMERA_FAR
);

export function setupCamera(): void {
  const startPosition = getStartPosition();
  const lookAtPosition = getLookAtPosition();
  camera.position.set(startPosition.x, startPosition.y, startPosition.z);
  camera.lookAt(lookAtPosition.x, lookAtPosition.y, lookAtPosition.z);
}
