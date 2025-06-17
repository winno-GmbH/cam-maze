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
        // Check if we're at the very top of the page for a full reset
        const isAtTop = window.scrollY <= 10;
        animationSystem.resetToHome(isAtTop);
      },
    });

    // Additional scroll listener for full reset when at very top (like legacy system)
    window.addEventListener("scroll", () => {
      // Check if we're at the very top of the page (above home section)
      if (window.scrollY <= 10) {
        animationSystem.resetToHome(true);
      }
    });

    // Expose animation system globally for debugging
    (window as any).animationSystem = animationSystem;
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Start the application
init();
