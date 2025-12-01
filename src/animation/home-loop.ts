import * as THREE from "three";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock, onFrame } from "../core/scene";
import { getHomePaths, TangentSmoother } from "../paths/paths";
import { initHomeScrollAnimation } from "./home-scroll";
import { calculateObjectOrientation } from "./util";
import { applyHomeLoopPreset } from "./scene-presets";
import {
  syncStateFromObjects,
  getCurrentPositions,
  getCurrentRotations,
  updateObjectPosition,
  updateObjectRotation,
} from "./object-state";

const LOOP_DURATION = 50;
const ROTATION_TRANSITION_DURATION = 1.5; // Seconds to transition from laying down to upright
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
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
  hasBeenPausedBefore = true;
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  // CRITICAL: State is already updated every frame in updateHomeLoop()
  // Just ensure we have the absolute latest by syncing one more time
  // This catches any edge cases where updateHomeLoop() hasn't run yet this frame
  syncStateFromObjects();

  const homePaths = getHomePaths();
  // CRITICAL: Get positions from state (which is updated every frame in updateHomeLoop)
  // This ensures we always use the most recent positions, not stale ones
  const pausedPositions = getCurrentPositions();
  const pausedRotations: Record<string, THREE.Quaternion> = {};

  // Calculate proper rotations based on path tangents
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path && homeLoopTangentSmoothers[key]) {
      const rawTangent = path.getTangentAt(pausedT);
      if (rawTangent && rawTangent.length() > 0) {
        const smoothTangent = homeLoopTangentSmoothers[key].getCurrentTangent();
        const objectType = key === "pacman" ? "pacman" : "ghost";

        const tempObject = new THREE.Object3D();
        calculateObjectOrientation(tempObject, smoothTangent, objectType);
        pausedRotations[key] = tempObject.quaternion.clone();
        updateObjectRotation(key, pausedRotations[key]);
      } else {
        pausedRotations[key] = ghost.quaternion.clone();
        updateObjectRotation(key, pausedRotations[key]);
      }
    } else {
      pausedRotations[key] = ghost.quaternion.clone();
      updateObjectRotation(key, pausedRotations[key]);
    }
  });

  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

function startHomeLoop() {
  isHomeLoopActive = true;

  // CRITICAL: When returning from scroll, sync state from actual object positions
  // This ensures we start from where objects actually are, not where they were
  if (hasBeenPausedBefore) {
    syncStateFromObjects();
    // Recalculate pausedT from actual positions to keep in sync
    const homePaths = getHomePaths();
    const currentPositions = getCurrentPositions();

    // Find closest t value for each object and use average
    let totalT = 0;
    let count = 0;
    Object.entries(currentPositions).forEach(([key, pos]) => {
      const path = homePaths[key];
      if (path) {
        // Simple approximation: find closest point on path
        let closestT = 0;
        let closestDist = Infinity;
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const pathPoint = path.getPointAt(t);
          if (pathPoint) {
            const dist = pathPoint.distanceTo(pos);
            if (dist < closestDist) {
              closestDist = dist;
              closestT = t;
            }
          }
        }
        totalT += closestT;
        count++;
      }
    });
    if (count > 0) {
      pausedT = totalT / count;
    }
    animationTime = pausedT * LOOP_DURATION;
  }

  rotationTransitionTime = 0;
  startRotations = {};

  // Apply home loop preset
  applyHomeLoopPreset(true);

  // Initialize smooth tangent smoothers for home loop
  initializeHomeLoopTangentSmoothers();

  const homePaths = getHomePaths();
  const currentPositions = getCurrentPositions();

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      // Use current position from state if available, otherwise use path position
      const savedPosition = currentPositions[key];
      if (savedPosition && hasBeenPausedBefore) {
        ghost.position.copy(savedPosition);
      } else {
        const position = path.getPointAt(pausedT);
        if (position) {
          ghost.position.copy(position);
          updateObjectPosition(key, position);
        }
      }

      // Only store current rotation for transition if we're returning from scroll
      if (hasBeenPausedBefore) {
        startRotations[key] = ghost.quaternion.clone();
      }

      if (key !== "pacman") {
        ghost.visible = true;
        ghost.scale.set(1, 1, 1);
      } else {
        ghost.scale.set(0.05, 0.05, 0.05);
      }

      // Reset the smoother with initial tangent
      if (homeLoopTangentSmoothers[key]) {
        const initialTangent = path.getTangentAt(pausedT);
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
      if (position) {
        ghost.position.copy(position);
        // CRITICAL: Update state every frame to keep it in sync
        updateObjectPosition(key, position);
      }

      // CRITICAL: Maintain correct scale every frame
      // Pacman should be 0.05 (original model size), ghosts should be 1.0
      if (key === "pacman") {
        ghost.scale.set(0.05, 0.05, 0.05);
      } else {
        ghost.scale.set(1.0, 1.0, 1.0);
      }

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

      // CRITICAL: Update state every frame to keep it in sync
      updateObjectRotation(key, ghost.quaternion);
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
