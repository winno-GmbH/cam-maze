import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { getPovPaths, TangentSmoother } from "../paths/paths";
import {
  povTriggerPositions,
  povPaths as pathPointsData,
} from "../paths/pathpoints";
import { DOM_ELEMENTS } from "../config/dom-elements";
import { calculateObjectOrientation } from "./util";
import { applyPovScrollPreset, getScrollDirection } from "./scene-presets";
import {
  SCALE,
  TANGENT_SMOOTHING,
  PARAMETER_SMOOTHING_FACTOR,
  GHOST_FADE_THRESHOLD,
  GHOST_FADE_OUT_DURATION,
  FIND_CLOSEST_SAMPLES,
  SCRUB_DURATION,
  POV_SEQUENCE_PHASE_END,
  POV_TRANSITION_PHASE_END,
  POV_Y_CONSTRAINT_THRESHOLD,
  OPACITY_VISIBILITY_THRESHOLD,
} from "./constants";
import { setObjectScale } from "./scene-utils";
import { setObjectOpacity } from "../core/material-utils";

// Cache for DOM elements to avoid repeated queries
const domElementCache: Record<
  number,
  {
    parent: HTMLElement | null;
    povElements: NodeListOf<Element>;
    camElements: NodeListOf<Element>;
  }
> = {};

gsap.registerPlugin(ScrollTrigger);

let povScrollTimeline: gsap.core.Timeline | null = null;

// Animation state
let previousCameraPosition: THREE.Vector3 | null = null;
let rotationStarted = false;
let startedInitEndScreen = false;

// Camera rotation constants
const startRotationPoint = new THREE.Vector3(0.55675, 0.55, 1.306);
const endRotationPoint = new THREE.Vector3(-0.14675, 1, 1.8085);

// Animation timing constants
const wideFOV = 80;

// Cached values
let cachedStartYAngle: number | null = null;

// Ghost trigger state
const ghostStates: Record<string, any> = {};

// Tangent smoothers for POV scroll (separate from home loop smoothers)
const povTangentSmoothers: Record<string, TangentSmoother> = {};

// Helper function to get custom lookAt for a specific progress
function getCustomLookAtForProgress(
  progress: number,
  povPaths: Record<string, THREE.CurvePath<THREE.Vector3>>
): THREE.Vector3 | null {
  const cameraPathPoints = pathPointsData.camera;

  // For the very first point (progress close to 0), check for lookAtSequence
  if (progress <= POV_SEQUENCE_PHASE_END) {
    // Check first 5% of path
    const firstPoint = cameraPathPoints[0];

    // Handle lookAtSequence - cycle through multiple lookAt targets
    if (
      "lookAtSequence" in firstPoint &&
      firstPoint.lookAtSequence &&
      firstPoint.lookAtSequence.length > 0
    ) {
      const sequenceProgress = progress / POV_SEQUENCE_PHASE_END; // Normalize to 0-1 within first 5%
      const sequenceLength = firstPoint.lookAtSequence.length;

      // Calculate which lookAt target to use and interpolation
      const segmentSize = 1 / sequenceLength;
      const currentSegment = Math.floor(sequenceProgress / segmentSize);
      const segmentProgress = (sequenceProgress % segmentSize) / segmentSize;

      // Clamp to valid range
      const fromIndex = Math.min(currentSegment, sequenceLength - 1);
      const toIndex = Math.min(currentSegment + 1, sequenceLength - 1);

      if (fromIndex === toIndex) {
        // At the end, use last target
        return firstPoint.lookAtSequence[fromIndex];
      } else {
        // Interpolate between current and next target for smooth transitions
        const fromTarget = firstPoint.lookAtSequence[fromIndex];
        const toTarget = firstPoint.lookAtSequence[toIndex];
        return fromTarget.clone().lerp(toTarget, segmentProgress);
      }
    }
  }

  // Transition phase: smoothly blend from final sequence lookAt to default tangent lookAt
  else if (progress <= POV_TRANSITION_PHASE_END) {
    const firstPoint = cameraPathPoints[0];

    if (
      "lookAtSequence" in firstPoint &&
      firstPoint.lookAtSequence &&
      firstPoint.lookAtSequence.length > 0
    ) {
      // Get the final lookAt from the sequence
      const finalSequenceLookAt =
        firstPoint.lookAtSequence[firstPoint.lookAtSequence.length - 1];

      // Get the default tangent-based lookAt, but constrain Y to avoid looking up
      const position = povPaths.camera.getPointAt(progress);
      const tangent = povPaths.camera.getTangentAt(progress).normalize();

      // Constrain Y component of tangent to prevent looking up/down during transition
      const constrainedTangent = new THREE.Vector3(
        tangent.x,
        0,
        tangent.z
      ).normalize();
      const defaultLookAt = position.clone().add(constrainedTangent);

      // Calculate transition progress (0 to 1 over the 2% transition phase)
      const transitionProgress =
        (progress - POV_SEQUENCE_PHASE_END) / (POV_TRANSITION_PHASE_END - POV_SEQUENCE_PHASE_END);

      // Smooth interpolation from sequence lookAt to constrained default lookAt
      return finalSequenceLookAt
        .clone()
        .lerp(defaultLookAt, transitionProgress);
    }
  }

  return null;
}

