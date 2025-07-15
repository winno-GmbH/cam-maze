import {
  startRenderLoop,
  onFrame,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import {
  HomeLoopHandler,
  setupHomeLoopScrollHandler,
} from "./animation/HomeLoop";
import { POVAnimationHandler } from "./animation/POVAnimation";
import { loadModel, ghosts } from "./core/objects";
import { setupCamera } from "./core/camera";

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);

  // Initialize animation handlers
  HomeLoopHandler();
  const povHandler = new POVAnimationHandler(ghosts);

  startRenderLoop();
  setupHomeLoopScrollHandler();
}

main();
