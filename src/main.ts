import { setupScene, startRenderLoop, onFrame } from "./core/scene";
import { updateHomeLoop } from "./animation/HomeLoop";
import { initHomeScrollAnimation } from "./animation/HomeScroll";

async function main() {
  await setupScene();

  // Register frame callbacks
  onFrame(updateHomeLoop);

  // Initialize home scroll animation
  initHomeScrollAnimation();

  // Start the render loop
  startRenderLoop();
}

main();
