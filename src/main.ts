import {
  initRenderer,
  setupLighting,
  renderer,
  scene,
  initialRender,
} from "./three_setup/scene";
import { loadModel } from "./three_setup/objects";
import { camera, initCamera } from "./camera";

async function init() {
  try {
    initCamera();
    await loadModel();

    initRenderer();
    setupLighting();
    initialRender();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
