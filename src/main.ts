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

    // Try GSAP/ScrollTrigger, fallback to vanilla scroll if not available
    let gsapLoaded = false;
    try {
      // @ts-ignore
      const gsap = require("gsap");
      // @ts-ignore
      const { ScrollTrigger } = require("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      gsapLoaded = true;

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
    } catch (e) {
      console.warn(
        "GSAP/ScrollTrigger not available, using vanilla scroll fallback."
      );
    }

    // Fallback: Vanilla scroll handler if GSAP is not loaded
    if (!gsapLoaded) {
      let lastState: "HOME" | "SCROLL" = "HOME";
      window.addEventListener("scroll", () => {
        const homeSection = document.querySelector(".sc--home") as HTMLElement;
        if (!homeSection) return;
        const rect = homeSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        let scrollProgress = 0;
        if (rect.top <= 0 && rect.bottom >= 0) {
          const sectionHeight = rect.height;
          const scrolledDistance = Math.abs(rect.top);
          scrollProgress = Math.min(1, scrolledDistance / sectionHeight);
        } else if (rect.bottom < 0) {
          scrollProgress = 1;
        }
        if (scrollProgress > 0) {
          if (lastState !== "SCROLL") {
            animationSystem.startScrollToCenter();
            lastState = "SCROLL";
          }
          animationSystem.setScrollProgress(scrollProgress);
        } else {
          if (lastState !== "HOME") {
            animationSystem.resetToHome();
            lastState = "HOME";
          }
        }
      });
    }
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
