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

Object.entries(povPaths).forEach(([key, path]) => {
  // Test a few points along the path to see the Y values
  for (let i = 0; i <= 10; i++) {
    const progress = i / 10;
    const point = path.getPointAt(progress);
  }
});

// List of ghost keys to animate
const ghostKeys = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];

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
  // Check if paths exist
  if (!povPaths.pacman) {
    console.error("POV camera path not found!");
    return;
  }

  const camPos = povPaths.pacman.getPointAt(progress);

  ghostKeys.forEach((key) => {
    const path = povPaths[key];
    const ghost = ghosts[key];
    if (path && ghost) {
      const pos = path.getPointAt(progress);
    }
  });

  // Run the actual update
  updatePOVAnimation(progress);
}

export function updatePOVAnimation(progress: number) {
  // Debug: Log when POV animation is called
  console.log(
    `POV update called: progress=${progress.toFixed(
      3
    )}, isPOVActive=${isPOVAnimationActive}`
  );

  isPOVAnimationActive = true;

  const currentProgress = progress;

  updatePOVCamera(currentProgress);

  // 2. Move all ghosts along their respective POV paths based on camera triggers
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    const path = povPaths[key];
    if (ghost && path) {
      // Get the trigger position for this ghost
      const trigger = TriggerPositions[
        key as keyof typeof TriggerPositions
      ] as any;
      if (!trigger) return;

      // Calculate camera progress on POV path
      const cameraPosition = povPaths.pacman.getPointAt(currentProgress);
      const currentCameraProgress =
        findClosestProgressOnPOVPath(cameraPosition);

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
      const endProgress = trigger.endCameraProgress;

      // Ghost visibility and movement based on camera position
      if (
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

        // Apply smooth step for ultra-smooth movement
        const smoothGhostProgress = smoothStep(smoothStep(ghostProgress));

        // Update ghost position
        const pos = path.getPointAt(smoothGhostProgress);
        ghost.position.copy(pos);

        // Ultra-smooth ghost orientation with look-ahead
        const currentTangent = path
          .getTangentAt(smoothGhostProgress)
          .normalize();
        const lookAheadProgress = Math.min(smoothGhostProgress + 0.05, 1);
        const lookAheadTangent = path
          .getTangentAt(lookAheadProgress)
          .normalize();

        // Blend current and look-ahead tangents for smoother rotation
        const blendedTangent = new THREE.Vector3()
          .addVectors(
            currentTangent.clone().multiplyScalar(0.7),
            lookAheadTangent.clone().multiplyScalar(0.3)
          )
          .normalize();

        const lookAtPoint = ghost.position.clone().add(blendedTangent);
        ghost.lookAt(lookAtPoint);

        // Smooth fade out at the end
        if (smoothGhostProgress > 0.95) {
          const fadeOpacity = 1 - (smoothGhostProgress - 0.95) / 0.05;
          // Apply opacity to ghost materials ONLY if POV animation is active
          if (isPOVAnimationActive) {
            console.log(
              `POV Fade: ghost=${key}, progress=${smoothGhostProgress.toFixed(
                3
              )}, fadeOpacity=${fadeOpacity.toFixed(3)}`
            );

            // Handle both Mesh and Group objects
            if (ghost instanceof THREE.Mesh) {
              // Direct mesh - set material opacity
              if (ghost.material) {
                const materials = Array.isArray(ghost.material)
                  ? ghost.material
                  : [ghost.material];
                materials.forEach((mat: any) => {
                  if (mat && "opacity" in mat) {
                    mat.opacity = Math.max(0, Math.min(1, fadeOpacity));
                    mat.transparent = fadeOpacity < 1;
                    mat.needsUpdate = true;
                  }
                });
              }
            } else if (ghost instanceof THREE.Group) {
              // Group - traverse all children
              ghost.traverse((child) => {
                if ((child as any).material) {
                  const mats = Array.isArray((child as any).material)
                    ? (child as any).material
                    : [(child as any).material];
                  mats.forEach((mat: any) => {
                    if (mat && "opacity" in mat) {
                      mat.opacity = Math.max(0, Math.min(1, fadeOpacity));
                      mat.transparent = fadeOpacity < 1;
                      mat.needsUpdate = true;
                    }
                  });
                }
              });
            }
          }
        } else {
          // Reset opacity to full ONLY if POV animation is active AND we're not in home section
          // Check if we're in home section by looking for home section in viewport
          const homeSection = document.querySelector(
            ".sc--home"
          ) as HTMLElement;
          const isInHomeSection =
            homeSection && homeSection.getBoundingClientRect().bottom > 0;

          // Also check if we're in scroll animation (home section fade-out)
          const isInScrollAnimation = scrollProgress > 0.01;

          if (
            isPOVAnimationActive &&
            !isInHomeSection &&
            !isInScrollAnimation
          ) {
            console.log(
              `POV Reset: ghost=${key}, progress=${smoothGhostProgress.toFixed(
                3
              )}, setting opacity=1, isInHomeSection=${isInHomeSection}, isInScrollAnimation=${isInScrollAnimation}`
            );

            // Handle both Mesh and Group objects
            if (ghost instanceof THREE.Mesh) {
              // Direct mesh - set material opacity
              if (ghost.material) {
                const materials = Array.isArray(ghost.material)
                  ? ghost.material
                  : [ghost.material];
                materials.forEach((mat: any) => {
                  if (mat && "opacity" in mat) {
                    mat.opacity = 1;
                    mat.transparent = false;
                    mat.needsUpdate = true;
                  }
                });
              }
            } else if (ghost instanceof THREE.Group) {
              // Group - traverse all children
              ghost.traverse((child) => {
                if ((child as any).material) {
                  const mats = Array.isArray((child as any).material)
                    ? (child as any).material
                    : [(child as any).material];
                  mats.forEach((mat: any) => {
                    if (mat && "opacity" in mat) {
                      mat.opacity = 1;
                      mat.transparent = false;
                      mat.needsUpdate = true;
                    }
                  });
                }
              });
            }
          } else if (isInScrollAnimation) {
            console.log(
              `POV Reset BLOCKED: ghost=${key}, scrollProgress=${scrollProgress.toFixed(
                3
              )}, isInScrollAnimation=${isInScrollAnimation}`
            );
          }
        }
      } else {
        // Ghost outside trigger range - keep visible during POV animation but don't animate
        if (isPOVAnimationActive) {
          ghost.visible = true;
          ghost.scale.set(0.5, 0.5, 0.5);
        } else {
          // Only hide when POV animation is not active
          ghost.visible = false;
        }
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
  console.log("Stopping POV Animation...");
  isPOVAnimationActive = false;

  // Reset camera to default state
  camera.fov = DEFAULT_FOV;
  camera.updateProjectionMatrix();

  // Reset ghost scales to normal size
  ghostKeys.forEach((key) => {
    const ghost = ghosts[key];
    if (ghost) {
      ghost.scale.set(1, 1, 1); // Reset to normal scale
    }
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

  // Reset trigger states
  Object.keys(povTriggerStates).forEach((key) => {
    povTriggerStates[key] = {
      ghostTextOpacity: 0,
      camTextOpacity: 0,
      active: false,
    };
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

      // Only update POV animation if the POV section is actually in view
      // This prevents interference with home section fade-out
      if (self.isActive) {
        console.log(
          `POV ScrollTrigger onUpdate: progress=${progress.toFixed(
            3
          )}, isActive=${self.isActive}`
        );
        updatePOVAnimation(progress);
      }
    },
    onEnter: () => {
      console.log("POV section entered!");
      isPOVAnimationActive = true;
    },
    onLeave: () => {
      console.log("POV section left!");
      stopPOVAnimation();
    },
    onEnterBack: () => {
      console.log("POV section entered (backward)!");
      isPOVAnimationActive = true;
    },
    onLeaveBack: () => {
      console.log("POV section left (backward)!");
      stopPOVAnimation();
    },
  });

  console.log("POV Animation System initialized successfully!");
  console.log("ScrollTrigger created:", povScrollTrigger);

  // Add manual test functions to window for debugging
  (window as any).testPOV = (progress: number = 0.5) => {
    console.log("=== MANUAL POV TEST ===");
    testPOVAnimation(progress);
  };

  (window as any).startPOV = () => {
    console.log("=== MANUAL POV START ===");
    isPOVAnimationActive = true;
    updatePOVAnimation(0.5);
  };

  (window as any).stopPOV = () => {
    console.log("=== MANUAL POV STOP ===");
    stopPOVAnimation();
  };
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

// Sophisticated camera update with transition phases and flexible direction
function updatePOVCamera(progress: number) {
  console.log(`updatePOVCamera called with progress: ${progress}`);

  if (!povPaths.pacman) {
    console.error("POV camera path not found!");
    return;
  }

  const cameraPosition = povPaths.pacman.getPointAt(progress);
  console.log(
    `Camera position: ${cameraPosition.x.toFixed(
      3
    )}, ${cameraPosition.y.toFixed(3)}, ${cameraPosition.z.toFixed(3)}`
  );

  camera.position.copy(cameraPosition);

  // Get the tangent at current progress - this is the key missing piece!
  const tangent = povPaths.pacman.getTangentAt(progress).normalize();
  const defaultLookAt = cameraPosition.clone().add(tangent);
  console.log(
    `Tangent: ${tangent.x.toFixed(3)}, ${tangent.y.toFixed(
      3
    )}, ${tangent.z.toFixed(3)}`
  );

  // Simple phase-based camera control like in backup.js
  if (progress === 0) {
    // Initial position - look slightly up
    camera.lookAt(new THREE.Vector3(camera.position.x, 2, camera.position.z));
    console.log("Camera: Initial position");
  } else if (progress < 0.1) {
    // Entry transition - smooth from up to forward
    const transitionProgress = progress / 0.1;
    const upLookAt = new THREE.Vector3(camera.position.x, 1, camera.position.z);
    const frontLookAt = new THREE.Vector3(
      camera.position.x,
      0.5,
      camera.position.z + 1
    );

    const interpolatedLookAt = new THREE.Vector3();
    interpolatedLookAt.lerpVectors(
      upLookAt,
      frontLookAt,
      smoothStep(transitionProgress)
    );
    camera.lookAt(interpolatedLookAt);
    console.log("Camera: Entry transition");
  } else {
    // Normal path following - use tangent direction with slight smoothing
    const lookAheadProgress = Math.min(progress + 0.02, 1); // Small look-ahead for smoothing
    const lookAheadPos = povPaths.pacman.getPointAt(lookAheadProgress);

    // Calculate smoothed tangent
    const smoothedTangent = new THREE.Vector3()
      .subVectors(lookAheadPos, cameraPosition)
      .normalize();

    // Add slight upward tilt for natural walking perspective
    const upTilt = new THREE.Vector3(0, 0.05, 0);
    const finalDirection = new THREE.Vector3()
      .addVectors(smoothedTangent, upTilt)
      .normalize();

    const lookAtPoint = cameraPosition.clone().add(finalDirection);

    // Apply smooth camera rotation
    applySmoothCameraRotation(lookAtPoint);
    console.log("Camera: Normal path following");
  }

  camera.fov = POV_FOV;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  console.log(
    `Camera FOV: ${camera.fov}, Final position: ${camera.position.x.toFixed(
      3
    )}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)}`
  );
}

// Simplified smooth camera rotation - much less aggressive than before
function applySmoothCameraRotation(targetLookAt: THREE.Vector3) {
  // Calculate target rotation
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.lookAt(camera.position, targetLookAt, camera.up);
  const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    tempMatrix
  );

  if (!prevCameraQuat) {
    // First frame - set rotation directly
    camera.quaternion.copy(targetQuaternion);
    prevCameraQuat = targetQuaternion.clone();
    return;
  }

  // Much lighter smoothing - more responsive like the working versions
  const smoothingFactor = 0.3; // Reduced from previous values

  camera.quaternion.slerpQuaternions(
    prevCameraQuat,
    targetQuaternion,
    smoothingFactor
  );
  prevCameraQuat.copy(camera.quaternion);
}

// Smooth step function for easing
function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}
