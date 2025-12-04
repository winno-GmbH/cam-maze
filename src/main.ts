import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  scene,
  createDebugLines,
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
  setupCamera();
  createDebugLines();
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
  startRenderLoop();
}

main();
