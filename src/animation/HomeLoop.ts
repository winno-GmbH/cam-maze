import { ghosts } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { onFrame, clock } from "../core/scene";
import * as THREE from "three";
import { calculateObjectOrientation } from "./util";
import { maybeInitHomeScrollAnimation } from "./HomeScroll";

const LOOP_DURATION = 40;
let isHomeLoopActive = false;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;
const POSITION_THRESHOLD = 0.001;

function stopHomeLoop() {
  console.log("stopHomeLoop called, current state:", {
    isHomeLoopActive,
    animationTime,
    pausedT,
    numPausedPositions: Object.keys(pausedPositions).length,
  });
  isHomeLoopActive = false;
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  pausedPositions = {};
  pausedRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });
  console.log("After stopHomeLoop:", {
    pausedT,
    numPausedPositions: Object.keys(pausedPositions).length,
    ghostPositions: Object.fromEntries(
      Object.entries(pausedPositions).map(([k, v]) => [k, v.toArray()])
    ),
  });
  maybeInitHomeScrollAnimation(pausedPositions, pausedRotations);
}

function startHomeLoop() {
  console.log("startHomeLoop called, current state:", {
    isHomeLoopActive,
    animationTime,
    pausedT,
    homeLoopFrameRegistered,
    numPausedPositions: Object.keys(pausedPositions).length,
  });
  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;
  if (!homeLoopFrameRegistered) {
    onFrame(() => updateHomeLoop(clock.getDelta()));
    homeLoopFrameRegistered = true;
  }
  console.log("After startHomeLoop:", {
    isHomeLoopActive,
    animationTime,
    homeLoopFrameRegistered,
  });
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
        calculateObjectOrientation(ghost, tangent, objectType);
      }
    }
  });
}

function areObjectsAtPausedPositions(): boolean {
  if (Object.keys(pausedPositions).length === 0) {
    console.log("areObjectsAtPausedPositions: No paused positions stored");
    return true; // If no paused positions, consider objects at position
  }

  const distances = Object.entries(ghosts).map(([key, ghost]) => {
    const pausedPos = pausedPositions[key];
    if (!pausedPos) return null;
    const distance = ghost.position.distanceTo(pausedPos);
    return { key, distance };
  });

  console.log("Object distances from paused positions:", distances);

  const result = distances.every(
    (d) => d === null || d.distance < POSITION_THRESHOLD
  );
  console.log("areObjectsAtPausedPositions final result:", result);
  return result;
}

export function setupHomeLoopScrollHandler() {
  console.log(
    "setupHomeLoopScrollHandler initialized, scrollY:",
    window.scrollY,
    "ghosts:",
    Object.keys(ghosts)
  );
  window.addEventListener("scroll", () => {
    const atTop = window.scrollY === 0;
    const atPaused = areObjectsAtPausedPositions();
    console.log(
      "Scroll event: scrollY =",
      window.scrollY,
      "atPausedPositions =",
      atPaused,
      "isHomeLoopActive =",
      isHomeLoopActive
    );
    if (atTop && atPaused && !isHomeLoopActive) {
      console.log("Calling startHomeLoop from scroll event");
      startHomeLoop();
    } else if (!atTop || !atPaused) {
      console.log("Calling stopHomeLoop from scroll event");
      stopHomeLoop();
    }
  });

  // Initial check on page load: if at top, start HomeLoop unconditionally
  if (window.scrollY === 0) {
    console.log("Calling startHomeLoop from initial load");
    startHomeLoop();
  } else {
    console.log("Calling stopHomeLoop from initial load");
    stopHomeLoop();
  }

  // Add a small delay to ensure the initial state is properly set
  setTimeout(() => {
    if (window.scrollY === 0 && !isHomeLoopActive) {
      console.log("Delayed startHomeLoop check");
      startHomeLoop();
    }
  }, 100);
}
