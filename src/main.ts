import {
  startRenderLoop,
  onFrame,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import { updateHomeLoop } from "./animation/HomeLoop";
import { initHomeScrollAnimation } from "./animation/HomeScroll";
import { loadModel } from "./core/objects";

async function main() {
  initRenderer();
  setupLighting();
  await loadModel(scene);

  onFrame(updateHomeLoop);

  initHomeScrollAnimation();

  startRenderLoop();
}

main();
