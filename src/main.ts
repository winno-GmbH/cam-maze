import {
  startRenderLoop,
  onFrame,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import { updateHomeLoop, setupScrollHandling } from "./animation/HomeLoop";
import { loadModel } from "./core/objects";
import { setupCamera } from "./core/camera";

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);

  setupScrollHandling();

  onFrame(updateHomeLoop);

  startRenderLoop();
}

main();
