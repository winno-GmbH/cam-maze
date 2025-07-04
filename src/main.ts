import {
  setupScene,
  startRenderLoop,
  onFrame,
  initRenderer,
  setupLighting,
} from "./core/scene";
import { updateHomeLoop } from "./animation/HomeLoop";
import { initHomeScrollAnimation } from "./animation/HomeScroll";
import { loadModel } from "./core/objects";
import { setupCameraResize } from "./core/camera";

async function main() {
  initRenderer();
  setupLighting();
  await setupScene();

  // Register frame callbacks
  onFrame(updateHomeLoop);

  // Initialize home scroll animation
  initHomeScrollAnimation();

  // Start the render loop
  startRenderLoop();
}

main();