// Initialize POV tangent smoothers
function initializePovTangentSmoothers() {
  const smoothingFactor = TANGENT_SMOOTHING.POV;
  
  povTangentSmoothers.camera = new TangentSmoother(
    new THREE.Vector3(0, 0, -1),
    smoothingFactor
  );

  // Initialize ghost smoothers with loop
  for (let i = 1; i <= 5; i++) {
    povTangentSmoothers[`ghost${i}`] = new TangentSmoother(
      new THREE.Vector3(1, 0, 0),
      smoothingFactor
    );
  }
}

export function initPovScrollAnimation() {
  if (povScrollTimeline) {
    povScrollTimeline.kill();
    povScrollTimeline = null;
  }

  // Initialize tangent smoothers for POV scroll
  initializePovTangentSmoothers();

  // Initialize ghost states
  Object.keys(povTriggerPositions).forEach((key) => {
    ghostStates[key] = {
      hasBeenTriggered: false,
      triggerCameraProgress: null,
      ghostStartFadeInProgress: null,
      ghostEndFadeInProgress: null,
      ghostStartFadeOutProgress: null,
      camStartFadeInProgress: null,
      camEndFadeInProgress: null,
      camStartFadeOutProgress: null,
      endCameraProgress: null,
      currentPathT: 0,
    };
  });

  povScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        id: "povScroll",
        trigger: DOM_ELEMENTS.povSection,
        start: "top bottom",
        end: "bottom top",
        markers: true,
        scrub: SCRUB_DURATION,
        toggleActions: "play none none reverse",
        onEnter: () => {
          const scrollDir = getScrollDirection();
          applyPovScrollPreset(true, scrollDir);
        },
        onEnterBack: () => {
          const scrollDir = getScrollDirection();
          applyPovScrollPreset(true, scrollDir);
        },
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
        onReverseComplete: () => {
          handleLeavePOV();
          resetState();
        },
        onComplete: () => {
          handleLeavePOV();
          resetState();
        },
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
      setObjectScale(ghost, key, "pov");
    }
  });

  // Hide pacman during POV section
  if (ghosts.pacman) {
    ghosts.pacman.visible = false;
  }
}

function handleAnimationUpdate(this: gsap.core.Tween) {
  const overallProgress = (this.targets()[0] as any).progress;

  const povPaths = getPovPaths();

  if (!povPaths.camera) return;

  const cameraPosition = povPaths.camera.getPointAt(overallProgress);

  if (previousCameraPosition) {
    updateCamera(overallProgress, povPaths, cameraPosition);
    updateGhosts(cameraPosition, overallProgress, povPaths);
    previousCameraPosition.copy(cameraPosition);
  } else {
    previousCameraPosition = cameraPosition.clone();
  }
}

function updateCamera(
  progress: number,
  povPaths: Record<string, THREE.CurvePath<THREE.Vector3>>,
  position: THREE.Vector3
) {
  // CRITICAL: Don't update camera if intro-scroll is active
  // This prevents camera rotation issues when scrolling back up from POV to intro
  const introScrollTrigger = ScrollTrigger.getById("introScroll");
  const isIntroScrollActive = introScrollTrigger && introScrollTrigger.isActive;

  if (isIntroScrollActive) {
    return;
  }

  camera.position.copy(position);
  camera.fov = wideFOV;

  // Check for custom lookAt at current path point
  const customLookAt = getCustomLookAtForProgress(progress, povPaths);
  if (customLookAt) {
    camera.lookAt(customLookAt);
    camera.updateProjectionMatrix();
    return;
  }

  // Get smooth tangent for camera orientation
  const rawTangent = povPaths.camera.getTangentAt(progress).normalize();
  let smoothTangent = rawTangent;

  if (povTangentSmoothers.camera && progress > 0) {
    smoothTangent = povTangentSmoothers.camera.update(rawTangent);
  }

  // Constrain Y component to prevent looking up/down during early path following
  if (progress <= POV_Y_CONSTRAINT_THRESHOLD) {
    // Extend constraint for first 15% of path
    smoothTangent = new THREE.Vector3(
      smoothTangent.x,
      0,
      smoothTangent.z
    ).normalize();
  }

  const defaultLookAt = position.clone().add(smoothTangent);
  handleDefaultOrientation(progress, defaultLookAt);

  camera.updateProjectionMatrix();
}

