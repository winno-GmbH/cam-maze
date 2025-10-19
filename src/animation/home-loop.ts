import * as THREE from "three";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock, onFrame } from "../core/scene";
import { getHomePaths, TangentSmoother } from "../paths/paths";
import { initHomeScrollAnimation } from "./home-scroll";
import { calculateObjectOrientation } from "./util";

const LOOP_DURATION = 50;
const ROTATION_TRANSITION_DURATION = 1.5; // Seconds to transition from laying down to upright
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;
let rotationTransitionTime = 0;
let startRotations: Record<string, THREE.Quaternion> = {};
let hasBeenPausedBefore = false; // Track if we've ever stopped the loop (i.e., scrolled)

// Tangent smoothers for home loop (separate from scroll smoothers)
const homeLoopTangentSmoothers: Record<string, TangentSmoother> = {};

// Initialize home loop tangent smoothers
function initializeHomeLoopTangentSmoothers() {
  homeLoopTangentSmoothers.pacman = new TangentSmoother(
    new THREE.Vector3(1, 0, 0),
    0.06
  );
  homeLoopTangentSmoothers.ghost1 = new TangentSmoother(
    new THREE.Vector3(1, 0, 0),
    0.06
  );
  homeLoopTangentSmoothers.ghost2 = new TangentSmoother(
    new THREE.Vector3(1, 0, 0),
    0.06
  );
  homeLoopTangentSmoothers.ghost3 = new TangentSmoother(
    new THREE.Vector3(1, 0, 0),
    0.06
  );
  homeLoopTangentSmoothers.ghost4 = new TangentSmoother(
    new THREE.Vector3(1, 0, 0),
    0.06
  );
  homeLoopTangentSmoothers.ghost5 = new TangentSmoother(
    new THREE.Vector3(1, 0, 0),
    0.06
  );
}

function stopHomeLoop() {
  if (!isHomeLoopActive) return;
  isHomeLoopActive = false;
  hasBeenPausedBefore = true; // Mark that we've paused (scrolled)
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  pausedPositions = {};
  pausedRotations = {};

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();

    // Store the target tangent-based rotation, not the current transitioning rotation
    const path = homePaths[key];
    if (path && homeLoopTangentSmoothers[key]) {
      const rawTangent = path.getTangentAt(pausedT);
      if (rawTangent && rawTangent.length() > 0) {
        const smoothTangent = homeLoopTangentSmoothers[key].getCurrentTangent();
        const objectType = key === "pacman" ? "pacman" : "ghost";

        // Create temp object to calculate target quaternion
        const tempObject = new THREE.Object3D();
        calculateObjectOrientation(tempObject, smoothTangent, objectType);
        pausedRotations[key] = tempObject.quaternion.clone();
      } else {
        pausedRotations[key] = ghost.quaternion.clone();
      }
    } else {
      pausedRotations[key] = ghost.quaternion.clone();
    }
  });
  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

function startHomeLoop() {
  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;
  rotationTransitionTime = 0;
  startRotations = {};

  // Initialize smooth tangent smoothers for home loop
  initializeHomeLoopTangentSmoothers();

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      // Only store current rotation for transition if we're returning from scroll
      if (hasBeenPausedBefore) {
        startRotations[key] = ghost.quaternion.clone();
      }

      const position = path.getPointAt(0);
      if (position) ghost.position.copy(position);
      if (key !== "pacman") {
        ghost.visible = true;
        ghost.scale.set(1, 1, 1);
      }

      // Reset the smoother with initial tangent
      if (homeLoopTangentSmoothers[key]) {
        const initialTangent = path.getTangentAt(0);
        if (initialTangent) {
          homeLoopTangentSmoothers[key].reset(initialTangent);
        }
      }
    }
  });

  if (!homeLoopFrameRegistered) {
    onFrame(() => updateHomeLoop(clock.getDelta()));
    homeLoopFrameRegistered = true;
  }
}

function updateHomeLoop(delta: number) {
  if (!isHomeLoopActive) return;
  animationTime += delta;
  rotationTransitionTime += delta;

  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  const homePaths = getHomePaths();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }

  // Calculate rotation transition progress (0 to 1 over ROTATION_TRANSITION_DURATION)
  // Only transition if we've been paused before (returning from scroll)
  const transitionProgress = Math.min(
    rotationTransitionTime / ROTATION_TRANSITION_DURATION,
    1
  );
  const isTransitioning = hasBeenPausedBefore && transitionProgress < 1;

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(t);
      if (position) ghost.position.copy(position);

      // Calculate target rotation from path tangent
      const targetQuat = new THREE.Quaternion();
      if (homeLoopTangentSmoothers[key] && t > 0) {
        const rawTangent = path.getTangentAt(t);
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";

          // Create a temporary object to get target quaternion
          const tempObject = new THREE.Object3D();
          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          targetQuat.copy(tempObject.quaternion);
        }
      }

      // Smoothly transition from laying down rotation to upright rotation (only when returning from scroll)
      if (isTransitioning && startRotations[key]) {
        // Smooth easing for rotation transition
        const easedProgress =
          transitionProgress *
          transitionProgress *
          (3 - 2 * transitionProgress); // smoothstep
        ghost.quaternion.copy(
          startRotations[key].clone().slerp(targetQuat, easedProgress)
        );
      } else {
        // After transition or on first load, use normal rotation
        ghost.quaternion.copy(targetQuat);
      }
    }
  });
}

// when scroll is 0 - home loop is running.
// Home= pacman and ghosts moving on their paths - scroll doesn't mattermatter
export function homeLoopHandler() {
  if (window.scrollY === 0) {
    startHomeLoop();
  }
}

export function setupHomeLoopScrollHandler() {
  window.addEventListener("scroll", () => {
    if (window.scrollY !== 0) {
      stopHomeLoop();
    }
  });
}
