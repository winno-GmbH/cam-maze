import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation";

async function init() {
  try {
    await loadModel();

    initAnimationSystem();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
