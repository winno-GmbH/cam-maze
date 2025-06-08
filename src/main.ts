import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { initCamera, setupCameraResize, camera } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation-system";

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

    // Initialize new animation system
    console.log("Initializing animation system...");
    initAnimationSystem();

    // Basic render loop
    function animate() {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
    console.log("Animation loop started");

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
