import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { initCamera, setupCameraResize, camera } from "./camera";
import { loadModel, pacmanMixer, clock } from "./objects";
// import { initAnimationSystem } from "./animation-system";

// Initialize everything
async function init() {
  console.log("Starting CAM 3D Animation...");

  try {
    initRenderer();
    console.log("Renderer initialized");

    setupLighting();
    console.log("Lighting setup complete");

    initCamera();
    console.log("Camera initialized");

    setupCameraResize();
    console.log("Camera resize setup complete");

    console.log("Loading 3D model...");
    await loadModel();
    console.log("Model loading complete");

    // Initialize new animation system - commented out for now
    // console.log("Initializing animation system...");
    // initAnimationSystem();
    // console.log("Animation system initialized");

    // Simple render loop like backup.js
    function animate() {
      // Update pacman animation if available
      if (pacmanMixer) {
        const delta = clock.getDelta();
        pacmanMixer.update(delta);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    console.log("Starting animation loop");
    animate();

    // Debug scene contents
    console.log("Scene children count:", scene.children.length);
    scene.children.forEach((child, index) => {
      console.log(`Child ${index}:`, child.type, child.name || "unnamed");
    });
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
