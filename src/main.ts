import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem, animationSystem } from "./animation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

async function init() {
  try {
    initRenderer();
    setupLighting();
    initCamera();
    setupCameraResize();

    await loadModel();

    // Slow down the home animation loop to match backup.js (0.03 speed)
    // This is done by setting animationDuration to a higher value (e.g., 33s for a full loop)
    // You may want to expose this as a setter in animationSystem if not already
    if ((animationSystem as any).animationDuration !== undefined) {
      (animationSystem as any).animationDuration = 33; // 1/0.03 ≈ 33s for a full loop
    }

    initAnimationSystem();

    // GSAP ScrollTrigger for torn-to-center
    ScrollTrigger.create({
      trigger: ".sc--home", // Adjust selector as needed
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      onUpdate: (self: ScrollTrigger) => {
        if (animationSystem.getState() !== "SCROLL_TO_CENTER") {
          animationSystem.startScrollToCenter();
        }
        animationSystem.setScrollProgress(self.progress);
      },
      onLeaveBack: () => {
        animationSystem.resetToHome();
      },
      onLeave: () => {
        // Optionally, keep at center or reset
        // animationSystem.resetToHome();
      },
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
