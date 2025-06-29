import * as THREE from "three";
import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { getAllPaths } from "../paths/paths";
import { clock } from "../core/scene";

const pathMapping = {
  pacman: "pacmanHome",
  ghost1: "ghost1Home",
  ghost2: "ghost2Home",
  ghost3: "ghost3Home",
  ghost4: "ghost4Home",
  ghost5: "ghost5Home",
} as const;

const LOOP_DURATION = 40;

let isHomeLoopActive = true;
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTime = 0;

export function startHomeLoop() {
  isHomeLoopActive = true;
  if (isPaused) {
    const currentTime = performance.now() / 1000;
    totalPausedTime += currentTime - pauseStartTime;
    isPaused = false;
  }
}

export function stopHomeLoop() {
  isHomeLoopActive = false;
  isPaused = true;
  pauseStartTime = performance.now() / 1000;
}

export function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    }
    wasAtTop = isAtTop;
  });
}

export function updateHomeLoop() {
  if (!isHomeLoopActive) return;
  const currentTime = performance.now() / 1000;
  const adjustedTime = currentTime - totalPausedTime;
  const globalTime = adjustedTime % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION;

  const allPaths = getAllPaths(pacman, ghosts);

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (allPaths as any)[pathKey];
    if (!path) return;
    const position = path.getPointAt(t);
    if (!position) return;
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) return;

    ghost.position.copy(position);

    const objectType = key === "pacman" ? "pacman" : "ghost";
    calculateObjectOrientation(ghost, tangent, objectType);
  });

  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}

export function calculateObjectOrientation(
  object: THREE.Object3D,
  tangent: THREE.Vector3,
  objectType: "pacman" | "ghost" | "camera" = "ghost"
): void {
  if (!tangent || tangent.length() === 0) return;

  const targetRotation = Math.atan2(tangent.x, tangent.z);

  if (objectType === "pacman") {
    object.rotation.set(Math.PI / 2, Math.PI, targetRotation + Math.PI / 2);
  } else if (objectType === "ghost") {
    object.rotation.set(0, targetRotation, 0);
  } else if (objectType === "camera") {
    const lookAtPoint = object.position.clone().add(tangent);
    object.lookAt(lookAtPoint);
  }
}
