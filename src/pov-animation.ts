import * as THREE from "three";
import { camera } from "./camera";
import { ghosts } from "./objects";
import { DOM_ELEMENTS } from "./selectors";
import { getPathsForSection } from "./paths";
import { MAZE_CENTER } from "./config";
import { TriggerPositions } from "./triggers";

// Import scrollProgress from animation module
let scrollProgress = 0;
export function setScrollProgress(progress: number) {
  scrollProgress = progress;
}

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

// List of ghost keys to animate
const ghostKeys = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];

// Export function to check if POV is active (for animation system)
export function isPOVActive(): boolean {
  return isPOVAnimationActive;
}

// Find closest progress on camera POV path
function findClosestProgressOnPOVPath(
  targetPoint: THREE.Vector3,
  samples: number = 100
): number {
  if (!povPaths.pacman) return 0;

  let minDist = Infinity;
  let minT = 0;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = povPaths.pacman.getPointAt(t);
    const d = p.distanceTo(targetPoint);
    if (d < minDist) {
      minDist = d;
      minT = t;
    }
  }

  return minT;
}

// Extended trigger interface to include calculated progress values
interface ExtendedTrigger {
  triggerPos: THREE.Vector3;
  ghostTextPos: THREE.Vector3;
  camTextPos: THREE.Vector3;
  endPosition: THREE.Vector3;
  parent: Element | null;
  active: boolean;
  triggerCameraProgress?: number;
  ghostTextCameraProgress?: number;
  camTextCameraProgress?: number;
  endCameraProgress?: number;
}

// Store extended triggers
const extendedTriggers: { [key: string]: ExtendedTrigger } = {};

// Initialize extended triggers
Object.entries(TriggerPositions).forEach(([key, trigger]) => {
  extendedTriggers[key] = {
    ...trigger,
    triggerCameraProgress: undefined,
    ghostTextCameraProgress: undefined,
    camTextCameraProgress: undefined,
    endCameraProgress: undefined,
  };
});

export function updatePOVAnimation(progress: number) {
  isPOVAnimationActive = true;

  // 1. Update camera position and orientation
  updatePOVCamera(progress);

  // 2. Move all ghosts along their respective POV paths
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    const path = povPaths[key];
    if (ghost && path) {
      // Get the trigger position for this ghost
      const trigger = extendedTriggers[key];
      if (!trigger) return;

      // Calculate camera progress on POV path
      const cameraPosition = povPaths.pacman.getPointAt(progress);
      const currentCameraProgress =
        findClosestProgressOnPOVPath(cameraPosition);

      // Calculate trigger positions on camera path (only once)
      if (trigger.triggerCameraProgress === undefined) {
        trigger.triggerCameraProgress = findClosestProgressOnPOVPath(
          trigger.triggerPos
        );
        trigger.endCameraProgress = findClosestProgressOnPOVPath(
          trigger.endPosition
        );
      }

      const triggerProgress = trigger.triggerCameraProgress;
      const endProgress = trigger.endCameraProgress;

      // Ghost visibility and movement based on camera position
      if (
        triggerProgress !== undefined &&
        endProgress !== undefined &&
        currentCameraProgress >= triggerProgress &&
        currentCameraProgress <= endProgress
      ) {
        // Make ghost visible and animate it
        ghost.visible = true;
        ghost.scale.set(0.5, 0.5, 0.5);

        // Calculate ghost progress along its path based on camera position
        const normalizedProgress =
          (currentCameraProgress - triggerProgress) /
          (endProgress - triggerProgress);
        const ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

        // Update ghost position
        const pos = path.getPointAt(ghostProgress);
        ghost.position.copy(pos);

        // Simple ghost orientation
        const tangent = path.getTangentAt(ghostProgress).normalize();
        const lookAt = ghost.position.clone().add(tangent);
        ghost.lookAt(lookAt);
      } else {
        // Hide ghost when not in range
        ghost.visible = false;
      }
    }
  });

  // 3. Update text elements
  updatePOVTexts(progress);
}

function updatePOVTexts(progress: number) {
  // Update text elements based on camera position
  Object.entries(extendedTriggers).forEach(([key, trigger]) => {
    const triggerState = povTriggerStates[key];
    if (!triggerState) return;

    // Calculate camera progress on POV path
    const cameraPosition = povPaths.pacman.getPointAt(progress);
    const currentCameraProgress = findClosestProgressOnPOVPath(cameraPosition);

    // Calculate trigger positions on camera path (only once)
    if (trigger.triggerCameraProgress === undefined) {
      trigger.triggerCameraProgress = findClosestProgressOnPOVPath(
        trigger.triggerPos
      );
      trigger.ghostTextCameraProgress = findClosestProgressOnPOVPath(
        trigger.ghostTextPos
      );
      trigger.camTextCameraProgress = findClosestProgressOnPOVPath(
        trigger.camTextPos
      );
      trigger.endCameraProgress = findClosestProgressOnPOVPath(
        trigger.endPosition
      );
    }

    const triggerProgress = trigger.triggerCameraProgress;
    const ghostTextProgress = trigger.ghostTextCameraProgress;
    const camTextProgress = trigger.camTextCameraProgress;
    const endProgress = trigger.endCameraProgress;

    // Update ghost text opacity
    if (
      ghostTextProgress !== undefined &&
      endProgress !== undefined &&
      currentCameraProgress >= ghostTextProgress &&
      currentCameraProgress <= endProgress
    ) {
      const fadeInDuration = 0.1; // 10% of the journey
      const fadeOutStart = 0.9; // Start fade out at 90%

      let opacity = 1;
      if (currentCameraProgress <= ghostTextProgress + fadeInDuration) {
        opacity = (currentCameraProgress - ghostTextProgress) / fadeInDuration;
      } else if (currentCameraProgress >= endProgress - fadeInDuration) {
        opacity = (endProgress - currentCameraProgress) / fadeInDuration;
      }

      triggerState.ghostTextOpacity = Math.max(0, Math.min(1, opacity));
    } else {
      triggerState.ghostTextOpacity = 0;
    }

    // Update camera text opacity
    if (
      camTextProgress !== undefined &&
      endProgress !== undefined &&
      currentCameraProgress >= camTextProgress &&
      currentCameraProgress <= endProgress
    ) {
      const fadeInDuration = 0.1;
      const fadeOutStart = 0.9;

      let opacity = 1;
      if (currentCameraProgress <= camTextProgress + fadeInDuration) {
        opacity = (currentCameraProgress - camTextProgress) / fadeInDuration;
      } else if (currentCameraProgress >= endProgress - fadeInDuration) {
        opacity = (endProgress - currentCameraProgress) / fadeInDuration;
      }

      triggerState.camTextOpacity = Math.max(0, Math.min(1, opacity));
    } else {
      triggerState.camTextOpacity = 0;
    }

    // Update DOM elements
    updatePOVTextElements(trigger, triggerState);
  });
}

