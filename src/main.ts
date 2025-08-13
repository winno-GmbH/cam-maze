import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import {
  homeLoopHandler,
  setupHomeLoopScrollHandler,
} from "./animation/home-loop";
import { initPovScrollAnimation } from "./animation/pov-scroll";
import { loadModel } from "./core/objects";
import { setupCamera, camera } from "./core/camera";
import * as THREE from "three";
import { X, XCoordKey, Z, ZCoordKey } from "./paths/coordinates";
import { initIntroScrollAnimation } from "./animation/intro-scroll";
import { initOutroScrollAnimation } from "./animation/outro-scroll";

// Declare global window interface for debug commands
declare global {
  interface Window {
    lookAt: (x: XCoordKey, y: number, z: ZCoordKey) => void;
  }
}

function initSkipButton() {
  const skipButton = document.querySelector(".wr_p--skip.wr_p");
  if (skipButton) {
    const finalSection = document.querySelector(".sc--testimonials");
    if (finalSection) {
      skipButton.addEventListener("click", () => {
        finalSection.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      });
    }
  }
}

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);

  homeLoopHandler();
  setupHomeLoopScrollHandler();

  initPovScrollAnimation();
  initIntroScrollAnimation();
  initOutroScrollAnimation();
  initSkipButton();
  startRenderLoop();
}

main();
