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
          const startPos = getStartPosition();
          const endPos = new THREE.Vector3(-1.5, 3, 2);
          const position = startPos.clone().lerp(endPos, t);
          camera.position.copy(position);

          const startLookAt = getLookAtPosition();
          const endLookAt = new THREE.Vector3(-1.25, 0.5, 0.25);
          const lookAt = startLookAt.clone().lerp(endLookAt, t);
          camera.lookAt(lookAt);
          camera.updateProjectionMatrix();
        },
      }
    );
}
