import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, setupCameraAnimation, camera } from "./core/camera";
import { updateHomeLoop, setupScrollHandling } from "./animation/HomeLoop";

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    setupScrollHandling();
    setupCameraAnimation();
    startRenderLoop();
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
