import { initRenderer, setupLighting, renderer, scene } from "./core/scene";
import { loadModel } from "./core/objects";
import { initCamera, camera } from "./core/camera";
import {
  updateHomeLoop,
  stopHomeLoop,
  startHomeLoop,
} from "./animation/HomeLoop";
import { cameraHomePath } from "./paths/paths";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

async function init() {
  try {
    initCamera();
    await loadModel();
    setupLighting();
    initRenderer();

    // Add scroll event listener
    setupScrollHandling();

    // Setup camera animation
    setupCameraAnimation();

    startRenderLoop();

    console.log("🚀 Application initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    // If we just left the top of the page
    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    }
    // If we just returned to the top of the page
    else if (!wasAtTop && isAtTop) {
      startHomeLoop();
    }

    wasAtTop = isAtTop;
  });
}

function setupCameraAnimation() {
  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      },
    })
    .to(
      {},
      {
        duration: 1,
        onUpdate: function () {
          const progress = this.progress();
          const position = cameraHomePath.getPointAt(progress);
          camera.position.copy(position);

          // Calculate camera rotation based on path tangent
          const tangent = cameraHomePath.getTangentAt(progress);
          if (tangent && tangent.length() > 0) {
            const lookAtPoint = position.clone().add(tangent.normalize());
            camera.lookAt(lookAtPoint);
          }

          camera.updateProjectionMatrix();
        },
      }
    );
}

function startRenderLoop(): void {
  const render = () => {
    updateHomeLoop();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
}

// Start the application
init();
