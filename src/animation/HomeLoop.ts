import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";
import * as THREE from "three";

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
const TRANSITION_DURATION = 0.8; // Duration of smooth transition back to home loop

const currentRotations: Record<string, number> = {};

// Animation states
let isHomeLoopActive = true;
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTime = 0;
let isTransitioningToHome = false;
let transitionStartTime = 0;

// Transition state
let transitionCurves: Record<
  string,
  {
    curve: THREE.QuadraticBezierCurve3;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    targetRotation: number;
  }
> = {};

// --- Scroll Animation State ---
let isScrollAnimationActive = false;
let scrollAnimationCurves: Record<
  string,
  { curve: THREE.QuadraticBezierCurve3; start: number; duration: number }
> = {};
let scrollAnimationStartProgress = 0;
let scrollAnimationEndProgress = 1;
let scrollAnimationProgress = 0; // 0..1
const mazeCenter = new THREE.Vector3(0, 0.5, 0); // Adjust as needed
const curveHeight = 2.5; // How high above the maze the arc should go
const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];
const ghostDelays = [0.0, 0.08, 0.16, 0.24, 0.32, 0.44]; // Pacman last
const ghostDurations = [0.36, 0.36, 0.36, 0.36, 0.36, 0.36]; // All finish before camera (end < 1)

export function startHomeLoop() {
  isHomeLoopActive = true;
  if (isPaused) {
    const currentTime = performance.now() / 1000;
    totalPausedTime += currentTime - pauseStartTime;
    isPaused = false;
  }
  isScrollAnimationActive = false;
}

export function stopHomeLoop() {
  isHomeLoopActive = false;
  isPaused = true;
  pauseStartTime = performance.now() / 1000;
}

export function startScrollAnimation(
  scrollStartProgress = 0,
  scrollEndProgress = 1
) {
  // Called when scroll section starts
  isScrollAnimationActive = true;
  isHomeLoopActive = false;
  scrollAnimationCurves = {};
  scrollAnimationStartProgress = scrollStartProgress;
  scrollAnimationEndProgress = scrollEndProgress;
  scrollAnimationProgress = 0;

  ghostOrder.forEach((key, i) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const startPos = obj.position.clone();
    // High midpoint between start and center
    const mid = startPos.clone().lerp(mazeCenter, 0.5);
    mid.y += curveHeight;
    const curve = new THREE.QuadraticBezierCurve3(
      startPos,
      mid,
      mazeCenter.clone()
    );
    scrollAnimationCurves[key] = {
      curve,
      start: ghostDelays[i],
      duration: ghostDurations[i],
    };
  });
}

export function updateScrollAnimation(scrollProgress: number) {
  // scrollProgress: 0..1 through the scroll section
  if (!isScrollAnimationActive) return;
  scrollAnimationProgress = scrollProgress;
  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;
    // Map scroll progress to this object's animation progress
    let t = (scrollProgress - anim.start) / anim.duration;
    t = Math.max(0, Math.min(1, t));
    const pos = anim.curve.getPoint(t);
    obj.position.copy(pos);
    // Look at center for now
    obj.lookAt(mazeCenter);
  });
  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function resetToHomeLoop() {
  isScrollAnimationActive = false;
  isHomeLoopActive = true;
}

export function startTransitionToHome() {
  isTransitioningToHome = true;
  transitionStartTime = performance.now() / 1000;
  transitionCurves = {};

  // Calculate current time in home loop for smooth continuation
  const currentTime = performance.now() / 1000;
  const adjustedTime = currentTime - totalPausedTime;
  const globalTime = adjustedTime % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION;

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    if (!path) return;

    const startPos = ghost.position.clone();
    const targetPos = path.getPointAt(t);
    if (!targetPos) return;

    // Create smooth curve from current position to target position
    const mid = startPos.clone().lerp(targetPos, 0.5);
    mid.y += 0.5; // Slight arc for smooth transition

    const curve = new THREE.QuadraticBezierCurve3(startPos, mid, targetPos);

    const tangent = path.getTangentAt(t);
    const targetRotation = tangent ? Math.atan2(tangent.x, tangent.z) : 0;

    transitionCurves[key] = {
      curve,
      startPos,
      targetPos,
      targetRotation,
    };
  });
}

export function updateTransitionToHome() {
  if (!isTransitioningToHome) return;

  const currentTime = performance.now() / 1000;
  const elapsed = currentTime - transitionStartTime;
  const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

  // Ease out for smooth arrival
  const easedProgress = 1 - Math.pow(1 - progress, 3);

  let allComplete = true;

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const transition = transitionCurves[key];
    if (!transition) return;

    const pos = transition.curve.getPointAt(easedProgress);
    ghost.position.copy(pos);

    // Smooth rotation transition
    if (currentRotations[key] === undefined) {
      currentRotations[key] = transition.targetRotation;
    }

    const currentRotation = currentRotations[key];
    let rotationDiff = transition.targetRotation - currentRotation;
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

    if (progress < 1) {
      allComplete = false;
    }
  });

  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);

  // When transition is complete, resume home loop
  if (allComplete) {
    isTransitioningToHome = false;
    isHomeLoopActive = true;
    transitionCurves = {};
  }
}

export function updateHomeLoop() {
  if (!isHomeLoopActive || isTransitioningToHome) return;

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
