import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import {
  HomeLoopHandler,
  setupHomeLoopScrollHandler,
} from "./animation/HomeLoop";
import { loadModel } from "./core/objects";
import { setupCamera } from "./core/camera";

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);
  console.log("scene", scene);

  HomeLoopHandler();

  startRenderLoop();
  setupHomeLoopScrollHandler();
}

main();
