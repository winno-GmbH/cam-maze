import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { createHomeScrollPaths } from "../paths/paths";

const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];

let isScrollActive = false;
let scrollPaths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

export function startHomeScrollAnimation() {
  isScrollActive = true;

  // Create paths dynamically using the function from pathpoints.ts
  scrollPaths = createHomeScrollPaths(pacman, ghosts);
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;

    const path = scrollPaths[key];
    if (!path) return;

    // Use the path to get position at the current time
    const position = path.getPointAt(animatedT);
    if (!position) return;

    obj.position.copy(position);

    // Look at the next point on the path for orientation
    const nextT = Math.min(1, animatedT + 0.01);
    const nextPosition = path.getPointAt(nextT);
    if (nextPosition) {
      obj.lookAt(nextPosition);
    }
  });

  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function stopHomeScrollAnimation() {
  isScrollActive = false;
  scrollPaths = {};
}

export function isScrubStillCatchingUp(): boolean {
  return false;
}
