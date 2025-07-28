import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { getPovPaths, TangentSmoother } from "../paths/paths";
import { povTriggerPositions } from "../paths/pathpoints";
import { DOM_ELEMENTS } from "../config/dom-elements";
import { calculateObjectOrientation } from "./util";

let povScrollTimeline: gsap.core.Timeline | null = null;

// Animation state
let isInPovSection = false;
let previousCameraPosition: THREE.Vector3 | null = null;
let animationStarted = false;
let rotationStarted = false;
let startedInitEndScreen = false;
let endScreenPassed = false;
let startEndProgress = 0;

// Camera rotation constants
const startRotationPoint = new THREE.Vector3(0.55675, 0.55, 1.306);
const endRotationPoint = new THREE.Vector3(-0.14675, 1, 1.8085);
const targetLookAt = new THREE.Vector3(0.55675, 0.1, 1.306);
const finalLookAt = new THREE.Vector3(-0.14675, 0, 1.8085);
const reverseFinalLookAt = new THREE.Vector3(
  7.395407041377711,
  0.9578031302345096,
  -4.312450290270135
);

// Animation timing constants
const originalFOV = 50;
const wideFOV = 80;
const startEndScreenSectionProgress = 0.8;
const rotationStartingPoint = 0.973;

// Cached values
let cachedStartYAngle: number | null = null;
let isMovingForward = true;

// Ghost trigger state
const ghostStates: Record<string, any> = {};

// Tangent smoothers for POV scroll (separate from home loop smoothers)
const povTangentSmoothers: Record<string, TangentSmoother> = {};

// Initialize POV tangent smoothers
function initializePovTangentSmoothers() {
  // Camera smoother - most important for smooth user experience
  povTangentSmoothers.camera = new TangentSmoother(new THREE.Vector3(0, 0, -1), 0.08);

  // Ghost smoothers
  povTangentSmoothers.ghost1 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.08);
  povTangentSmoothers.ghost2 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.08);
  povTangentSmoothers.ghost3 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.08);
  povTangentSmoothers.ghost4 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.08);
  povTangentSmoothers.ghost5 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.08);
}

export function initPovScrollAnimation() {
  if (povScrollTimeline) {
    povScrollTimeline.kill();
    povScrollTimeline = null;
  }

  const povPaths = getPovPaths();

  // Initialize tangent smoothers for POV scroll
  initializePovTangentSmoothers();

  // Initialize ghost states
  Object.keys(povTriggerPositions).forEach((key) => {
    ghostStates[key] = {
      hasBeenTriggered: false,
      hasBeenDeactivated: false,
      triggerCameraProgress: null,
      ghostStartFadeInProgress: null,
      ghostEndFadeInProgress: null,
      ghostStartFadeOutProgress: null,
      camStartFadeInProgress: null,
      camEndFadeInProgress: null,
      camStartFadeOutProgress: null,
      endCameraProgress: null,
      currentPathT: 0,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
      lastProgress: 0,
    };
  });

  povScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        id: "povScroll",
        trigger: DOM_ELEMENTS.povSection,
        start: "top bottom",
        end: "bottom top",
        endTrigger: ".sc--final",
        scrub: 0.5,
        toggleActions: "play none none reverse",
        onEnter: () => {
          isInPovSection = true;
        },
        onScrubComplete: handleLeavePOV,
        onLeave: handleLeavePOV,
      },
    })
    .to(
      { progress: 0 },
      {
        progress: 1,
        immediateRender: false,
        onStart: handleAnimationStart,
        onUpdate: function (this: gsap.core.Tween) {
          handleAnimationUpdate.call(this);
        },
        onReverseComplete: () => resetState(true),
        onComplete: resetState,
      }
    );
}

