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

// Scrub smoothing for camera movement
let smoothedProgress = 0;
let targetProgress = 0;
const SCRUB_SMOOTHING = 0.08; // Very light smoothing for responsive feel

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

// Export function to check if POV is active (for animation system)
export function isPOVActive(): boolean {
  return isPOVAnimationActive;
}

// Find closest progress on camera POV path
function findClosestProgressOnPOVPath(
  targetPoint: THREE.Vector3,
  samples: number = 2000
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
  // Don't run POV animation if we're in the middle of a scroll animation
  // This prevents conflicts with the home section scroll animation
  if (progress < 0.01) {
    isPOVAnimationActive = false;
    return;
  }

  isPOVAnimationActive = true;

  // Use progress directly - GSAP ScrollTrigger already handles smoothing
  const currentProgress = progress;

  // 1. Move camera along camera POV path
  if (povPaths.pacman) {
    let camPos = povPaths.pacman.getPointAt(currentProgress);
    if (camPos.y < 0.5) camPos = new THREE.Vector3(camPos.x, 0.5, camPos.z);
    camera.position.copy(camPos);

    // Camera orientation: tangent-following or manual override
    if (cameraManualRotation) {
      camera.quaternion.copy(cameraManualRotation);
    } else {
      // Enhanced tangent-following for better maze walking experience
      const lookAheadProgress = Math.min(currentProgress + 0.08, 1); // Increased look-ahead for smoother tangent
      const lookAheadPos = povPaths.pacman.getPointAt(lookAheadProgress);

      // Calculate tangent vector for camera direction
      const tangent = new THREE.Vector3()
        .subVectors(lookAheadPos, camPos)
        .normalize();

      // Create a more natural camera orientation for maze walking
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const adjustedUp = new THREE.Vector3()
        .crossVectors(right, tangent)
        .normalize();

      // Create camera matrix for better tangent following
      const m = new THREE.Matrix4().lookAt(
        camPos,
        camPos.clone().add(tangent),
        adjustedUp
      );
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);

      if (!prevCameraQuat) {
        camera.quaternion.copy(targetQuat);
        prevCameraQuat = camera.quaternion.clone();
      } else {
        // Faster rotation for more responsive camera movement
        camera.quaternion.slerpQuaternions(
          prevCameraQuat,
          targetQuat,
          CAMERA_SLERP_ALPHA * 3 // Increased for more responsive tangent following
        );
        prevCameraQuat.copy(camera.quaternion);
      }
    }

    camera.fov = POV_FOV;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // 2. Move all ghosts along their respective POV paths
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    const path = povPaths[key];
    if (ghost && path) {
      // Ghosts should move along their paths for the full duration
      // Since their paths are short, we'll make them move continuously
      const ghostProgress = currentProgress; // Use full progress - ghosts will loop through their short paths
      const pos = path.getPointAt(ghostProgress);
      ghost.position.copy(pos);

      // Look ahead for orientation
      const lookAheadProgress = Math.min(ghostProgress + 0.03, 1);
      const lookAheadPos = path.getPointAt(lookAheadProgress);
      ghost.lookAt(lookAheadPos);

      // Make ghosts visible during POV animation - ensure they're visible
      ghost.visible = true;

      // Only set materials to full opacity if they're not already transparent
      // This prevents overriding fade-out animations from other systems
      function ensureGhostVisible(obj: THREE.Object3D) {
        if ((obj as any).material) {
          const mats = Array.isArray((obj as any).material)
            ? (obj as any).material
            : [(obj as any).material];
          mats.forEach((mat: any) => {
            if (mat) {
              // Only set to full opacity if the material is currently transparent
              // This prevents overriding fade-out animations
              if (mat.transparent && mat.opacity < 1) {
                mat.opacity = 1;
                mat.transparent = false;
                mat.depthWrite = true;
                mat.needsUpdate = true;
              }
            }
          });
        }
      }
      ensureGhostVisible(ghost);
      if (ghost instanceof THREE.Group) ghost.traverse(ensureGhostVisible);

      // Debug: log ghost movement to verify they're following paths
      if (currentProgress % 0.1 < 0.01) {
        // Log every 10% progress for more detail
        console.log(
          `${key} at progress ${currentProgress.toFixed(
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

  // 3. Update POV text animations
  updatePOVTexts(currentProgress);
}

// Update POV Texts with proper animation logic
function updatePOVTexts(progress: number) {
  if (!povPaths.pacman) return;

  const cameraPosition = povPaths.pacman.getPointAt(progress);

  Object.entries(TriggerPositions).forEach(([key, trigger]) => {
    const triggerState = povTriggerStates[key];
    const currentCameraProgress = findClosestProgressOnPOVPath(cameraPosition);

    // Calculate trigger positions on camera path (only once)
    if (triggerState.triggerCameraProgress === undefined) {
      triggerState.triggerCameraProgress = findClosestProgressOnPOVPath(
        trigger.triggerPos
      );
      triggerState.ghostTextCameraProgress = findClosestProgressOnPOVPath(
        trigger.ghostTextPos
      );
      triggerState.camTextCameraProgress = findClosestProgressOnPOVPath(
        trigger.camTextPos
      );
      triggerState.endCameraProgress = findClosestProgressOnPOVPath(
        trigger.endPosition
      );
    }

    // Calculate text opacities
    let targetGhostOpacity = 0;
    let targetCamOpacity = 0;

    if (currentCameraProgress >= triggerState.triggerCameraProgress!) {
      // Use actual section length for calculations
      const sectionLength =
        triggerState.endCameraProgress! - triggerState.triggerCameraProgress!;

      // Ghost Text Animation
      const fadeInStart = triggerState.ghostTextCameraProgress!;
      const fadeInEnd = fadeInStart + sectionLength * 0.07; // 7% for fade in
      const stayVisibleUntil =
        triggerState.endCameraProgress! - sectionLength * 0.15; // Stay visible until 85%
      const fadeOutEnd = triggerState.endCameraProgress!;

      if (
        currentCameraProgress >= fadeInStart &&
        currentCameraProgress < fadeInEnd
      ) {
        // Einblendphase
        const fadeProgress =
          (currentCameraProgress - fadeInStart) / (fadeInEnd - fadeInStart);
        targetGhostOpacity = fadeProgress;
      } else if (
        currentCameraProgress >= fadeInEnd &&
        currentCameraProgress < stayVisibleUntil
      ) {
        // Voll sichtbare Phase
        targetGhostOpacity = 1.0;
      } else if (
        currentCameraProgress >= stayVisibleUntil &&
        currentCameraProgress <= fadeOutEnd
      ) {
        // Ausblendphase
        const fadeProgress =
          (currentCameraProgress - stayVisibleUntil) /
          (fadeOutEnd - stayVisibleUntil);
        targetGhostOpacity = 1.0 - fadeProgress;
      }

      // Cam Text Animation
      if (currentCameraProgress >= triggerState.camTextCameraProgress!) {
        const camFadeInStart = triggerState.camTextCameraProgress!;
        const camFadeInEnd = camFadeInStart + sectionLength * 0.07;
        const camStayVisibleUntil = stayVisibleUntil; // Same as ghost

        if (
          currentCameraProgress >= camFadeInStart &&
          currentCameraProgress < camFadeInEnd
        ) {
          // Einblendphase
          const fadeProgress =
            (currentCameraProgress - camFadeInStart) /
            (camFadeInEnd - camFadeInStart);
          targetCamOpacity = fadeProgress;
        } else if (
          currentCameraProgress >= camFadeInEnd &&
          currentCameraProgress < camStayVisibleUntil
        ) {
          // Voll sichtbare Phase
          targetCamOpacity = 1.0;
        } else if (
          currentCameraProgress >= camStayVisibleUntil &&
          currentCameraProgress <= fadeOutEnd
        ) {
          // Ausblendphase
          const fadeProgress =
            (currentCameraProgress - camStayVisibleUntil) /
            (fadeOutEnd - camStayVisibleUntil);
          targetCamOpacity = 1.0 * (1.0 - fadeProgress);
        }
      }
    }

    // Smooth interpolation
    const fadeInSpeed = 0.2; // Schnelleres Einblenden
    const fadeOutSpeed = 0.1; // Langsameres Ausblenden

    // Update Ghost-Text Opazität
    if (targetGhostOpacity > triggerState.ghostTextOpacity) {
      triggerState.ghostTextOpacity +=
        (targetGhostOpacity - triggerState.ghostTextOpacity) * fadeInSpeed;
    } else {
      triggerState.ghostTextOpacity +=
        (targetGhostOpacity - triggerState.ghostTextOpacity) * fadeOutSpeed;
    }

    // Update CAM-Text Opazität
    if (targetCamOpacity > triggerState.camTextOpacity) {
      triggerState.camTextOpacity +=
        (targetCamOpacity - triggerState.camTextOpacity) * fadeInSpeed;
    } else {
      triggerState.camTextOpacity +=
        (targetCamOpacity - triggerState.camTextOpacity) * fadeOutSpeed;
    }

    // Update DOM elements
    updatePOVTextElements(trigger, triggerState);
  });
}

// Function to stop POV animation
export function stopPOVAnimation() {
  isPOVAnimationActive = false;
  camera.fov = DEFAULT_FOV;
  camera.updateProjectionMatrix();
  cameraManualRotation = null;
  prevCameraQuat = null;

  // Reset all trigger states
  Object.values(povTriggerStates).forEach((state) => {
    state.ghostTextOpacity = 0;
    state.camTextOpacity = 0;
    state.active = false;
  });

  // Hide all POV elements
  Object.entries(TriggerPositions).forEach(([key, trigger]) => {
    if (trigger.parent) {
      const el = trigger.parent as HTMLElement;
      el.style.opacity = "0";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";

      // Hide .pov and .cam elements
      const povElements = el.querySelectorAll(".pov");
      const camElements = el.querySelectorAll(".cam");

      povElements.forEach((povElement: Element) => {
        const element = povElement as HTMLElement;
        element.style.opacity = "0";
        element.style.visibility = "hidden";
      });

      camElements.forEach((camElement: Element) => {
        const element = camElement as HTMLElement;
        element.style.opacity = "0";
        element.style.visibility = "hidden";
        element.style.display = "none";
      });
    }
  });

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
    scrub: 1.2, // Increased scrub for better smoothing
    onUpdate: (self) => {
      // Progress von 0 (top top) bis 1 (bottom bottom)
      const progress = self.progress;
      updatePOVAnimation(progress);
    },
    onEnter: () => {
      console.log("POV section entered!");
      isPOVAnimationActive = true;
    },
    onLeave: () => {
      console.log("POV section left!");
      stopPOVAnimation();
    },
  });

  console.log("POV Animation System initialized successfully!");
  console.log("ScrollTrigger created:", povScrollTrigger);
}

// Update POV Text DOM Elements - TWO-STAGE ANIMATION
function updatePOVTextElements(trigger: any, triggerState: POVTriggerState) {
  if (!trigger.parent) return;

  // Find ALL elements with .pov and .cam classes
  const povElements = trigger.parent.querySelectorAll(".pov");
  const camElements = trigger.parent.querySelectorAll(".cam");
  const cmpPovElement = trigger.parent; // The .cmp--pov element itself

  // STAGE 1: Fade in .cmp--pov element (first trigger) - SMOOTHER
  const cmpPovOpacity = Math.max(
    0,
    Math.min(1, Math.round(triggerState.ghostTextOpacity * 1000) / 1000)
  );

  if (cmpPovOpacity > 0.01) {
    // Fade in the .cmp--pov element with smooth transition
    cmpPovElement.style.opacity = cmpPovOpacity.toString();
    cmpPovElement.style.visibility = "visible";
    cmpPovElement.style.pointerEvents = "auto";
    cmpPovElement.style.transition = "opacity 0.3s ease-in-out";
  } else {
    // Hide the .cmp--pov element
    cmpPovElement.style.opacity = "0";
    cmpPovElement.style.visibility = "hidden";
    cmpPovElement.style.pointerEvents = "none";
    cmpPovElement.style.transition = "opacity 0.3s ease-in-out";
  }

  // STAGE 2: Animate .pov and .cam elements properly
  const camOpacity = Math.max(
    0,
    Math.min(1, Math.round(triggerState.camTextOpacity * 1000) / 1000)
  );

  // Animate .pov elements (fade out from opacity 1 to 0)
  povElements.forEach((povElement: Element) => {
    const element = povElement as HTMLElement;
    if (camOpacity > 0.01) {
      // Fade out animation: opacity 1 to 0
      const fadeOutOpacity = 1 - camOpacity; // Invert the opacity for fade out
      element.style.opacity = fadeOutOpacity.toString();
      element.style.visibility = "visible";
      element.style.transition = "opacity 0.4s ease-in-out";

      // Ensure full fade out when cam text is fully visible
      if (camOpacity >= 0.99) {
        element.style.opacity = "0";
        element.style.visibility = "hidden";
      }
    } else {
      // Keep full opacity when not transitioning
      element.style.opacity = "1";
      element.style.visibility = "visible";
      element.style.transition = "opacity 0.4s ease-in-out";
    }
  });

  // Animate .cam elements (fade in from opacity 0 to 1)
  camElements.forEach((camElement: Element) => {
    const element = camElement as HTMLElement;
    if (camOpacity > 0.01) {
      // Fade in animation: opacity 0 to 1
      element.style.display = "block";
      element.style.opacity = camOpacity.toString();
      element.style.visibility = "visible";
      element.style.transition = "opacity 0.4s ease-in-out";

      // Ensure full fade in when cam text is fully visible
      if (camOpacity >= 0.99) {
        element.style.opacity = "1";
        element.style.visibility = "visible";
      }
    } else {
      // Hide when opacity is 0
      element.style.opacity = "0";
      element.style.visibility = "hidden";
      element.style.display = "none";
      element.style.transition = "opacity 0.4s ease-in-out";
    }
  });
}
