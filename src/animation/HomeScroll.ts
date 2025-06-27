import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { createHomeScrollPaths } from "../paths/paths";

const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];

let isScrollActive = false;
let isReturningToPaused = false;
let scrollPaths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};
let pausedPositions: Record<string, THREE.Vector3> = {};
let returnAnimationProgress = 0;

export function startHomeScrollAnimation() {
  isScrollActive = true;
  isReturningToPaused = false;
  returnAnimationProgress = 0;

  // Save paused positions
  pausedPositions = {};
  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (obj) {
      pausedPositions[key] = obj.position.clone();
    }
  });

  // Create paths
  scrollPaths = createHomeScrollPaths(pacman, ghosts);
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  // If we're at the top and need to return to paused positions
  if (window.scrollY === 0 && !isReturningToPaused) {
    isReturningToPaused = true;
    returnAnimationProgress = 0;
  }

  if (isReturningToPaused) {
    // Animate back to paused positions
    returnAnimationProgress += 0.02; // Adjust speed as needed
    if (returnAnimationProgress >= 1) {
      returnAnimationProgress = 1;
      isScrollActive = false;
      isReturningToPaused = false;
    }

    ghostOrder.forEach((key) => {
      const obj = key === "pacman" ? pacman : ghosts[key];
      if (!obj) return;

      const path = scrollPaths[key];
      if (!path) return;

      // Animate backwards along the path
      const position = path.getPointAt(1 - returnAnimationProgress);
      if (position) {
        obj.position.copy(position);
      }
    });
  } else {
    // Normal scroll animation
    ghostOrder.forEach((key) => {
      const obj = key === "pacman" ? pacman : ghosts[key];
      if (!obj) return;

      const path = scrollPaths[key];
      if (!path) return;

      const position = path.getPointAt(animatedT);
      if (position) {
        obj.position.copy(position);
      }
    });
  }

  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function stopHomeScrollAnimation() {
  isScrollActive = false;
  isReturningToPaused = false;
  scrollPaths = {};
}

export function haveObjectsReturnedToPausedPositions(): boolean {
  if (!isScrollActive) return false;

  const tolerance = 0.01;

  for (const key of ghostOrder) {
    const obj = key === "pacman" ? pacman : ghosts[key];
    const pausedPos = pausedPositions[key];

    if (!obj || !pausedPos) continue;

    const distance = obj.position.distanceTo(pausedPos);
    if (distance > tolerance) {
      return false;
    }
  }

  return true;
}
