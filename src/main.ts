import {
  startRenderLoop,
  onFrame,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import { HomeLoopHandler } from "./animation/HomeLoop";
import { loadModel } from "./core/objects";
import { setupCamera } from "./core/camera";

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);
  HomeLoopHandler();
  startRenderLoop();
}

main();
