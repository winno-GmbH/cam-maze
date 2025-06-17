// TypeScript declarations for global GSAP/ScrollTrigger (CDN approach)
declare const gsap: any;
declare const ScrollTrigger: any;

import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem } from "./animation";

async function init() {
  try {
    initRenderer();
    setupLighting();
    initCamera();
    setupCameraResize();

    await loadModel();

    initAnimationSystem();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Start the application
init();
