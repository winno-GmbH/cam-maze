// TypeScript declarations for global GSAP/ScrollTrigger (CDN approach)
declare const gsap: any;
declare const ScrollTrigger: any;

import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem, animationSystem } from "./animation";

async function init() {
  try {
    initRenderer();
    setupLighting();
    initCamera();
    setupCameraResize();

    await loadModel();

    initAnimationSystem();

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: ".sc--home",
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      onUpdate: (self: any) => {
        if (animationSystem.getState() !== "SCROLL_TO_CENTER") {
          animationSystem.startScrollToCenter();
        }
        animationSystem.setScrollProgress(self.progress);
      },
      onLeaveBack: () => {
        animationSystem.resetToHome();
      },
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
