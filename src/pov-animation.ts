import * as THREE from "three";
import { camera } from "./camera";
import { ghosts } from "./objects";
import { DOM_ELEMENTS } from "./selectors";
import { getPathsForSection } from "./paths";
import { MAZE_CENTER } from "./config";
import { TriggerPositions } from "./triggers";

// Flag to track POV animation state
let isPOVAnimationActive = false;

// Camera FOV settings
const POV_FOV = 80; // Wider FOV for POV animation
const DEFAULT_FOV = 50; // Default FOV

// Camera manual rotation override
let cameraManualRotation: THREE.Quaternion | null = null;
export function setCameraManualRotation(q: THREE.Quaternion | null) {
  cameraManualRotation = q;
}

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

// Store previous camera quaternion for slerp
let prevCameraQuat: THREE.Quaternion | null = null;
const CAMERA_SLERP_ALPHA = 0.18; // Slerp factor for smoothness

// Export function to check if POV is active (for animation system)
export function isPOVActive(): boolean {
  return isPOVAnimationActive;
}

// Test function to manually trigger POV animation
export function testPOVAnimation(progress: number = 0.5) {
  console.log("=== TESTING POV ANIMATION ===");
  console.log("Testing at progress:", progress);

  // Check if paths exist
  if (!povPaths.pacman) {
    console.error("POV camera path not found!");
    return;
  }

  // Check camera position before
  console.log("Camera position before:", camera.position.clone());
  console.log("Camera FOV before:", camera.fov);

  // Test camera path
  const camPos = povPaths.pacman.getPointAt(progress);
  console.log("Camera path position at", progress, ":", camPos);

  // Test ghost paths
  ghostKeys.forEach((key) => {
    const path = povPaths[key];
    const ghost = ghosts[key];
    if (path && ghost) {
      const pos = path.getPointAt(progress);
      console.log(`${key} path position at ${progress}:`, pos);
      console.log(`${key} current position:`, ghost.position.clone());
      console.log(`${key} visible:`, ghost.visible);
    } else {
      console.warn(`${key} path or ghost not found`);
    }
  });

  // Run the actual update
  updatePOVAnimation(progress);

  // Check camera position after
  console.log("Camera position after:", camera.position.clone());
  console.log("Camera FOV after:", camera.fov);

  console.log("=== END TEST ===");
}

// --- Main update function (to be called in animation loop) ---
export function updatePOVAnimation(progress: number) {
  isPOVAnimationActive = true;

  // 1. Move camera along camera POV path (use pacman/cameraPOV path)
  if (povPaths.pacman) {
    let camPos = povPaths.pacman.getPointAt(progress);
    if (camPos.y < 0.5) camPos = new THREE.Vector3(camPos.x, 0.5, camPos.z);
    camera.position.copy(camPos);

    // Camera orientation: tangent-following or manual override
    if (cameraManualRotation) {
      camera.quaternion.copy(cameraManualRotation);
    } else {
      // Tangent-following: look ahead along the path
      const lookAheadProgress = Math.min(progress + 0.03, 1);
      const lookAheadPos = povPaths.pacman.getPointAt(lookAheadProgress);
      const tangent = new THREE.Vector3()
        .subVectors(lookAheadPos, camPos)
        .normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const m = new THREE.Matrix4().lookAt(
        camPos,
        camPos.clone().add(tangent),
        up
      );
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
      if (!prevCameraQuat) {
        camera.quaternion.copy(targetQuat);
        prevCameraQuat = camera.quaternion.clone();
      } else {
        camera.quaternion.slerpQuaternions(
          prevCameraQuat,
          targetQuat,
          CAMERA_SLERP_ALPHA
        );
        prevCameraQuat.copy(camera.quaternion);
      }
    }

    camera.fov = POV_FOV;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // 2. Move all ghosts along their respective POV paths and ensure visibility/material
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    const path = povPaths[key];
    if (ghost && path) {
      // Adjust progress for shorter ghost paths - make them move slower
      // Ghost paths are shorter than camera path, so we need to scale the progress
      const ghostProgress = Math.min(progress * 0.6, 1); // Ghosts move slower and stop earlier
      const pos = path.getPointAt(ghostProgress);
      ghost.position.copy(pos);

      // Look ahead for orientation
      const lookAheadProgress = Math.min(ghostProgress + 0.03, 1);
      const lookAheadPos = path.getPointAt(lookAheadProgress);
      ghost.lookAt(lookAheadPos);

      // Ensure visible - but don't change materials
      ghost.visible = true;

      // Debug ghost movement (less verbose)
      if (progress % 0.2 < 0.01) {
        // Log every 20% progress instead of 10%
        console.log(
          `${key} at progress ${progress.toFixed(
            2
          )}: ghostProgress=${ghostProgress.toFixed(
            2
          )}, position=${pos.x.toFixed(3)}, ${pos.y.toFixed(
            3
          )}, ${pos.z.toFixed(3)}`
        );
      }
    }
  });

  // 3. Card (DOM) trigger logic: fade in/out .cmp--pov.cmp cards based on camera progress
  Object.entries(TriggerPositions).forEach(([key, trigger], idx) => {
    if (!trigger.parent) {
      console.warn(`Trigger ${key} has no parent element`);
      return;
    }

    // Find progress along the camera path for the trigger position
    const path = povPaths.pacman;
    if (!path) {
      console.warn("Camera POV path not found for trigger logic");
      return;
    }

    // Find closest progress for triggerPos and endPosition
    function findClosestProgress(target: THREE.Vector3, samples = 1000) {
      let minDist = Infinity;
      let minT = 0;
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = path.getPointAt(t);
        const d = p.distanceTo(target);
        if (d < minDist) {
          minDist = d;
          minT = t;
        }
      }
      return minT;
    }

    const triggerT = findClosestProgress(trigger.triggerPos);
    const endT = findClosestProgress(trigger.endPosition);

    console.log(
      `Trigger ${key}: triggerT=${triggerT.toFixed(3)}, endT=${endT.toFixed(
        3
      )}, current=${progress.toFixed(3)}`
    );

    // Fade in at triggerT, fade out at endT
    let opacity = 0;
    if (progress >= triggerT && progress <= endT) {
      // Fade in over 10% of the section, fade out over last 10%
      const fadeInT = triggerT + 0.1 * (endT - triggerT);
      const fadeOutT = endT - 0.1 * (endT - triggerT);

      if (progress < fadeInT) {
        opacity = (progress - triggerT) / (fadeInT - triggerT);
      } else if (progress > fadeOutT) {
        opacity = 1 - (progress - fadeOutT) / (endT - fadeOutT);
      } else {
        opacity = 1;
      }
    }

    // Apply to DOM
    const el = trigger.parent as HTMLElement;
    if (el) {
      el.style.opacity = String(opacity);
      el.style.visibility = opacity > 0.01 ? "visible" : "hidden";
      el.style.pointerEvents = opacity > 0.01 ? "auto" : "none";

      // Debug: log when elements become visible (less verbose)
      if (opacity > 0.01 && !trigger.active) {
        console.log(
          `Trigger ${key} became visible at progress ${progress.toFixed(3)}`
        );
        trigger.active = true;
      } else if (opacity <= 0.01 && trigger.active) {
        console.log(
          `Trigger ${key} became hidden at progress ${progress.toFixed(3)}`
        );
        trigger.active = false;
      }
    }
  });
}

