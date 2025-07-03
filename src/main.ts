import { setupScene, startRenderLoop, onFrame } from "./core/scene";
import { updateHomeLoop } from "./animation/HomeLoop";
import { initHomeScrollAnimation } from "./animation/HomeScroll";

async function main() {
  await setupScene();

  onFrame(updateHomeLoop);

  initHomeScrollAnimation();

  startRenderLoop();
}

main();
