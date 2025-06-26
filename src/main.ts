import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, camera } from "./core/camera";
import { AnimationManager } from "./animation";

let animationManager: AnimationManager;

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    // Initialize animation system
    animationManager = new AnimationManager();

    // Start the Home Loop animation
    animationManager.startHomeLoop();

    // Start the main render loop
    startRenderLoop();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function startRenderLoop(): void {
  const render = () => {
    // Update animation system
    animationManager.update();

    // Render the scene
    renderer.render(scene, camera);

    // Continue the loop
    requestAnimationFrame(render);
  };

  render();
}

init();