// Function to stop POV animation
export function stopPOVAnimation() {
  isPOVAnimationActive = false;
  camera.fov = DEFAULT_FOV;
  camera.updateProjectionMatrix();
  cameraManualRotation = null;
  prevCameraQuat = null;
  console.log("POV Animation stopped");
}

// --- POV ScrollTrigger Setup ---
export async function initPOVAnimationSystem() {
  console.log("Initializing POV Animation System...");

  // Check if POV section exists
  if (!DOM_ELEMENTS.povSection) {
    console.error("POV section not found! Check if .sc--pov.sc exists in HTML");
    console.log("Available DOM elements:", {
      homeSection: !!DOM_ELEMENTS.homeSection,
      introSection: !!DOM_ELEMENTS.introSection,
      povSection: !!DOM_ELEMENTS.povSection,
      finalSection: !!DOM_ELEMENTS.finalSection,
    });
    console.log(
      "All sections in document:",
      document.querySelectorAll('[class*="sc--"]')
    );
    return;
  }
  console.log("POV section found:", DOM_ELEMENTS.povSection);

  // Check if POV paths exist
  if (!povPaths.pacman) {
    console.error(
      "POV paths not found! Check pathPoints.ts for POV path definitions"
    );
    console.log("Available POV paths:", Object.keys(povPaths));
    return;
  }
  console.log("POV paths loaded successfully:", Object.keys(povPaths));

  // Check if ghosts exist
  const missingGhosts = ghostKeys.filter((key) => !ghosts[key]);
  if (missingGhosts.length > 0) {
    console.warn("Some ghosts are missing:", missingGhosts);
    console.log("Available ghosts:", Object.keys(ghosts));
  }

  // Check if trigger elements exist
  const missingTriggers = Object.entries(TriggerPositions).filter(
    ([key, trigger]) => !trigger.parent
  );
  if (missingTriggers.length > 0) {
    console.warn(
      "Some trigger elements are missing:",
      missingTriggers.map(([key]) => key)
    );
    console.log(
      "Available parent elements:",
      DOM_ELEMENTS.parentElements.length
    );
  }

  // Dynamically import GSAP
  const gsapModule = await import("gsap");
  const scrollTriggerModule = await import("gsap/ScrollTrigger");
  const gsap = gsapModule.gsap || gsapModule.default;
  const ScrollTrigger =
    scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
  gsap.registerPlugin(ScrollTrigger);

  // Setup ScrollTrigger for .sc--pov
  const povScrollTrigger = ScrollTrigger.create({
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
  console.log("ScrollTrigger created:", povScrollTrigger);
}