function handleDefaultOrientation(
  progress: number,
  defaultLookAt: THREE.Vector3
) {
  const povPaths = getPovPaths();
  const startRotationProgress = findClosestProgressOnPath(
    povPaths.camera,
    startRotationPoint
  );
  const endRotationProgress = findClosestProgressOnPath(
    povPaths.camera,
    endRotationPoint
  );

  if (
    (progress < startRotationProgress || progress > endRotationProgress) &&
    !startedInitEndScreen
  ) {
    cachedStartYAngle = null;
    rotationStarted = false;
    startedInitEndScreen = false;
  }

  if (!rotationStarted && !startedInitEndScreen) {
    camera.lookAt(defaultLookAt);
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
    const forceEndProgress =
      overallProgress > triggerData.forceEndProgress.start &&
      overallProgress < triggerData.forceEndProgress.end;

    updateGhost(
      key,
      ghost,
      path,
      cameraPosition,
      triggerData,
      forceEndProgress
    );
  });
}

function updateGhost(
  key: string,
  ghost: THREE.Object3D,
  path: THREE.CurvePath<THREE.Vector3>,
  cameraPosition: THREE.Vector3,
  triggerData: any,
  forceEndProgress: boolean
) {
  const {
    triggerPos,
    ghostStartFadeIn,
    ghostEndFadeIn,
    ghostStartFadeOut,
    camStartFadeIn,
    camEndFadeIn,
    camStartFadeOut,
    endPosition,
  } = triggerData;
  const state = ghostStates[key];

  // Get DOM elements with caching
  const ghostIndex = parseInt(key.replace("ghost", "")) - 1;
  let cached = domElementCache[ghostIndex];

  if (!cached) {
    const parentElements = document.querySelectorAll(".cmp--pov.cmp");
    const parent = parentElements[ghostIndex] as HTMLElement;
    cached = {
      parent: parent || null,
      povElements: parent ? parent.querySelectorAll(".pov") : ([] as any),
      camElements: parent ? parent.querySelectorAll(".cam") : ([] as any),
    };
    domElementCache[ghostIndex] = cached;
  }

  const { parent, povElements, camElements } = cached;
  if (!parent || !povElements.length || !camElements.length) return;

  // Initialize state if needed
  const povPaths = getPovPaths();
  if (state.triggerCameraProgress === null) {
    state.triggerCameraProgress = findClosestProgressOnPath(
      povPaths.camera,
      triggerPos,
      FIND_CLOSEST_SAMPLES
    );
    state.ghostStartFadeInProgress = findClosestProgressOnPath(
      povPaths.camera,
      ghostStartFadeIn,
      FIND_CLOSEST_SAMPLES
    );
    state.ghostEndFadeInProgress = findClosestProgressOnPath(
      povPaths.camera,
      ghostEndFadeIn,
      FIND_CLOSEST_SAMPLES
    );
    state.ghostStartFadeOutProgress = findClosestProgressOnPath(
      povPaths.camera,
      ghostStartFadeOut,
      FIND_CLOSEST_SAMPLES
    );
    state.camStartFadeInProgress = findClosestProgressOnPath(
      povPaths.camera,
      camStartFadeIn,
      FIND_CLOSEST_SAMPLES
    );
    state.camEndFadeInProgress = findClosestProgressOnPath(
      povPaths.camera,
      camEndFadeIn,
      FIND_CLOSEST_SAMPLES
    );
    state.camStartFadeOutProgress = findClosestProgressOnPath(
      povPaths.camera,
      camStartFadeOut,
      FIND_CLOSEST_SAMPLES
    );
    state.endCameraProgress = findClosestProgressOnPath(
      povPaths.camera,
      endPosition,
      FIND_CLOSEST_SAMPLES
    );
  }

  const currentCameraProgress = findClosestProgressOnPath(
    povPaths.camera,
    cameraPosition,
    FIND_CLOSEST_SAMPLES
  );

  // Update ghost visibility and position
  if (
    currentCameraProgress >= state.triggerCameraProgress &&
    currentCameraProgress <= state.endCameraProgress
  ) {
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
    const normalizedProgress =
      (currentCameraProgress - state.triggerCameraProgress) /
      (state.endCameraProgress - state.triggerCameraProgress);
    let ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

    // Smooth the parameter
    if (state.currentPathT === undefined) {
      state.currentPathT = ghostProgress;
    } else {
      state.currentPathT +=
        (ghostProgress - state.currentPathT) * PARAMETER_SMOOTHING_FACTOR;
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

    // Handle fade out at the end using centralized utility
    const targetOpacity =
      ghostProgress > GHOST_FADE_THRESHOLD
        ? 1 - (ghostProgress - GHOST_FADE_THRESHOLD) / GHOST_FADE_OUT_DURATION
        : 1.0;
    setObjectOpacity(ghost, targetOpacity, {
      preserveTransmission: true,
      skipCurrencySymbols: true,
    });
  } else {
    ghost.visible = false;
    state.hasBeenTriggered = false;
  }

  // Update text visibility
  updateTextVisibility(
    key,
    currentCameraProgress,
    state,
    parent,
    povElements,
    camElements,
    forceEndProgress
  );
}

/**
 * Calculate target opacities for ghost and cam text based on camera progress
 */
function calculateTextOpacities(
  currentCameraProgress: number,
  state: any
): { targetGhostOpacity: number; targetCamOpacity: number } {
  let targetGhostOpacity = 0;
  let targetCamOpacity = 0;

  // Ghost text fade in (ghostStartFadeIn -> ghostEndFadeIn)
  if (
    currentCameraProgress >= state.ghostStartFadeInProgress &&
    currentCameraProgress <= state.ghostEndFadeInProgress
  ) {
    const fadeProgress =
      (currentCameraProgress - state.ghostStartFadeInProgress) /
      (state.ghostEndFadeInProgress - state.ghostStartFadeInProgress);
    targetGhostOpacity = Math.min(1, fadeProgress);
  }
  // Ghost text stays fully visible (ghostEndFadeIn -> ghostStartFadeOut)
  else if (
    currentCameraProgress > state.ghostEndFadeInProgress &&
    currentCameraProgress < state.ghostStartFadeOutProgress
  ) {
    targetGhostOpacity = 1;
  }
  // Ghost text fade out (ghostStartFadeOut -> camStartFadeIn) - finishes exactly when cam starts fading in
  else if (
    currentCameraProgress >= state.ghostStartFadeOutProgress &&
    currentCameraProgress <= state.camStartFadeInProgress
  ) {
    const fadeOutProgress =
      (currentCameraProgress - state.ghostStartFadeOutProgress) /
      (state.camStartFadeInProgress - state.ghostStartFadeOutProgress);
    targetGhostOpacity = Math.max(0, 1 - fadeOutProgress);
  }

  // CAM text fade in (camStartFadeIn -> camEndFadeIn)
  if (
    currentCameraProgress >= state.camStartFadeInProgress &&
    currentCameraProgress <= state.camEndFadeInProgress
  ) {
    const fadeProgress =
      (currentCameraProgress - state.camStartFadeInProgress) /
      (state.camEndFadeInProgress - state.camStartFadeInProgress);
    targetCamOpacity = Math.min(1, fadeProgress);
  }
  // CAM text stays visible (camEndFadeIn -> camStartFadeOut)
  else if (
    currentCameraProgress > state.camEndFadeInProgress &&
    currentCameraProgress < state.camStartFadeOutProgress
  ) {
    targetCamOpacity = 1;
  }
  // CAM text fade out (camStartFadeOut -> endPosition)
  else if (
    currentCameraProgress >= state.camStartFadeOutProgress &&
    currentCameraProgress <= state.endCameraProgress
  ) {
    const fadeOutProgress =
      (currentCameraProgress - state.camStartFadeOutProgress) /
      (state.endCameraProgress - state.camStartFadeOutProgress);
    targetCamOpacity = Math.max(0, 1 - fadeOutProgress);
  }

  return { targetGhostOpacity, targetCamOpacity };
}

/**
 * Update visibility and opacity of text elements
 */
function updateTextElementVisibility(
  elements: NodeListOf<Element>,
  targetOpacity: number
): void {
  elements.forEach((element) => {
    const el = element as HTMLElement;
    if (targetOpacity > OPACITY_VISIBILITY_THRESHOLD) {
      el.classList.remove("no-visibility");
      el.style.opacity = targetOpacity.toString();
    } else if (
      targetOpacity <= OPACITY_VISIBILITY_THRESHOLD &&
      !el.classList.contains("no-visibility")
    ) {
      el.classList.add("no-visibility");
      el.style.opacity = "0";
    }
  });
}

function updateTextVisibility(
  key: string,
  currentCameraProgress: number,
  state: any,
  parent: HTMLElement,
  povElements: NodeListOf<Element>,
  camElements: NodeListOf<Element>,
  forceEndProgress: boolean = false
) {
  // If forceEndProgress is true, immediately hide all text elements
  if (forceEndProgress) {
    parent.style.opacity = "0";
    parent.classList.add("no-visibility");
    hideTextElements(povElements);
    hideTextElements(camElements);
    return;
  }

  // Calculate target opacities
  const { targetGhostOpacity, targetCamOpacity } = calculateTextOpacities(
    currentCameraProgress,
    state
  );

  // Update parent opacity (uses cam opacity at the end, ghost opacity during fade in)
  if (currentCameraProgress >= state.camStartFadeOutProgress) {
    parent.style.opacity = targetCamOpacity.toString();
  } else if (
    currentCameraProgress >= state.ghostStartFadeInProgress &&
    currentCameraProgress <= state.ghostEndFadeInProgress
  ) {
    parent.style.opacity = targetGhostOpacity.toString();
  }

  // Update visibility class based on both opacities
  const isPassed =
    targetCamOpacity > OPACITY_VISIBILITY_THRESHOLD &&
    targetGhostOpacity > OPACITY_VISIBILITY_THRESHOLD;
  const hasNoVisibility = parent.classList.contains("no-visibility");

  if (isPassed && !hasNoVisibility) {
    parent.classList.add("no-visibility");
  } else if (!isPassed && hasNoVisibility) {
    parent.classList.remove("no-visibility");
  }

  // Update all POV elements (ghost text)
  if (targetGhostOpacity > OPACITY_VISIBILITY_THRESHOLD) {
    updateTextElementVisibility(povElements, targetGhostOpacity);
  } else {
    hideTextElements(povElements);
  }

  // Update all CAM elements
  if (targetCamOpacity > OPACITY_VISIBILITY_THRESHOLD) {
    updateTextElementVisibility(camElements, targetCamOpacity);
  } else {
    hideTextElements(camElements);
  }
}

// Helper function to reset tangent smoothers
function resetTangentSmoothers() {
  Object.keys(povTangentSmoothers).forEach((key) => {
    if (povTangentSmoothers[key]) {
      const resetVector =
        key === "camera"
          ? new THREE.Vector3(0, 0, -1)
          : new THREE.Vector3(1, 0, 0);
      povTangentSmoothers[key].reset(resetVector);
    }
  });
}

function hideTextElements(elements: NodeListOf<Element>) {
  elements.forEach((element) => {
    const el = element as HTMLElement;
    el.classList.add("no-visibility");
    el.style.opacity = "0";
  });
}

function handleLeavePOV() {
  // Reset all ghost states
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      ghost.visible = false;

      const ghostIndex = parseInt(key.replace("ghost", "")) - 1;
      const cached = domElementCache[ghostIndex];

      if (cached?.parent) {
        hideTextElements(cached.povElements);
        hideTextElements(cached.camElements);
        cached.parent.classList.add("no-visibility");
      }

      // Reset ghost material opacity using centralized utility
      setObjectOpacity(ghost, 1.0, {
        preserveTransmission: true,
        skipCurrencySymbols: true,
      });
    }
  });

  // Show pacman again
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  resetTangentSmoothers();
}

function resetState() {
  // Reset camera state
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  rotationStarted = false;
  cachedStartYAngle = null;
  startedInitEndScreen = false;

  // Reset all ghost states
  Object.keys(ghostStates).forEach((key) => {
    ghostStates[key] = {
      hasBeenTriggered: false,
      triggerCameraProgress: null,
      ghostStartFadeInProgress: null,
      ghostEndFadeInProgress: null,
      ghostStartFadeOutProgress: null,
      camStartFadeInProgress: null,
      camEndFadeInProgress: null,
      camStartFadeOutProgress: null,
      endCameraProgress: null,
      currentPathT: 0,
    };
  });

  resetTangentSmoothers();
}

// Utility functions
function findClosestProgressOnPath(
  path: THREE.CurvePath<THREE.Vector3>,
  targetPoint: THREE.Vector3,
  samples: number = FIND_CLOSEST_SAMPLES
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
