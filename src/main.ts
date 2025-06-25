import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { loadModel } from "./objects";
import { animationSystem } from "./animation";
import { camera, initCamera } from "./camera";

function render(): void {
  animationSystem.update();

  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

async function init() {
  try {
    initRenderer();
    setupLighting();

    await loadModel();

    initCamera();
    render();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
