import { ghosts } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { onFrame, clock } from "../core/scene";
import * as THREE from "three";
import { calculateObjectOrientation } from "./util";
import { initHomeScrollAnimation } from "./HomeScroll";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;

// Track previous rotations for smoothing
let previousRotations: Record<string, number> = {};

function stopHomeLoop() {
  if (!isHomeLoopActive) return;
  isHomeLoopActive = false;
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  pausedPositions = {};
  pausedRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });
  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

function startHomeLoop() {
  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;

  // Reset previous rotations for clean state
  previousRotations = {};

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(0);
      if (position) ghost.position.copy(position);
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
  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(t);
      const tangent = path.getTangentAt(t);
      if (position) ghost.position.copy(position);
      if (tangent && tangent.length() > 0) {
        const objectType = key === "pacman" ? "pacman" : "ghost";

        // Calculate target rotation
        const targetRotation = Math.atan2(tangent.x, tangent.z);

        // Apply rotation smoothing for ghosts
        if (objectType === "ghost") {
          if (previousRotations[key] === undefined) {
            previousRotations[key] = targetRotation;
          }

          let rotationDiff = targetRotation - previousRotations[key];

          // Handle angle wrapping
          if (rotationDiff > Math.PI) {
            rotationDiff -= 2 * Math.PI;
          } else if (rotationDiff < -Math.PI) {
            rotationDiff += 2 * Math.PI;
          }

          // Smooth the rotation
          const smoothFactor = 0.15; // Adjust this value to control smoothing speed
          const smoothedRotation =
            previousRotations[key] + rotationDiff * smoothFactor;

          previousRotations[key] = smoothedRotation;

          // Apply the smoothed rotation
          ghost.rotation.set(0, smoothedRotation, 0);
        } else {
          // For pacman, use the original calculation
          calculateObjectOrientation(ghost, tangent, objectType);
        }
      }
    }
  });
}

export function HomeLoopHandler() {
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
