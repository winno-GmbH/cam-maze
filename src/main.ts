import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation";
import { initIntroAnimations } from "./intro-animations";
import { initPOVAnimationSystem } from "./pov-animation";

async function init() {
  try {
    initRenderer();
    setupLighting();
    initCamera();
    setupCameraResize();

    await loadModel();

    initAnimationSystem();
    initIntroAnimations();
    await initPOVAnimationSystem();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Start the application
init();