// POV Animation State for text transitions
interface POVTriggerState {
  triggerCameraProgress?: number;
  ghostTextCameraProgress?: number;
  camTextCameraProgress?: number;
  endCameraProgress?: number;
  ghostTextOpacity: number;
  camTextOpacity: number;
  active: boolean;
}

// Initialize trigger states
const povTriggerStates: { [key: string]: POVTriggerState } = {};
Object.keys(TriggerPositions).forEach((key) => {
  povTriggerStates[key] = {
    ghostTextOpacity: 0,
    camTextOpacity: 0,
    active: false,
  };
});

function updatePOVTextElements(
  trigger: ExtendedTrigger,
  triggerState: POVTriggerState
) {
  // Update ghost text element - use the parent element to find .pov elements
  if (trigger.parent) {
    const povElements = trigger.parent.querySelectorAll(".pov");
    const camElements = trigger.parent.querySelectorAll(".cam");

    // Update .pov elements (ghost text)
    povElements.forEach((element: Element) => {
      const el = element as HTMLElement;
      el.style.opacity = triggerState.ghostTextOpacity.toString();
      el.style.display = triggerState.ghostTextOpacity > 0 ? "block" : "none";
    });

    // Update .cam elements (camera text)
    camElements.forEach((element: Element) => {
      const el = element as HTMLElement;
      el.style.opacity = triggerState.camTextOpacity.toString();
      el.style.display = triggerState.camTextOpacity > 0 ? "block" : "none";
    });
  }
}

export function stopPOVAnimation() {
  isPOVAnimationActive = false;

  // Reset camera FOV
  camera.fov = DEFAULT_FOV;
  camera.updateProjectionMatrix();

  // Hide all ghosts
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    if (ghost) {
      ghost.visible = false;
    }
  });

  // Hide all text elements
  Object.values(extendedTriggers).forEach((trigger) => {
    if (trigger.parent) {
      const povElements = trigger.parent.querySelectorAll(".pov");
      const camElements = trigger.parent.querySelectorAll(".cam");

      povElements.forEach((element: Element) => {
        const el = element as HTMLElement;
        el.style.display = "none";
      });

      camElements.forEach((element: Element) => {
        const el = element as HTMLElement;
        el.style.display = "none";
      });
    }
  });

  // Reset trigger states
  Object.values(povTriggerStates).forEach((state) => {
    state.ghostTextOpacity = 0;
    state.camTextOpacity = 0;
    state.active = false;
  });
}

export async function initPOVAnimationSystem() {
  // Initialize POV animation system
  console.log("Initializing POV animation system...");

  // Set up GSAP ScrollTrigger for POV section
  const { gsap } = await import("gsap");
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  // Create ScrollTrigger for POV section
  ScrollTrigger.create({
    trigger: ".sc--pov.sc",
    start: "top center",
    end: "bottom center",
    onUpdate: (self) => {
      const progress = self.progress;
      updatePOVAnimation(progress);
    },
    onEnter: () => {
      console.log("POV animation started");
      isPOVAnimationActive = true;
    },
    onLeave: () => {
      console.log("POV animation stopped");
      stopPOVAnimation();
    },
    onEnterBack: () => {
      console.log("POV animation resumed");
      isPOVAnimationActive = true;
    },
    onLeaveBack: () => {
      console.log("POV animation stopped (scrolled back)");
      stopPOVAnimation();
    },
  });

  console.log("POV animation system initialized");
}

function updatePOVCamera(progress: number) {
  if (!povPaths.pacman) return;

  // Update camera FOV for POV animation
  camera.fov = POV_FOV;
  camera.updateProjectionMatrix();

  // Get camera position from path
  const cameraPosition = povPaths.pacman.getPointAt(progress);

  // Ensure camera is above ground level
  cameraPosition.y = Math.max(cameraPosition.y, 0.5);

  camera.position.copy(cameraPosition);

  // Simple camera orientation - look ahead on the path
  const lookAheadProgress = Math.min(progress + 0.05, 1);
  const lookAheadPoint = povPaths.pacman.getPointAt(lookAheadProgress);
  camera.lookAt(lookAheadPoint);
}
