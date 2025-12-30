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
import { setupCamera } from "./core/camera";
import { initIntroScrollAnimation } from "./animation/intro-scroll";
import { initOutroScrollAnimation } from "./animation/outro-scroll";
import { initializeObjectStates } from "./animation/object-state";
import { createCameraRotationHUD } from "./core/camera-rotation-hud";

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

  setupHomeLoopScrollHandler();
  if (window.scrollY === 0) {
    startHomeLoop();
  }

  initPovScrollAnimation();
  initIntroScrollAnimation();
  initOutroScrollAnimation();
  initSkipButton();

  // Create camera rotation HUD
  createCameraRotationHUD();

  startRenderLoop();
}

main();
