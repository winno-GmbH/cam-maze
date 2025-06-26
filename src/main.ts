import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, camera } from "./core/camera";
import {
  animationController,
  startScrollAnimation,
  returnToHomeLoop,
} from "./animation";

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    setupScrollHandling();

    startRenderLoop();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      startScrollAnimation();
    } else if (!wasAtTop && isAtTop) {
      returnToHomeLoop();
    }

    wasAtTop = isAtTop;
  });
}

function startRenderLoop(): void {
  const render = () => {
    animationController.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

init();
