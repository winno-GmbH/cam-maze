import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, camera } from "./core/camera";
import {
  updateHomeLoop,
  stopHomeLoop,
  startHomeLoop,
  startTransitionToHome,
  updateTransitionToHome,
} from "./animation/HomeLoop";
import {
  startHomeScrollAnimation,
  updateHomeScrollAnimation,
  stopHomeScrollAnimation,
} from "./animation/HomeScroll";
import { cameraHomePath } from "./paths/paths";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let startQuaternion: THREE.Quaternion | null = null;
let endQuaternion: THREE.Quaternion | null = null;

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    startQuaternion = camera.quaternion.clone();
    const endPos = cameraHomePath.getPoint(1);
    const endTangent = cameraHomePath.getTangent(1);
    if (endPos && endTangent) {
      const lookAt = endPos.clone().add(endTangent);
      camera.position.copy(endPos);
      camera.lookAt(lookAt);
      endQuaternion = camera.quaternion.clone();
    }
    camera.position.copy(cameraHomePath.getPoint(0));
    camera.quaternion.copy(startQuaternion);

    setupScrollHandling();
    setupCameraAndObjectAnimation();
    startRenderLoop();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    } else if (!wasAtTop && isAtTop) {
      startTransitionToHome();
    }
    wasAtTop = isAtTop;
  });
}

function setupCameraAndObjectAnimation() {
  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 1,
        onEnter: () => startHomeScrollAnimation(),
        onLeave: () => stopHomeScrollAnimation(),
        onEnterBack: () => startHomeScrollAnimation(),
        onLeaveBack: () => {
          stopHomeScrollAnimation();
          startTransitionToHome();
        },
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
          if (startQuaternion && endQuaternion) {
            const currentQuaternion = new THREE.Quaternion();
            currentQuaternion.slerpQuaternions(
              startQuaternion,
              endQuaternion,
              t
            );
            camera.quaternion.copy(currentQuaternion);
          }
          camera.updateProjectionMatrix();
          updateHomeScrollAnimation(t);
        },
      }
    );
}

function startRenderLoop(): void {
  const render = () => {
    updateHomeLoop();
    updateTransitionToHome();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

init();
