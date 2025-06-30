import { setupScene } from "./core/scene";
import { updateHomeLoop } from "./animation/HomeLoop";

async function main() {
  await setupScene();
  startRenderLoop();
}

function startRenderLoop(): void {
  const render = () => {
    updateHomeLoop();
    // Rendering is now handled by the scene module's render loop
    requestAnimationFrame(render);
  };
  render();
}

main();
