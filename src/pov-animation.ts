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
      const lookAheadProgress = Math.min(progress + 0.01, 1);
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
      camera.quaternion.setFromRotationMatrix(m);
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
      const pos = path.getPointAt(progress);
      ghost.position.copy(pos);
      // Look ahead for orientation
      const lookAheadProgress = Math.min(progress + 0.01, 1);
      const lookAheadPos = path.getPointAt(lookAheadProgress);
      ghost.lookAt(lookAheadPos);
      // Ensure visible
      ghost.visible = true;
      // Ensure material is visible
      function setMaterialVisible(obj: THREE.Object3D) {
        if ((obj as any).material) {
          const mats = Array.isArray((obj as any).material)
            ? (obj as any).material
            : [(obj as any).material];
          mats.forEach((mat: any) => {
            if (mat) {
              mat.opacity = 1;
              mat.transparent = false;
              mat.depthWrite = true;
              mat.needsUpdate = true;
            }
          });
        }
      }
      setMaterialVisible(ghost);
      if (ghost instanceof THREE.Group) ghost.traverse(setMaterialVisible);
    }
  });

  // 3. Card (DOM) trigger logic: fade in/out .cmp--pov.cmp cards based on camera progress
  Object.entries(TriggerPositions).forEach(([key, trigger], idx) => {
    if (!trigger.parent) return;
    // Find progress along the camera path for the trigger position
    const path = povPaths.pacman;
    if (!path) return;
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
    // Fade in at triggerT, fade out at endT
    let opacity = 0;
    if (progress >= triggerT && progress <= endT) {
      // Fade in over 5% of the section, fade out over last 5%
      const fadeInT = triggerT + 0.05 * (endT - triggerT);
      const fadeOutT = endT - 0.05 * (endT - triggerT);
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
    el.style.opacity = String(opacity);
    el.style.visibility = opacity > 0.01 ? "visible" : "hidden";
    el.style.pointerEvents = opacity > 0.01 ? "auto" : "none";
  });
}

// Function to stop POV animation
export function stopPOVAnimation() {
  isPOVAnimationActive = false;
  camera.fov = DEFAULT_FOV;
  camera.updateProjectionMatrix();
  cameraManualRotation = null;
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
