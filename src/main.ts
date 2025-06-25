import { initRenderer, setupLighting } from "./three_setup/scene";
import { loadModel } from "./three_setup/objects";
import { initCamera } from "./camera";

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
