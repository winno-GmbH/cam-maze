import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { createHomeScrollPaths } from "../paths/paths";

const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];

let isScrollActive = false;
let scrollPaths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};
let originalPositions: Record<string, THREE.Vector3> = {};

export function startHomeScrollAnimation() {
  isScrollActive = true;

  // Store original positions
  originalPositions = {};
  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (obj) {
      originalPositions[key] = obj.position.clone();
    }
  });

  scrollPaths = createHomeScrollPaths(pacman, ghosts);
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  // Debug: log animatedT to see the values
  if (Math.abs(animatedT - 0.5) < 0.01) {
    console.log("animatedT at midpoint:", animatedT);
  }

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;

    const path = scrollPaths[key];
    if (!path) return;

    // Use the path to get position at the current time
    // animatedT goes from 0 to 1 when scrolling down, 1 to 0 when scrolling up
    const position = path.getPointAt(animatedT);
    if (!position) return;

    obj.position.copy(position);
    // Don't change rotation - objects maintain their original orientation
  });

  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function stopHomeScrollAnimation() {
  isScrollActive = false;
  scrollPaths = {};
}

export function isScrubStillCatchingUp(): boolean {
  return isScrollActive;
}

export function haveObjectsReturnedToOriginalPositions(): boolean {
  if (!isScrollActive) return false;

  const tolerance = 0.01; // How close objects need to be to their original positions

  for (const key of ghostOrder) {
    const obj = key === "pacman" ? pacman : ghosts[key];
    const originalPos = originalPositions[key];

    if (!obj || !originalPos) continue;

    const distance = obj.position.distanceTo(originalPos);
    if (distance > tolerance) {
      return false; // At least one object hasn't returned
    }
  }

  return true; // All objects have returned to their original positions
}
