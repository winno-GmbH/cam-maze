import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, camera } from "./core/camera";
import { startHomeLoop } from "./animation/HomeLoop";

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    // Start the Home Loop animation
    startHomeLoop();

    // Start the main render loop
    startRenderLoop();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function startRenderLoop(): void {
  const render = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

init();
