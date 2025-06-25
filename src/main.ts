import { initRenderer, setupLighting, renderer, scene } from "./scene";
import { loadModel } from "./objects";
import { camera, initCamera } from "./camera";

async function init() {
  try {
    initRenderer();
    setupLighting();

    await loadModel();

    initCamera();
    renderer.render(scene, camera);
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
