import { ghosts } from "../core/objects";
import { initHomeScrollAnimation } from "./HomeScroll";
import { getHomePaths } from "../paths/paths";
import { onFrame, clock } from "../core/scene";
import * as THREE from "three";

const LOOP_DURATION = 40;
let isHomeLoopActive = false;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;
const POSITION_THRESHOLD = 0.001;

function stopHomeLoop() {
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
      if (position) ghost.position.copy(position);
    }
  });
}

function areObjectsAtPausedPositions(): boolean {
  return Object.entries(ghosts).every(([key, ghost]) => {
    const pausedPos = pausedPositions[key];
    if (!pausedPos) return false;
    return ghost.position.distanceTo(pausedPos) < POSITION_THRESHOLD;
  });
}

export function setupHomeLoopScrollHandler() {
  window.addEventListener("scroll", () => {
    if (window.scrollY === 0 && areObjectsAtPausedPositions()) {
      startHomeLoop();
    } else {
      stopHomeLoop();
    }
  });
}
