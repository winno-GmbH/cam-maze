import { ghosts, pacmanMixer } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { clock } from "../core/scene";
import { calculateObjectOrientation } from "./util";
import * as THREE from "three";
import { initHomeScrollAnimation } from "./HomeScroll";

const LOOP_DURATION = 40;
const POSITION_THRESHOLD = 0.01;

let isHomeLoopActive = true;
let isPaused = false;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let isWaitingForResume = false;

let animationTime = 0;

let isTransitioning = false;
let transitionStart: Record<
  string,
  { pos: THREE.Vector3; quat: THREE.Quaternion }
> = {};
let transitionEnd: Record<
  string,
  { pos: THREE.Vector3; quat: THREE.Quaternion }
> = {};
let transitionProgress = 0;
const TRANSITION_DURATION = 0.4;

function startTransition(
  targetPositions: Record<string, THREE.Vector3>,
  targetRotations: Record<string, THREE.Quaternion>
) {
  isTransitioning = true;
  transitionProgress = 0;
  transitionStart = {};
  transitionEnd = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    transitionStart[key] = {
      pos: ghost.position.clone(),
      quat: ghost.quaternion.clone(),
    };
    transitionEnd[key] = {
      pos: targetPositions[key].clone(),
      quat: targetRotations[key].clone(),
    };
  });
}

function updateTransition(deltaTime: number) {
  if (!isTransitioning) return;
  transitionProgress += deltaTime / TRANSITION_DURATION;
  const t = Math.min(transitionProgress, 1);
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const start = transitionStart[key];
    const end = transitionEnd[key];
    if (start && end) {
      ghost.position.lerpVectors(start.pos, end.pos, t);
      ghost.quaternion.slerpQuaternions(start.quat, end.quat, t);
    }
  });
  if (t >= 1) {
    isTransitioning = false;
    // Reset pausedT to 0 so the HomeLoop continues from current animationTime
    pausedT = 0;
  }
}

export function startHomeLoop() {
  if (isPaused) {
    isPaused = false;
    isWaitingForResume = true;
  }
  isHomeLoopActive = true;
  console.log("[HomeLoop] startHomeLoop", "pausedT:", pausedT);
}

export function stopHomeLoop() {
  console.log("[HomeLoop] stopHomeLoop called");
  console.log("  Current animationTime:", animationTime);
  console.log("  Current object positions:");
  Object.entries(ghosts).forEach(([key, ghost]) => {
    console.log(`    [${key}]:`, ghost.position.toArray());
  });

  isHomeLoopActive = false;
  isPaused = true;

  // Calculate t at pause based on animationTime
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  // Completely overwrite with fresh current positions and rotations
  pausedPositions = {};
  pausedRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });

  console.log("[HomeLoop] stopHomeLoop completed");
  console.log("  pausedT:", pausedT);
  Object.entries(pausedPositions).forEach(([key, pos]) => {
    console.log(`  pausedPositions[${key}]:`, pos.toArray());
  });

  // Immediately stop updating objects to prevent any movement
  // The scroll animation will take over from the current positions
  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

export function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    } else if (!wasAtTop && isAtTop) {
      // Always resume HomeLoop when scrolling back to top
      isWaitingForResume = false;
      isHomeLoopActive = true;
      isPaused = false;
      const homePaths = getHomePaths();
      const targetPositions: Record<string, THREE.Vector3> = {};
      const targetRotations: Record<string, THREE.Quaternion> = {};
      const t = pausedT;
      Object.entries(ghosts).forEach(([key, ghost]) => {
        const path = homePaths[key];
        if (path) {
          const position = path.getPointAt(t);
          const tangent = path.getTangentAt(t);
          targetPositions[key] = position.clone();
          // Use the same orientation logic as HomeLoop
          const tempObj = new THREE.Object3D();
          tempObj.position.copy(position);
          if (tangent && tangent.length() > 0) {
            const objectType = key === "pacman" ? "pacman" : "ghost";
            calculateObjectOrientation(tempObj, tangent, objectType);
          }
          targetRotations[key] = tempObj.quaternion.clone();
        } else {
          targetPositions[key] = ghost.position.clone();
          targetRotations[key] = ghost.quaternion.clone();
        }
      });
      startTransition(targetPositions, targetRotations);
    }
    wasAtTop = isAtTop;
  });
}

