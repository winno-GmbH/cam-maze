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

    // Scroll trigger for torn-to-center
    let tornTriggered = false;
    function checkScrollTrigger() {
      // Option 1: Trigger when .sc--final is in view
      const finalSection = document.querySelector(".sc--final");
      if (finalSection) {
        const rect = finalSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && !tornTriggered) {
          tornTriggered = true;
          animationSystem.triggerTornToCenter();
        }
      } else {
        // Option 2: Trigger when scrolled to bottom
        if (
          window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 10 &&
          !tornTriggered
        ) {
          tornTriggered = true;
          animationSystem.triggerTornToCenter();
        }
      }
    }
    window.addEventListener("scroll", checkScrollTrigger);
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
