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

export function setupCameraAnimation(): void {
  const startQuat = camera.quaternion.clone();
  console.log("setupCameraAnimation - startQuat:", startQuat);
  const endPos = new THREE.Vector3(-1.5, 3, 2);
  const endTangent = new THREE.Vector3(-1.5, 3, 2);
  let endQuat: THREE.Quaternion | null = null;

  if (endPos && endTangent) {
    const lookAt = endPos.clone().add(endTangent);
    camera.position.copy(endPos);
    camera.lookAt(lookAt);
    endQuat = camera.quaternion.clone();
    console.log("setupCameraAnimation - endQuat:", endQuat);
  }

  const animationStartPos = new THREE.Vector3(-2, 2.5, 2);
  console.log("setupCameraAnimation - animationStartPos:", animationStartPos);
  console.log(
    "setupCameraAnimation - current camera.position:",
    camera.position
  );
  camera.position.copy(animationStartPos);
  camera.quaternion.copy(startQuat);
  console.log(
    "setupCameraAnimation - after setting position:",
    camera.position
  );

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
          console.log(
            "Animation onUpdate - t:",
            t,
            "camera.position:",
            camera.position
          );

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
