import { ghosts, pacmanMixer } from "../core/objects";
import { getHomePaths, TangentSmoother } from "../paths/paths";
import { onFrame, clock } from "../core/scene";
import * as THREE from "three";
import { calculateObjectOrientation } from "./util";
import { initHomeScrollAnimation } from "./home-scroll";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;

// Tangent smoothers for home loop (separate from scroll smoothers)
const homeLoopTangentSmoothers: Record<string, TangentSmoother> = {};

// Initialize home loop tangent smoothers
function initializeHomeLoopTangentSmoothers() {
  homeLoopTangentSmoothers.pacman = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.06);
  homeLoopTangentSmoothers.ghost1 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.06);
  homeLoopTangentSmoothers.ghost2 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.06);
  homeLoopTangentSmoothers.ghost3 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.06);
  homeLoopTangentSmoothers.ghost4 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.06);
  homeLoopTangentSmoothers.ghost5 = new TangentSmoother(new THREE.Vector3(1, 0, 0), 0.06);
}

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

  // Initialize smooth tangent smoothers for home loop
  initializeHomeLoopTangentSmoothers();

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
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
          const smoothTangent = homeLoopTangentSmoothers[key].update(rawTangent);
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
