import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { initCamera, setupCameraResize, camera } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation-system";
import { initFinalAnimations } from "./final-animations";

// Initialize everything
async function init() {
  try {
    initRenderer();

    setupLighting();

    initCamera();

    setupCameraResize();

    await loadModel();

    // Initialize animation system (handles rendering and animations)
    initAnimationSystem();

    // Initialize final animations
    initFinalAnimations();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
