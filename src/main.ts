import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import {
  homeLoopHandler,
  setupHomeLoopScrollHandler,
} from "./animation/home-loop";
import { loadModel } from "./core/objects";
import { setupCamera } from "./core/camera";

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);

  homeLoopHandler();
  setupHomeLoopScrollHandler();

  startRenderLoop();
}

main();
