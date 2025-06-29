import { renderer, scene, setupScene } from "./core/scene";
import { setupCameraAnimation, camera } from "./core/camera";
import { updateHomeLoop, setupScrollHandling } from "./animation/HomeLoop";

async function init() {
  try {
    await setupScene();

    setupScrollHandling();
    setupCameraAnimation();
    startRenderLoop();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function startRenderLoop(): void {
  const render = () => {
    updateHomeLoop();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

init();
