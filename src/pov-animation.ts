import * as THREE from "three";
import { camera } from "./camera";
import { ghosts } from "./objects";
import { DOM_ELEMENTS } from "./selectors";
import { getPathsForSection } from "./paths";
import { MAZE_CENTER } from "./config";

// Flag to track POV animation state
let isPOVAnimationActive = false;

// Camera FOV settings
const POV_FOV = 80; // Wider FOV for POV animation
const DEFAULT_FOV = 50; // Default FOV

// Get all POV paths for camera and ghosts
const povPaths = getPathsForSection("pov") as Record<
  string,
  THREE.CurvePath<THREE.Vector3>
>;

// Debug: Log the paths to see what we're working with
console.log("POV Paths loaded:", Object.keys(povPaths));
console.log("Maze Center:", MAZE_CENTER);
Object.entries(povPaths).forEach(([key, path]) => {
  console.log(`${key} path length:`, path.getLength());
  console.log(`${key} start point:`, path.getPointAt(0));
  console.log(`${key} end point:`, path.getPointAt(1));

  // Test a few points along the path to see the Y values
  for (let i = 0; i <= 10; i++) {
    const progress = i / 10;
    const point = path.getPointAt(progress);
    console.log(`${key} at ${progress * 100}%:`, point);
  }
});

// List of ghost keys to animate
const ghostKeys = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];

// Debug: Check if ghosts exist
console.log("Available ghosts:", Object.keys(ghosts));
ghostKeys.forEach((key) => {
  console.log(`${key} exists:`, !!ghosts[key]);
  if (ghosts[key]) {
    console.log(`${key} position:`, ghosts[key].position);
    console.log(`${key} visible:`, ghosts[key].visible);
  }
});

// Debug: Check camera
console.log("Camera position:", camera.position);
console.log("Camera FOV:", camera.fov);

// Export function to check if POV is active (for animation system)
export function isPOVActive(): boolean {
  return isPOVAnimationActive;
}

// Test function to manually trigger POV animation
export function testPOVAnimation(progress: number = 0.5) {
  console.log("=== TESTING POV ANIMATION ===");
  console.log("Testing at progress:", progress);
  updatePOVAnimation(progress);
  console.log("=== END TEST ===");
}

// --- Main update function (to be called in animation loop) ---
export function updatePOVAnimation(progress: number) {
  // Set POV as active
  isPOVAnimationActive = true;

  // Debug: Log progress
  if (progress % 0.1 < 0.01) {
    // Log every 10% progress
    console.log("POV Animation Progress:", progress);
  }

  // 1. Move camera along camera POV path (use pacman/cameraPOV path)
  if (povPaths.pacman) {
    let camPos = povPaths.pacman.getPointAt(progress);

    // FIX: Ensure camera is above the maze (minimum Y = 0.5)
    if (camPos.y < 0.5) {
      camPos = new THREE.Vector3(camPos.x, 0.5, camPos.z);
    }

    camera.position.copy(camPos);

    // Debug: Log camera movement
    if (progress % 0.1 < 0.01) {
      console.log("Camera moved to:", camPos);
      console.log("Distance from maze center:", camPos.distanceTo(MAZE_CENTER));
    }

    // Add basic lookAt logic - look at maze center or forward along the path
    const lookAheadProgress = Math.min(progress + 0.1, 1);
    const lookAheadPos = povPaths.pacman.getPointAt(lookAheadProgress);

    // Ensure look-ahead position is also above ground
    if (lookAheadPos.y < 0.5) {
      const fixedLookAhead = new THREE.Vector3(
        lookAheadPos.x,
        0.5,
        lookAheadPos.z
      );
      camera.lookAt(fixedLookAhead);
    } else {
      camera.lookAt(lookAheadPos);
    }

    // Set POV FOV
    camera.fov = POV_FOV;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  } else {
    console.error("No camera POV path found!");
  }

  // 2. Move all ghosts along their respective POV paths
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    const path = povPaths[key];
    if (ghost && path) {
      const pos = path.getPointAt(progress);
      ghost.position.copy(pos);

      // Debug: Log ghost movement
      if (progress % 0.1 < 0.01) {
        console.log(`${key} moved to:`, pos);
      }

      // Add basic lookAt logic for ghosts
      const lookAheadProgress = Math.min(progress + 0.1, 1);
      const lookAheadPos = path.getPointAt(lookAheadProgress);
      ghost.lookAt(lookAheadPos);

      // Ensure ghost is visible
      ghost.visible = true;
    } else {
      if (!ghost) console.error(`Ghost ${key} not found!`);
      if (!path) console.error(`Path for ${key} not found!`);
    }
  });

  // TODO: Add fade in/out logic and DOM trigger logic using DOM_ELEMENTS.parentElements, etc.
}

// Function to stop POV animation
export function stopPOVAnimation() {
  isPOVAnimationActive = false;
  // Reset camera FOV to default
  camera.fov = DEFAULT_FOV;
  camera.updateProjectionMatrix();
  console.log("POV Animation stopped");
}

// --- POV ScrollTrigger Setup ---
export async function initPOVAnimationSystem() {
  console.log("Initializing POV Animation System...");

  // Check if POV section exists
  if (!DOM_ELEMENTS.povSection) {
    console.error("POV section not found! Check if .sc--pov.sc exists in HTML");
    return;
  }
  console.log("POV section found:", DOM_ELEMENTS.povSection);

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
      console.log("ScrollTrigger progress:", progress);
      updatePOVAnimation(progress);
    },
    onEnter: () => {
      console.log("POV section entered!");
      isPOVAnimationActive = true;
    },
    onLeave: () => {
      console.log("POV section left!");
      isPOVAnimationActive = false;
      // Reset camera FOV when leaving POV section
      camera.fov = DEFAULT_FOV;
      camera.updateProjectionMatrix();
    },
  });

  console.log("POV Animation System initialized successfully!");

  // Test the animation after a short delay
  setTimeout(() => {
    console.log("Testing POV animation...");
    testPOVAnimation(0.5);
  }, 2000);
}
