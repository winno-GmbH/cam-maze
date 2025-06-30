import { setupScene, startRenderLoop, onFrame } from "./core/scene";
import { updateHomeLoop } from "./animation/HomeLoop";

async function main() {
  await setupScene();

  // Register frame callbacks
  onFrame(updateHomeLoop);

  // Start the render loop
  startRenderLoop();
}

main();
