import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  createEnvironmentMap,
  scene,
} from "./core/scene";
import {
  setupHomeLoopScrollHandler,
  startHomeLoop,
} from "./animation/home-loop";
import { initPovScrollAnimation } from "./animation/pov-scroll";
import { loadModel } from "./core/objects";
import { setupCamera, camera } from "./core/camera";
import { initIntroScrollAnimation } from "./animation/intro-scroll";
import { initOutroScrollAnimation } from "./animation/outro-scroll";
import { initializeObjectStates } from "./animation/object-state";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getStartPosition, getLookAtPosition } from "./paths/pathpoints";

function initSkipButton() {
  const skipButton = document.querySelector(".wr_p--skip.wr_p");
  if (skipButton) {
    const finalSection = document.querySelector(".sc--testimonials");
    if (finalSection) {
      skipButton.addEventListener("click", () => {
        finalSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    }
  }
}

async function main() {
  initRenderer();
  setupLighting();
  createEnvironmentMap();
  setupCamera();
  await loadModel(scene);

  initializeObjectStates();

  initPovScrollAnimation();
  initIntroScrollAnimation();
  initOutroScrollAnimation();

  setupHomeLoopScrollHandler();
  
  ScrollTrigger.refresh();
  
  const introScrollTrigger = ScrollTrigger.getById("introScroll");
  const povScrollTrigger = ScrollTrigger.getById("povScroll");
  
  if (window.scrollY === 0) {
    if (introScrollTrigger?.isActive) {
      const introStartPosition = getStartPosition();
      const introLookAtPosition = getLookAtPosition();
      camera.position.set(introStartPosition.x, introStartPosition.y, introStartPosition.z);
      camera.lookAt(introLookAtPosition);
      camera.fov = 50;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    } else if (!povScrollTrigger || povScrollTrigger.progress === 0) {
      startHomeLoop();
    }
  } else {
    if (introScrollTrigger?.isActive) {
      const introStartPosition = getStartPosition();
      const introLookAtPosition = getLookAtPosition();
      camera.position.set(introStartPosition.x, introStartPosition.y, introStartPosition.z);
      camera.lookAt(introLookAtPosition);
      camera.fov = 50;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }
  }
  initSkipButton();

  startRenderLoop();
}

main();
