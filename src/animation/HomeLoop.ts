import { ghosts, pacmanMixer } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { clock } from "../core/scene";
import { calculateObjectOrientation } from "./util";
import * as THREE from "three";
import { initHomeScrollAnimation } from "./HomeScroll";

const LOOP_DURATION = 40;
const POSITION_THRESHOLD = 0.01;

let isHomeLoopActive = true;
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTime = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let isWaitingForResume = false;

export function startHomeLoop() {
  if (isPaused) {
    const currentTime = performance.now() / 1000;
    totalPausedTime += currentTime - pauseStartTime;
    isPaused = false;
    isWaitingForResume = true;
  }
  isHomeLoopActive = true;
}

export function stopHomeLoop() {
  isHomeLoopActive = false;
  isPaused = true;
  pauseStartTime = performance.now() / 1000;

  pausedPositions = {};
  pausedRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });

  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

export function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    } else if (!wasAtTop && isAtTop) {
      if (areObjectsAtPausedPositions()) {
        isWaitingForResume = false;
        isHomeLoopActive = true;
        isPaused = false;
        const currentTime = performance.now() / 1000;
        totalPausedTime += currentTime - pauseStartTime;
      } else {
        isWaitingForResume = true;
        isHomeLoopActive = true;
      }
    }
    wasAtTop = isAtTop;
  });
}

function areObjectsAtPausedPositions(): boolean {
  if (Object.keys(pausedPositions).length === 0) {
    return true;
  }
  return Object.entries(ghosts).every(([key, ghost]) => {
    const pausedPos = pausedPositions[key];
    if (!pausedPos) return true;
    const distance = ghost.position.distanceTo(pausedPos);
    return distance <= POSITION_THRESHOLD;
  });
}

export function updateHomeLoop() {
  if (!isHomeLoopActive) return;

  if (isWaitingForResume) {
    if (window.scrollY === 0 && areObjectsAtPausedPositions()) {
      isWaitingForResume = false;
      isPaused = false;
      const currentTime = performance.now() / 1000;
      totalPausedTime += currentTime - pauseStartTime;
    } else {
      return;
    }
  }

  const currentTime = performance.now() / 1000;
  const adjustedTime = currentTime - totalPausedTime;
  const globalTime = adjustedTime % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION;

  const homePaths = getHomePaths();

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (!path) {
      return;
    }
    const position = path.getPointAt(t);
    if (!position) {
      return;
    }
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) {
      return;
    }

    ghost.position.copy(position);

    const objectType = key === "pacman" ? "pacman" : "ghost";
    calculateObjectOrientation(ghost, tangent, objectType);
  });

  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}