function handleAnimationStart() {
  const povPaths = getPovPaths();

  // Reset camera tangent smoother with initial camera tangent
  if (povTangentSmoothers.camera && povPaths.camera) {
    const initialCameraTangent = povPaths.camera.getTangentAt(0);
    if (initialCameraTangent) {
      povTangentSmoothers.camera.reset(initialCameraTangent);
    }
  }

  // Position all ghosts at start of their paths
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (povPaths[key] && key !== "pacman") {
      const position = povPaths[key].getPointAt(0);
      ghost.position.copy(position);
      const tangent = povPaths[key].getTangentAt(0).normalize();
      ghost.lookAt(position.clone().add(tangent));
      ghost.visible = false;
      ghost.scale.set(0.5, 0.5, 0.5);
    }
  });

  // Hide pacman during POV section
  if (ghosts.pacman) {
    ghosts.pacman.visible = false;
  }

  animationStarted = true;
}

function handleAnimationUpdate(this: gsap.core.Tween) {
  const overallProgress = (this.targets()[0] as any).progress;
  const povPaths = getPovPaths();

  if (!povPaths.camera) return;

  const cameraPosition = povPaths.camera.getPointAt(overallProgress);

  if (previousCameraPosition) {
    updateCamera(overallProgress, povPaths);
    updateGhosts(cameraPosition, overallProgress, povPaths);
    previousCameraPosition.copy(cameraPosition);
  } else {
    previousCameraPosition = cameraPosition.clone();
  }
}

function updateCamera(progress: number, povPaths: Record<string, THREE.CurvePath<THREE.Vector3>>) {
  const position = povPaths.camera.getPointAt(progress);
  camera.position.copy(position);
  camera.fov = wideFOV;

  // Show canvas if hidden
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  if (canvas && canvas.style.display === "none" && progress < 0.99) {
    canvas.style.display = "block";
  }

  // Get smooth tangent for camera orientation
  const rawTangent = povPaths.camera.getTangentAt(progress).normalize();
  let smoothTangent = rawTangent;

  if (povTangentSmoothers.camera && progress > 0) {
    smoothTangent = povTangentSmoothers.camera.update(rawTangent);
  }

  const defaultLookAt = position.clone().add(smoothTangent);

  // Handle different camera phases
  // if (progress === 0) {
  //   camera.lookAt(new THREE.Vector3(camera.position.x, 2, camera.position.z));
  // } else if (progress < 0.1) {
  //   handleInitialTransition(progress, position);
  // } else 
  if (progress >= rotationStartingPoint) {
    handleRotationPhase(progress, position, defaultLookAt);
  } else if (progress > startEndScreenSectionProgress && endScreenPassed) {
    handleEndSequence(progress);
  } else {
    handleDefaultOrientation(progress, defaultLookAt);
  }

  camera.updateProjectionMatrix();
}

function handleInitialTransition(progress: number, position: THREE.Vector3) {
  const transitionProgress = progress / 0.1;
  const upLookAt = new THREE.Vector3(position.x, 1, position.z);
  const frontLookAt = new THREE.Vector3(position.x, 0.5, position.z + 1);

  const interpolatedLookAt = new THREE.Vector3();
  interpolatedLookAt.lerpVectors(upLookAt, frontLookAt, smoothStep(transitionProgress));

  camera.lookAt(interpolatedLookAt);
}

