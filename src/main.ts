import { initRenderer, setupLighting } from "./scene";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation";

async function init() {
  try {
    initRenderer();
    setupLighting();

    await loadModel();

    initAnimationSystem();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
