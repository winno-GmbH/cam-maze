import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation";
import { animate } from "./animation";

async function init() {
  try {
    initRenderer();
    setupLighting();
    initCamera();
    setupCameraResize();

    await loadModel();

    initAnimationSystem();
    animate();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
