import { initRenderer, setupLighting } from "./scene";
import { initCamera, setupCameraResize } from "./camera";
import { loadModel } from "./objects";
import { initAnimationSystem, animationSystem } from "./animation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

console.log("GSAP import:", gsap);
console.log("ScrollTrigger import:", ScrollTrigger);
gsap.registerPlugin(ScrollTrigger);
console.log("GSAP after register:", gsap);
console.log("ScrollTrigger after register:", ScrollTrigger);

async function init() {
  try {
    initRenderer();
    setupLighting();
    initCamera();
    setupCameraResize();

    await loadModel();

    initAnimationSystem();

    ScrollTrigger.create({
      trigger: ".sc--home",
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
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
