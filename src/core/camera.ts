import * as THREE from "three";
import {
  CAMERA_CONFIG,
  startPosition,
  secondPosition,
  lookAtPosition,
} from "../config/config";
import { cameraHomePath } from "../paths/paths";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

export function setupCameraAnimation(): void {
  // Initialize camera quaternions for animation
  const startQuat = camera.quaternion.clone();
  const endPos = cameraHomePath.getPoint(1);
  const endTangent = cameraHomePath.getTangent(1);
  let endQuat: THREE.Quaternion | null = null;

  if (endPos && endTangent) {
    const lookAt = endPos.clone().add(endTangent);
    camera.position.copy(endPos);
    camera.lookAt(lookAt);
    endQuat = camera.quaternion.clone();
  }

  camera.position.copy(cameraHomePath.getPoint(0));
  camera.quaternion.copy(startQuat);

  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 5,
      },
    })
    .to(
      { t: 0 },
      {
        t: 1,
        immediateRender: false,
        onUpdate: function () {
          const t = this.targets()[0].t;

          const position = cameraHomePath.getPoint(t);
          camera.position.copy(position);
          if (startQuat && endQuat) {
            const currentQuaternion = new THREE.Quaternion();
            currentQuaternion.slerpQuaternions(startQuat, endQuat, t);
            camera.quaternion.copy(currentQuaternion);
          }
          camera.updateProjectionMatrix();
        },
      }
    );
}
