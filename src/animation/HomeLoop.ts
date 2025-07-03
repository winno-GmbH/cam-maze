import { ghosts, pacman, pacmanMixer } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { clock } from "../core/scene";
import { calculateObjectOrientation } from "./util";

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

  const homePaths = getHomePaths();

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = homePaths[pathKey];
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

  // Debug: Log object positions every 60 frames (once per second at 60fps)
  if (Math.floor(currentTime * 60) % 60 === 0) {
    console.log("Home loop - Object positions:", {
      pacman: pacman.position,
      ghost1: ghosts.ghost1.position,
      ghost2: ghosts.ghost2.position,
      ghost3: ghosts.ghost3.position,
      ghost4: ghosts.ghost4.position,
      ghost5: ghosts.ghost5.position,
    });
  }
}
