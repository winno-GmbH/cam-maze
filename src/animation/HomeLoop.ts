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
let pauseStartTime = 0;
let totalPausedTime = 0;
let lastActiveTime = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let isWaitingForResume = false;

// Transition state
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
const TRANSITION_DURATION = 0.4; // seconds

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
  }
}

export function startHomeLoop() {
  if (isPaused) {
    const currentTime = performance.now() / 1000;
    totalPausedTime += currentTime - pauseStartTime;
    isPaused = false;
    isWaitingForResume = true;
  }
  isHomeLoopActive = true;
}

export function stopHomeLoop() {
  isHomeLoopActive = false;
  isPaused = true;
  pauseStartTime = performance.now() / 1000;

  const currentTime = performance.now() / 1000;
  lastActiveTime = currentTime - totalPausedTime;

  pausedPositions = {};
  pausedRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    pausedPositions[key] = ghost.position.clone();
    pausedRotations[key] = ghost.quaternion.clone();
  });

  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

export function setupScrollHandling() {
  let wasAtTop = true;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY === 0;

    if (wasAtTop && !isAtTop) {
      stopHomeLoop();
    } else if (!wasAtTop && isAtTop) {
      // Only resume HomeLoop if objects are at their paused positions
      if (areObjectsAtPausedPositions()) {
        isWaitingForResume = false;
        isHomeLoopActive = true;
        isPaused = false;
        const currentTime = performance.now() / 1000;
        totalPausedTime += currentTime - pauseStartTime;
        // Start transition from current (scroll) pos/rot to HomeLoop pos/rot
        const homePaths = getHomePaths();
        const targetPositions: Record<string, THREE.Vector3> = {};
        const targetRotations: Record<string, THREE.Quaternion> = {};
        let t: number;
        // Use the lastActiveTime to get the correct t
        const globalTime = lastActiveTime % LOOP_DURATION;
        t = globalTime / LOOP_DURATION;
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
      } else {
        isWaitingForResume = true;
        isHomeLoopActive = true;
      }
    }
    wasAtTop = isAtTop;
  });
}

function areObjectsAtPausedPositions(): boolean {
  if (Object.keys(pausedPositions).length === 0) {
    return true;
  }
  return Object.entries(ghosts).every(([key, ghost]) => {
    const pausedPos = pausedPositions[key];
    if (!pausedPos) return true;
    const distance = ghost.position.distanceTo(pausedPos);
    return distance <= POSITION_THRESHOLD;
  });
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

  let t: number;
  let animationTime: number;
  if (isPaused || isWaitingForResume) {
    animationTime = lastActiveTime;
  } else {
    const currentTime = performance.now() / 1000;
    animationTime = currentTime - totalPausedTime;
    lastActiveTime = animationTime;
  }
  const globalTime = animationTime % LOOP_DURATION;
  t = globalTime / LOOP_DURATION;

  if (isWaitingForResume) {
    if (window.scrollY === 0 && areObjectsAtPausedPositions()) {
      isWaitingForResume = false;
      isPaused = false;
      const currentTime = performance.now() / 1000;
      totalPausedTime += currentTime - pauseStartTime;
      // Start transition from current (scroll) pos/rot to HomeLoop pos/rot
      const homePaths = getHomePaths();
      const targetPositions: Record<string, THREE.Vector3> = {};
      const targetRotations: Record<string, THREE.Quaternion> = {};
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
