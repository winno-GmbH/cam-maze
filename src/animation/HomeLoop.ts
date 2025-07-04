import { ghosts, pacmanMixer } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { clock } from "../core/scene";
import { calculateObjectOrientation } from "./util";
import * as THREE from "three";
import { initHomeScrollAnimation } from "./HomeScroll";

const pathMapping = {
  pacman: "pacmanHome",
  ghost1: "ghost1Home",
  ghost2: "ghost2Home",
  ghost3: "ghost3Home",
  ghost4: "ghost4Home",
  ghost5: "ghost5Home",
} as const;

const LOOP_DURATION = 40;
const POSITION_THRESHOLD = 0.01;

let isHomeLoopActive = true;
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTime = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let isWaitingForResume = false;

export function startHomeLoop() {
  console.log(
    "[HomeLoop] startHomeLoop called. isPaused:",
    isPaused,
    "isHomeLoopActive:",
    isHomeLoopActive
  );
  isHomeLoopActive = true;
  if (isPaused) {
    const currentTime = performance.now() / 1000;
    totalPausedTime += currentTime - pauseStartTime;
    isPaused = false;
    isWaitingForResume = true;
    console.log(
      "[HomeLoop] Resuming, waiting for objects to reach paused positions."
    );
  }
}

export function stopHomeLoop() {
  console.log("[HomeLoop] stopHomeLoop called.");
  isHomeLoopActive = false;
  isPaused = true;
  pauseStartTime = performance.now() / 1000;

  // Store the current positions of all objects when pausing
  pausedPositions = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
  });
  console.log("[HomeLoop] Paused positions:", pausedPositions);

  // Now that we have pausedPositions, initialize the HomeScroll animation
  initHomeScrollAnimation(pausedPositions);
}

export function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    } else if (!wasAtTop && isAtTop) {
      startHomeLoop();
    }
    wasAtTop = isAtTop;
  });
}

function areObjectsAtPausedPositions(): boolean {
  if (!isWaitingForResume || Object.keys(pausedPositions).length === 0) {
    return true;
  }
  const result = Object.entries(ghosts).every(([key, ghost]) => {
    const pausedPos = pausedPositions[key];
    if (!pausedPos) return true;
    const distance = ghost.position.distanceTo(pausedPos);
    return distance <= POSITION_THRESHOLD;
  });
  console.log("[HomeLoop] areObjectsAtPausedPositions:", result);
  return result;
}

export function updateHomeLoop() {
  console.log(
    "[HomeLoop] updateHomeLoop called. isHomeLoopActive:",
    isHomeLoopActive,
    "isWaitingForResume:",
    isWaitingForResume
  );
  if (!isHomeLoopActive) return;

  // If we're waiting for resume, check if objects are at their paused positions
  if (isWaitingForResume) {
    if (areObjectsAtPausedPositions()) {
      isWaitingForResume = false;
      console.log(
        "[HomeLoop] All objects reached paused positions, resuming animation"
      );
    } else {
      // Don't update animation until objects reach their paused positions
      return;
    }
  }

  const currentTime = performance.now() / 1000;
  const adjustedTime = currentTime - totalPausedTime;
  const globalTime = adjustedTime % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION;

  const homePaths = getHomePaths();
  console.log("[HomeLoop] t:", t, "homePaths keys:", Object.keys(homePaths));

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = homePaths[pathKey];
    if (!path) {
      console.warn(
        `[HomeLoop] No path found for key: ${key} (pathKey: ${pathKey})`
      );
      return;
    }
    const position = path.getPointAt(t);
    if (!position) {
      console.warn(`[HomeLoop] No position found for key: ${key} at t: ${t}`);
      return;
    }
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) {
      console.warn(`[HomeLoop] No valid tangent for key: ${key} at t: ${t}`);
      return;
    }

    console.log(`[HomeLoop] Moving ${key} to`, position);
    ghost.position.copy(position);

    const objectType = key === "pacman" ? "pacman" : "ghost";
    calculateObjectOrientation(ghost, tangent, objectType);
  });

  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}