function handleRotationPhase(progress: number, position: THREE.Vector3, defaultLookAt: THREE.Vector3) {
  const startRotationProgress = findClosestProgressOnPath(getPovPaths().camera, startRotationPoint);
  const endRotationProgress = findClosestProgressOnPath(getPovPaths().camera, endRotationPoint);

  if (progress >= startRotationProgress && progress <= endRotationProgress) {
    const sectionProgress = (progress - startRotationProgress) / (endRotationProgress - startRotationProgress);

    if (cachedStartYAngle === null) {
      const startDir = new THREE.Vector2(defaultLookAt.x - position.x, defaultLookAt.z - position.z).normalize();
      cachedStartYAngle = Math.atan2(startDir.y, startDir.x);
      cachedStartYAngle = cachedStartYAngle > 3 ? cachedStartYAngle / 2 : cachedStartYAngle;
    }

    const targetDir = new THREE.Vector2(targetLookAt.x - position.x, targetLookAt.z - position.z).normalize();
    let targetYAngle = Math.atan2(targetDir.y, targetDir.x);

    let angleDiff = targetYAngle - cachedStartYAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    else if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    angleDiff = -angleDiff * 1.75;
    targetYAngle = cachedStartYAngle + angleDiff;

    const easedProgress = smoothStep(sectionProgress);
    const newYAngle = cachedStartYAngle * (1 - easedProgress) + targetYAngle * easedProgress;

    const radius = 1.0;
    const newLookAt = new THREE.Vector3(
      position.x + Math.cos(newYAngle) * radius,
      position.y,
      position.z + Math.sin(newYAngle) * radius
    );

    camera.lookAt(newLookAt);
    rotationStarted = true;

    if (progress >= startEndScreenSectionProgress && !startedInitEndScreen) {
      startedInitEndScreen = true;
      initEndScreen();
    }
  }
}

function handleEndSequence(progress: number) {
  if (startEndProgress === 0 && progress !== 1) {
    const truncatedProgress = Math.floor(progress * 100) / 100;
    startEndProgress = truncatedProgress === 0.99 ? rotationStartingPoint : progress;
  }

  const animationProgress = (progress - startEndProgress) / (1 - startEndProgress);

  if (isMovingForward && animationProgress > 0) {
    const currentLookAt = getCameraLookAtPoint();
    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      currentLookAt,
      finalLookAt,
      smoothStep(animationProgress)
    );

    const startFOV = wideFOV;
    const targetFOV = wideFOV / 4;
    camera.fov = startFOV + (targetFOV - startFOV) * smoothStep(animationProgress);

    camera.lookAt(interpolatedLookAt);
  } else if (animationProgress > 0) {
    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      reverseFinalLookAt,
      finalLookAt,
      smoothStep(animationProgress)
    );

    const startFOV = wideFOV / 4;
    const targetFOV = wideFOV;
    camera.fov = targetFOV - (targetFOV - startFOV) * smoothStep(animationProgress);

    camera.lookAt(interpolatedLookAt);
  }
}

function handleDefaultOrientation(progress: number, defaultLookAt: THREE.Vector3) {
  const startRotationProgress = findClosestProgressOnPath(getPovPaths().camera, startRotationPoint);
  const endRotationProgress = findClosestProgressOnPath(getPovPaths().camera, endRotationPoint);

  if ((progress < startRotationProgress || progress > endRotationProgress) && !startedInitEndScreen) {
    cachedStartYAngle = null;
    rotationStarted = false;
    endScreenPassed = false;
    startedInitEndScreen = false;

    const finalSection = document.querySelector(".sc--final.sc") as HTMLElement;
    if (finalSection) {
      finalSection.style.opacity = "0";
    }
  }

  if (!rotationStarted && !startedInitEndScreen) {
    camera.lookAt(defaultLookAt);
  }

  if (!(endScreenPassed && progress > 0.8)) {
    startEndProgress = 0;
  }
}

function updateGhosts(
  cameraPosition: THREE.Vector3,
  overallProgress: number,
  povPaths: Record<string, THREE.CurvePath<THREE.Vector3>>
) {
  Object.entries(povTriggerPositions).forEach(([key, triggerData]) => {
    const ghost = ghosts[key];
    const path = povPaths[key];

    if (!ghost || !path || key === "pacman") return;

    updateGhost(key, ghost, path, cameraPosition, triggerData);
  });
}

