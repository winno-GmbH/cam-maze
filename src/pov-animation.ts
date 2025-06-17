import * as THREE from "three";
import { camera } from "./camera";
import { ghosts } from "./objects";
import { DOM_ELEMENTS } from "./selectors";
import { getPathsForSection } from "./paths";

// Get all POV paths for camera and ghosts
const povPaths = getPathsForSection("pov") as Record<
  string,
  THREE.CurvePath<THREE.Vector3>
>;

// List of ghost keys to animate
const ghostKeys = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];

// --- Main update function (to be called in animation loop) ---
export function updatePOVAnimation(progress: number) {
  // 1. Move camera along camera POV path (use pacman/cameraPOV path)
  if (povPaths.pacman) {
    const camPos = povPaths.pacman.getPointAt(progress);
    camera.position.copy(camPos);
    // Optionally: camera lookAt logic can be added here
  }

  // 2. Move all ghosts along their respective POV paths
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    const path = povPaths[key];
    if (ghost && path) {
      const pos = path.getPointAt(progress);
      ghost.position.copy(pos);
      // Optionally: ghost lookAt logic can be added here
    }
  });

  // TODO: Add fade in/out logic and DOM trigger logic using DOM_ELEMENTS.parentElements, etc.
}

// --- POV ScrollTrigger Setup ---
export async function initPOVAnimationSystem() {
  // Dynamically import GSAP
  const gsapModule = await import("gsap");
  const scrollTriggerModule = await import("gsap/ScrollTrigger");
  const gsap = gsapModule.gsap || gsapModule.default;
  const ScrollTrigger =
    scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
  gsap.registerPlugin(ScrollTrigger);

  // Setup ScrollTrigger for .sc--pov
  ScrollTrigger.create({
    trigger: ".sc--pov",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.3,
    onUpdate: (self) => {
      // Progress von 0 (top top) bis 1 (bottom bottom)
      const progress = self.progress;
      updatePOVAnimation(progress);
    },
  });
}
