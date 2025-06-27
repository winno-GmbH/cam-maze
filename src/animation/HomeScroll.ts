import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { MAZE_CENTER } from "../config/config";

const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];

let originalPositions: Record<string, THREE.Vector3> = {};
let isScrollActive = false;

export function startHomeScrollAnimation() {
  isScrollActive = true;
  originalPositions = {};

  // Store original positions
  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    originalPositions[key] = obj.position.clone();
  });
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const originalPos = originalPositions[key];
    if (!originalPos) return;

    // Simple lerp between original position and center
    obj.position.lerpVectors(originalPos, MAZE_CENTER, animatedT);

    // Look at center when moving to center, look at original position when moving back
    if (animatedT > 0.5) {
      obj.lookAt(MAZE_CENTER);
    } else {
      obj.lookAt(originalPos);
    }
  });

  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function stopHomeScrollAnimation() {
  isScrollActive = false;
}

export function isScrubStillCatchingUp(): boolean {
  return false;
}
