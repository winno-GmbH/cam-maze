import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, camera } from "./core/camera";
import { updateHomeLoop, initHomeLoop } from "./animation/HomeLoop";

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    // Initialize arc length tables for home loop
    initHomeLoop();

    // Start the main render loop
    startRenderLoop();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function startRenderLoop(): void {
  const render = () => {
    updateHomeLoop();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

init();