function areObjectsAtPausedPositions(): boolean {
  if (Object.keys(pausedPositions).length === 0) {
    return true;
  }
  console.log("[HomeLoop] Checking if objects are at paused positions:");
  const result = Object.entries(ghosts).every(([key, ghost]) => {
    const pausedPos = pausedPositions[key];
    if (!pausedPos) return true;
    const distance = ghost.position.distanceTo(pausedPos);
    console.log(
      `  [${key}] current:`,
      ghost.position.toArray(),
      "paused:",
      pausedPos.toArray(),
      "distance:",
      distance
    );
    return distance <= POSITION_THRESHOLD;
  });
  console.log("  Result:", result);
  return result;
}

export function updateHomeLoop() {
  if (!isHomeLoopActive) return;

  // Handle transition
  const delta = clock.getDelta();
  if (isTransitioning) {
    updateTransition(delta);
    if (pacmanMixer) {
      pacmanMixer.update(delta);
    }
    return;
  }

  // If paused, don't update object positions at all
  if (isPaused) {
    if (pacmanMixer) {
      pacmanMixer.update(delta);
    }
    return;
  }

  let t: number;
  if (isWaitingForResume) {
    t = pausedT;
  } else {
    animationTime += delta;
    t = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  }

  if (isWaitingForResume) {
    if (window.scrollY === 0 && areObjectsAtPausedPositions()) {
      isWaitingForResume = false;
      isPaused = false;
      // Start transition from current (scroll) pos/rot to HomeLoop pos/rot at pausedT
      const homePaths = getHomePaths();
      const targetPositions: Record<string, THREE.Vector3> = {};
      const targetRotations: Record<string, THREE.Quaternion> = {};
      const tTransition = pausedT;
      // Debug: Log resume state
      console.log("[HomeLoop] Resume HomeLoop");
      console.log("  pausedT:", pausedT);
      Object.entries(ghosts).forEach(([key, ghost]) => {
        const path = homePaths[key];
        let targetPos: THREE.Vector3;
        if (path) {
          targetPos = path.getPointAt(tTransition);
          const tangent = path.getTangentAt(tTransition);
          targetPositions[key] = targetPos.clone();
          // Use the same orientation logic as HomeLoop
          const tempObj = new THREE.Object3D();
          tempObj.position.copy(targetPos);
          if (tangent && tangent.length() > 0) {
            const objectType = key === "pacman" ? "pacman" : "ghost";
            calculateObjectOrientation(tempObj, tangent, objectType);
          }
          targetRotations[key] = tempObj.quaternion.clone();
        } else {
          targetPos = ghost.position.clone();
          targetPositions[key] = targetPos.clone();
          targetRotations[key] = ghost.quaternion.clone();
        }
        // Debug: Log current and target positions and distance
        const currentPos = ghost.position;
        const dist = currentPos.distanceTo(targetPos);
        console.log(
          `  [${key}] current:`,
          currentPos.toArray(),
          "target:",
          targetPos.toArray(),
          "dist:",
          dist
        );
      });
      startTransition(targetPositions, targetRotations);
      return;
    } else {
      return;
    }
  }

  const homePaths = getHomePaths();

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (!path) {
      return;
    }
    const position = path.getPointAt(t);
    if (!position) {
      return;
    }
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) {
      return;
    }

    ghost.position.copy(position);

    const objectType = key === "pacman" ? "pacman" : "ghost";
    calculateObjectOrientation(ghost, tangent, objectType);
  });

  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}
