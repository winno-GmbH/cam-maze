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
  let isScrolling = false;
  let scrollTimeout: number;

  window.addEventListener("scroll", () => {
    if (!isScrolling) {
      isScrolling = true;
      startScrollAnimation();
    }

    // Clear the timeout
    clearTimeout(scrollTimeout);

    // Set a timeout to detect when scrolling stops
    scrollTimeout = window.setTimeout(() => {
      isScrolling = false;
      returnToHomeLoop();
    }, 150); // Wait 150ms after scrolling stops
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
