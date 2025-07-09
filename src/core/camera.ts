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
  camera.position.set(startPosition.x, startPosition.y, startPosition.z);
  camera.lookAt(lookAtPosition.x, lookAtPosition.y, lookAtPosition.z);
}
