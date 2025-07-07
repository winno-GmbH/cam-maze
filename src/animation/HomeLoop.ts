import { ghosts } from "../core/objects";
import { initHomeScrollAnimation } from "./HomeScroll";
import { getHomePaths } from "../paths/paths";
import * as THREE from "three";

const LOOP_DURATION = 40;
let isHomeLoopActive = false;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};

export function stopHomeLoop() {
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

export function startHomeLoop() {
  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;
}

export function updateHomeLoop(delta: number) {
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
