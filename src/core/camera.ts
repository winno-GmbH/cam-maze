import * as THREE from "three";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

export function setupCamera(): void {
  camera.position.set(-2, 2.5, 2);
  camera.lookAt(new THREE.Vector3(-1.25, 0.5, 0.25));
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
  const startQuat = camera.quaternion.clone();
  const endPos = new THREE.Vector3(-1.5, 3, 2);
  const endTangent = new THREE.Vector3(-1.5, 3, 2);
  let endQuat: THREE.Quaternion | null = null;

  if (endPos && endTangent) {
    const lookAt = endPos.clone().add(endTangent);
    camera.position.copy(endPos);
    camera.lookAt(lookAt);
    endQuat = camera.quaternion.clone();
  }

  camera.position.copy(new THREE.Vector3(-2, 2.5, 2));
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

          const position = new THREE.Vector3(-2, 2.5, 2);
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
