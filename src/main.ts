import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { initCamera, setupCameraResize, camera } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation-system";

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
