import * as THREE from "three";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock, onFrame } from "../core/scene";
import { getHomePaths, TangentSmoother } from "../paths/paths";
import { initHomeScrollAnimation } from "./home-scroll";
import { calculateObjectOrientation } from "./util";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;
let isTransitioning = false; // Prevent race conditions during transitions

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
  if (!isHomeLoopActive || isTransitioning) return;
  isTransitioning = true;

  // First, run one final update to ensure rotations are current
  // This ensures we capture the most up-to-date rotation state
  const homePaths = getHomePaths();
  const currentT = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path && homeLoopTangentSmoothers[key]) {
      const rawTangent = path.getTangentAt(currentT);
      if (rawTangent && rawTangent.length() > 0) {
        const smoothTangent = homeLoopTangentSmoothers[key].update(rawTangent);
        const objectType = key === "pacman" ? "pacman" : "ghost";
        calculateObjectOrientation(ghost, smoothTangent, objectType);
      }
    }
  });

  // Now stop the loop and capture the final state
  isHomeLoopActive = false;
  pausedT = currentT;
  pausedPositions = {};
  pausedRotations = {};

  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });

  initHomeScrollAnimation(pausedPositions, pausedRotations);

  // Small delay to ensure scroll animation has taken over
  setTimeout(() => {
    isTransitioning = false;
  }, 100);
}

function startHomeLoop() {
  if (isHomeLoopActive || isTransitioning) return;
  isTransitioning = true;

  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;

  // Initialize smooth tangent smoothers for home loop
  initializeHomeLoopTangentSmoothers();

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(pausedT);
      if (position) ghost.position.copy(position);
      if (key !== "pacman") {
        ghost.visible = true;
        ghost.scale.set(1, 1, 1);
      }

      // Initialize the smoother to match the object's current rotation
      // This prevents jumps when transitioning from scroll animation to home loop
      if (homeLoopTangentSmoothers[key]) {
        // Get the tangent that would produce the current rotation
        const currentRotation = ghost.quaternion.clone();

        // Extract the yaw from the current rotation to derive an initial tangent direction
        let initialTangent: THREE.Vector3;
        if (key === "pacman") {
          // For pacman, reverse the rotation calculation
          const euler = new THREE.Euler().setFromQuaternion(currentRotation);
          const yaw = -(euler.z - Math.PI / 2);
          initialTangent = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        } else {
          // For ghosts, extract yaw directly
          const euler = new THREE.Euler().setFromQuaternion(currentRotation);
          const yaw = euler.y;
          initialTangent = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        }

        homeLoopTangentSmoothers[key].reset(initialTangent);
      }
    }
  });

  if (!homeLoopFrameRegistered) {
    onFrame(() => updateHomeLoop(clock.getDelta()));
    homeLoopFrameRegistered = true;
  }

  isTransitioning = false;
}

function updateHomeLoop(delta: number) {
  if (!isHomeLoopActive) return;
  animationTime += delta;
  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  const homePaths = getHomePaths();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(t);
      if (position) ghost.position.copy(position);

      // Apply smooth tangent-based orientation
      if (homeLoopTangentSmoothers[key] && t > 0) {
        const rawTangent = path.getTangentAt(t);
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";
          calculateObjectOrientation(ghost, smoothTangent, objectType);
        }
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
