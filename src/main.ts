import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { initCamera, setupCameraResize, camera } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation-system";

// Initialize everything
async function init() {
  console.log("Starting CAM 3D Animation...");

  initRenderer();
  setupLighting();
  initCamera();
  setupCameraResize();

  await loadModel();

  // Initialize new animation system
  initAnimationSystem();

  // Basic render loop
  function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
