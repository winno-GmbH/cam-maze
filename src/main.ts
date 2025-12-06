import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  scene,
  renderer,
  setRenderThrottle,
  resetRenderThrottle,
} from "./core/scene";
import { performanceMonitor } from "./core/performance-monitor";
import {
  setupHomeLoopScrollHandler,
  startHomeLoop,
} from "./animation/home-loop";
import { initPovScrollAnimation } from "./animation/pov-scroll";
import { loadModel } from "./core/objects";
import { setupCamera } from "./core/camera";
import { initIntroScrollAnimation } from "./animation/intro-scroll";
import { initOutroScrollAnimation } from "./animation/outro-scroll";
import { initializeObjectStates } from "./animation/object-state";

function initSkipButton() {
  const skipButton = document.querySelector(".wr_p--skip.wr_p");
  if (skipButton) {
    const finalSection = document.querySelector(".sc--testimonials");
    if (finalSection) {
      skipButton.addEventListener("click", () => {
        finalSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    }
  }
}

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);

  initializeObjectStates();

  setupHomeLoopScrollHandler();
  if (window.scrollY === 0) {
    startHomeLoop();
  }

  initPovScrollAnimation();
  initIntroScrollAnimation();
  initOutroScrollAnimation();
  initSkipButton();
  startRenderLoop();

  performanceMonitor.enable(renderer);

  if (typeof window !== "undefined") {
    (window as any).performanceMonitor = performanceMonitor;
    (window as any).enablePerformanceMonitor = () => {
      performanceMonitor.enable(renderer);
    };
    (window as any).disablePerformanceMonitor = () => {
      performanceMonitor.disable();
    };
    (window as any).togglePerformanceMonitor = () => {
      performanceMonitor.toggle(renderer);
    };
    (window as any).simulateSlowDevice = (
      level: "low" | "medium" | "very-low" = "medium"
    ) => {
      performanceMonitor.simulateSlowDevice(level);
      const throttleFactor = performanceMonitor.getThrottleFactor();
      const delay = performanceMonitor.getArtificialDelay();
      setRenderThrottle(throttleFactor, delay);
      console.log(
        `Slow device simulation activated: ${level} (throttle: ${throttleFactor}x, delay: ${delay}ms)`
      );
    };
    (window as any).resetPerformanceThrottle = () => {
      performanceMonitor.resetThrottle();
      resetRenderThrottle();
      console.log("Performance throttle reset");
    };
  }
}

main();