function updateGhost(
  key: string,
  ghost: THREE.Object3D,
  path: THREE.CurvePath<THREE.Vector3>,
  cameraPosition: THREE.Vector3,
  triggerData: any
) {
  const { triggerPos, ghostStartFadeIn, ghostEndFadeIn, ghostStartFadeOut, camStartFadeIn, camEndFadeIn, camStartFadeOut, endPosition } = triggerData;
  const state = ghostStates[key];

  // Get DOM elements specific to this ghost
  const parentElements = document.querySelectorAll(".cmp--pov.cmp");
  const ghostIndex = parseInt(key.replace("ghost", "")) - 1;
  const parent = parentElements[ghostIndex] as HTMLElement;

  if (!parent) return;

  // Get POV and CAM elements specifically within this ghost's parent container
  const povElements = parent.querySelectorAll(".pov");
  const camElements = parent.querySelectorAll(".cam");

  if (!povElements || !camElements || povElements.length === 0 || camElements.length === 0) return;

  // Initialize state if needed
  if (state.triggerCameraProgress === null) {
    state.triggerCameraProgress = findClosestProgressOnPath(getPovPaths().camera, triggerPos, 800);
    state.ghostStartFadeInProgress = findClosestProgressOnPath(getPovPaths().camera, ghostStartFadeIn, 800);
    state.ghostEndFadeInProgress = findClosestProgressOnPath(getPovPaths().camera, ghostEndFadeIn, 800);
    state.ghostStartFadeOutProgress = findClosestProgressOnPath(getPovPaths().camera, ghostStartFadeOut, 800);
    state.camStartFadeInProgress = findClosestProgressOnPath(getPovPaths().camera, camStartFadeIn, 800);
    state.camEndFadeInProgress = findClosestProgressOnPath(getPovPaths().camera, camEndFadeIn, 800);
    state.camStartFadeOutProgress = findClosestProgressOnPath(getPovPaths().camera, camStartFadeOut, 800);
    state.endCameraProgress = findClosestProgressOnPath(getPovPaths().camera, endPosition, 800);
  }

  const currentCameraProgress = findClosestProgressOnPath(getPovPaths().camera, cameraPosition, 800);

  // Update ghost visibility and position
  if (currentCameraProgress >= state.triggerCameraProgress && currentCameraProgress <= state.endCameraProgress) {
    if (!ghost.visible) {
      ghost.visible = true;
      state.hasBeenTriggered = true;

      // Reset tangent smoother with initial tangent when ghost becomes visible
      if (povTangentSmoothers[key]) {
        const initialTangent = path.getTangentAt(0);
        if (initialTangent) {
          povTangentSmoothers[key].reset(initialTangent);
        }
      }
    }

    // Update ghost position
    const normalizedProgress = (currentCameraProgress - state.triggerCameraProgress) /
      (state.endCameraProgress - state.triggerCameraProgress);
    let ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

    // Smooth the parameter
    if (state.currentPathT === undefined) {
      state.currentPathT = ghostProgress;
    } else {
      const parameterSmoothingFactor = 0.1;
      state.currentPathT += (ghostProgress - state.currentPathT) * parameterSmoothingFactor;
    }

    ghostProgress = state.currentPathT;

    // Update ghost position and rotation
    const pathPoint = path.getPointAt(ghostProgress);
    ghost.position.copy(pathPoint);

    // Apply smooth tangent-based orientation
    if (povTangentSmoothers[key] && ghostProgress > 0) {
      const rawTangent = path.getTangentAt(ghostProgress);
      if (rawTangent && rawTangent.length() > 0) {
        const smoothTangent = povTangentSmoothers[key].update(rawTangent);
        calculateObjectOrientation(ghost, smoothTangent, "ghost");
      }
    }

    // Handle fade out at the end
    if (ghostProgress > 0.9) {
      const mesh = ghost as THREE.Mesh;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.Material & { opacity: number }).opacity = 1 - (ghostProgress - 0.9) / 0.1;
      }
    } else {
      const mesh = ghost as THREE.Mesh;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.Material & { opacity: number }).opacity = 1;
      }
    }
  } else {
    ghost.visible = false;
    state.hasBeenTriggered = false;
  }

  // Update text visibility
  updateTextVisibility(key, currentCameraProgress, state, parent, povElements, camElements);
}

