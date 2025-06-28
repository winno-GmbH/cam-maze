import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
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
const ROTATION_SMOOTH_FACTOR = 0.1;

const currentRotations: Record<string, number> = {};

// Simple pause mechanism
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
      const pausedPositions = getPausedPositions();
      console.log("Paused positions:", pausedPositions);

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
  if (t < 0.01) {
    Object.keys(currentRotations).forEach((key) => {
      delete currentRotations[key];
    });
  }
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    if (!path) return;
    const position = path.getPointAt(t);
    if (!position) return;
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) return;
    ghost.position.copy(position);
    const targetRotation = Math.atan2(tangent.x, tangent.z);
    if (currentRotations[key] === undefined) {
      currentRotations[key] = targetRotation;
    }
    const currentRotation = currentRotations[key];
    let rotationDiff = targetRotation - currentRotation;
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    currentRotations[key] =
      currentRotation + rotationDiff * ROTATION_SMOOTH_FACTOR;
    if (key === "pacman") {
      ghost.rotation.set(
        Math.PI / 2,
        Math.PI,
        currentRotations[key] + Math.PI / 2
      );
    } else {
      ghost.rotation.set(0, currentRotations[key], 0);
    }
  });
  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}

export function getPausedPositions(): Record<string, THREE.Vector3> {
  return {
    pacman: pacman.position.clone(),
    ghost1: ghosts.ghost1.position.clone(),
    ghost2: ghosts.ghost2.position.clone(),
    ghost3: ghosts.ghost3.position.clone(),
    ghost4: ghosts.ghost4.position.clone(),
    ghost5: ghosts.ghost5.position.clone(),
  };
}
