import {
  startRenderLoop,
  onFrame,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import {
  setupHomeLoopScrollHandler,
  pausedPositions,
  pausedRotations,
} from "./animation/HomeLoop";
import { loadModel } from "./core/objects";
import { setupCamera } from "./core/camera";
import { initHomeScrollAnimation } from "./animation/HomeScroll";

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);
  setupHomeLoopScrollHandler();
  initHomeScrollAnimation(pausedPositions, pausedRotations);

  startRenderLoop();
}

main();
