import {
  initRenderer,
  setupLighting,
  renderer,
  scene,
} from "./three_setup/scene";
import { loadModel } from "./three_setup/objects";
import { camera, initCamera } from "./camera";

async function init() {
  try {
    initRenderer();
    setupLighting();

    await loadModel();

    initCamera();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
