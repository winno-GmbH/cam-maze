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

function stopHomeLoop() {
  isHomeLoopActive = false;
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  pausedPositions = {};
  pausedRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });
  maybeInitHomeScrollAnimation(pausedPositions, pausedRotations);
}

function startHomeLoop() {
  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;
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
        calculateObjectOrientation(ghost, tangent, objectType);
      }
    }
  });
}

export function HomeLoopHandler() {
  if (window.scrollY === 0) {
    console.log("startHomeLoop def");
    startHomeLoop();
  } else {
    console.log("stopHomeLoop def");
    stopHomeLoop();
  }
}
export function setupHomeLoopScrollHandler() {
  window.addEventListener("scroll", () => {
    if (window.scrollY !== 0) {
      stopHomeLoop();
    }
  });
}