function updateTextVisibility(
  key: string,
  currentCameraProgress: number,
  state: any,
  parent: HTMLElement,
  povElements: NodeListOf<Element>,
  camElements: NodeListOf<Element>
) {
  // Calculate target opacities using precise fade timing positions
  let targetGhostOpacity = 0;
  let targetCamOpacity = 0;

  // Ghost text fade in (ghostStartFadeIn -> ghostEndFadeIn)
  if (currentCameraProgress >= state.ghostStartFadeInProgress && currentCameraProgress <= state.ghostEndFadeInProgress) {
    const fadeProgress = (currentCameraProgress - state.ghostStartFadeInProgress) /
      (state.ghostEndFadeInProgress - state.ghostStartFadeInProgress);
    targetGhostOpacity = Math.min(1, fadeProgress);
    parent.style.opacity = targetGhostOpacity.toString();
  }
  // Ghost text stays fully visible (ghostEndFadeIn -> ghostStartFadeOut)
  else if (currentCameraProgress > state.ghostEndFadeInProgress && currentCameraProgress < state.ghostStartFadeOutProgress) {
    targetGhostOpacity = 1;
  }
  // Ghost text fade out (ghostStartFadeOut -> camStartFadeIn) - finishes exactly when cam starts fading in
  else if (currentCameraProgress >= state.ghostStartFadeOutProgress && currentCameraProgress <= state.camStartFadeInProgress) {
    const fadeOutProgress = (currentCameraProgress - state.ghostStartFadeOutProgress) /
      (state.camStartFadeInProgress - state.ghostStartFadeOutProgress);
    targetGhostOpacity = Math.max(0, 1 - fadeOutProgress);
  }

  // CAM text fade in (camStartFadeIn -> camEndFadeIn)
  if (currentCameraProgress >= state.camStartFadeInProgress && currentCameraProgress <= state.camEndFadeInProgress) {
    const fadeProgress = (currentCameraProgress - state.camStartFadeInProgress) /
      (state.camEndFadeInProgress - state.camStartFadeInProgress);
    targetCamOpacity = Math.min(1, fadeProgress);
  }
  // CAM text stays visible (camEndFadeIn -> camStartFadeOut)
  else if (currentCameraProgress > state.camEndFadeInProgress && currentCameraProgress < state.camStartFadeOutProgress) {
    targetCamOpacity = 1;
  }
  // CAM text fade out (camStartFadeOut -> endPosition)
  else if (currentCameraProgress >= state.camStartFadeOutProgress && currentCameraProgress <= state.endCameraProgress) {
    const fadeOutProgress = (currentCameraProgress - state.camStartFadeOutProgress) /
      (state.endCameraProgress - state.camStartFadeOutProgress);
    targetCamOpacity = Math.max(0, 1 - fadeOutProgress);
    parent.style.opacity = targetCamOpacity.toString();
  }

  const isPassed = targetCamOpacity > 0.01 && targetGhostOpacity > 0.01;

  if (isPassed) {
    if (!parent.classList.contains("no-visibility")) {
      parent.classList.add("no-visibility");
    }
  } else {
    if (!parent.classList.contains("no-visibility")) {
      parent.classList.remove("no-visibility");
    }
  }

  // Update all POV elements (ghost text)
  povElements.forEach((povElement) => {
    const element = povElement as HTMLElement;
    if (targetGhostOpacity > 0.01) {
      element.classList.remove("no-visibility");
      element.style.opacity = targetGhostOpacity.toString();
    } else if (targetGhostOpacity <= 0.01 && !element.classList.contains("no-visibility")) {
      element.classList.add("no-visibility");
      element.style.opacity = "0";
    }
  });

  // Update all CAM elements
  camElements.forEach((camElement) => {
    const element = camElement as HTMLElement;
    if (targetCamOpacity > 0.01) {
      element.classList.remove("no-visibility");
      element.style.opacity = targetCamOpacity.toString();
    } else if (targetCamOpacity <= 0.01 && !element.classList.contains("no-visibility")) {
      element.classList.add("no-visibility");
      element.style.opacity = "0";
    }
  });
}

