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

    // Add scroll event listener
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

    // If we just left the top of the page
    if (wasAtTop && !isAtTop) {
      startScrollAnimation();
    }
    // If we just returned to the top of the page
    else if (!wasAtTop && isAtTop) {
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

// Start the application
init();
