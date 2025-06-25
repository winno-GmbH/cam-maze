import { initRenderer, setupLighting } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera } from "./core/camera";

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();

    initRenderer();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