function handleLeavePOV() {
  isInPovSection = false;

  console.log("handleLeavePOV");

  // Reset all ghost states
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      ghost.visible = false;

      const ghostIndex = parseInt(key.replace("ghost", "")) - 1;
      const parentElements = document.querySelectorAll(".cmp--pov.cmp");
      const parent = parentElements[ghostIndex] as HTMLElement;

      if (parent) {
        // Hide all POV and CAM elements
        const povElements = document.querySelectorAll(".pov");
        const camElements = document.querySelectorAll(".cam");

        povElements.forEach((povElement) => {
          const element = povElement as HTMLElement;
          element.classList.add("no-visibility");
          element.style.opacity = "0";
        });

        camElements.forEach((camElement) => {
          const element = camElement as HTMLElement;
          element.classList.add("no-visibility");
          element.style.opacity = "0";
        });
      }

      if (!parent.classList.contains("no-visibility")) {
        parent.classList.add("no-visibility");
      }

      // Reset ghost material opacity
      const mesh = ghost as THREE.Mesh;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.Material & { opacity: number }).opacity = 1;
      }
    }
  });

  // Show pacman again
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  // Reset camera
  camera.fov = originalFOV;
  camera.updateProjectionMatrix();

  // Reset tangent smoothers
  Object.keys(povTangentSmoothers).forEach((key) => {
    if (povTangentSmoothers[key]) {
      const resetVector = key === "camera" ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(1, 0, 0);
      povTangentSmoothers[key].reset(resetVector);
    }
  });
}

function resetState(isReverse: boolean = false) {
  // Reset camera state
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  rotationStarted = false;
  cachedStartYAngle = null;
  startEndProgress = 0;
  startedInitEndScreen = false;

  if (!isReverse) {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (canvas) {
      canvas.style.display = "none";
    }
    camera.lookAt(finalLookAt);
    endScreenPassed = true;
  } else {
    endScreenPassed = false;
  }

  // Reset all ghost states
  Object.keys(ghostStates).forEach((key) => {
    ghostStates[key] = {
      hasBeenTriggered: false,
      hasBeenDeactivated: false,
      triggerCameraProgress: null,
      ghostStartFadeInProgress: null,
      ghostEndFadeInProgress: null,
      ghostStartFadeOutProgress: null,
      camStartFadeInProgress: null,
      camEndFadeInProgress: null,
      camStartFadeOutProgress: null,
      endCameraProgress: null,
      currentPathT: 0,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
      lastProgress: 0,
    };

    // Reset tangent smoothers
    if (povTangentSmoothers[key]) {
      povTangentSmoothers[key].reset(new THREE.Vector3(1, 0, 0));
    }
  });

  // Reset camera tangent smoother
  if (povTangentSmoothers.camera) {
    povTangentSmoothers.camera.reset(new THREE.Vector3(0, 0, -1));
  }
}

function initEndScreen() {
  const finalSection = document.querySelector(".sc--final.sc") as HTMLElement;
  if (!finalSection) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--final",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      toggleActions: "play none none reverse",
    },
  });

  tl.to(finalSection, {
    opacity: 1,
    ease: "power2.inOut",
    onComplete: () => {
      endScreenPassed = true;
      startedInitEndScreen = false;
    },
  });
}

// Utility functions
function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}

function getCameraLookAtPoint(): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

function findClosestProgressOnPath(
  path: THREE.CurvePath<THREE.Vector3>,
  targetPoint: THREE.Vector3,
  samples: number = 2000
): number {
  if (!path || !targetPoint) return 0;

  let closestProgress = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < samples; i++) {
    try {
      const t = i / (samples - 1);
      const pointOnPath = path.getPointAt(t);
      if (!pointOnPath) continue;

      const distance = pointOnPath.distanceTo(targetPoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProgress = t;
      }
    } catch (error) {
      // Continue on error
    }
  }

  return closestProgress;
}

// Track scroll direction
let oldTop = 0;
window.addEventListener("scroll", () => {
  const top = window.scrollY;
  isMovingForward = top > oldTop;
  oldTop = top;
});
