import * as THREE from "three";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock, onFrame } from "../core/scene";
import { getHomePaths, TangentSmoother } from "../paths/paths";
import { initHomeScrollAnimation } from "./home-scroll";
import { calculateObjectOrientation, OBJECT_KEYS } from "./util";
import { applyHomeLoopPreset } from "./scene-presets";
import {
  SCALE,
  TANGENT_SMOOTHING,
  ROTATION_TRANSITION_DURATION,
} from "./constants";
import { setObjectScale } from "./scene-utils";
import {
  updateObjectPosition,
  updateObjectRotation,
  setHomeLoopActive,
  updateHomeLoopT,
  getHomeLoopStartRotations,
  setHomeLoopStartT,
  getHomeLoopStartT,
} from "./object-state";
import { isCurrencySymbol } from "./util";
import {
  quaternionPool,
  object3DPool,
  vector3PoolTemp,
  quaternionPoolTemp,
} from "../core/object-pool";
import { pathCache } from "../paths/path-cache";
import { throttle } from "../core/throttle";
import { adaptivePerformance } from "../core/adaptive-performance";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let homeLoopFrameRegistered = false;
let rotationTransitionTime = 0;
let startRotations: Record<string, THREE.Quaternion> = {};
let cachedHomePaths: Record<string, THREE.CurvePath<THREE.Vector3>> | null =
  null;
const homeLoopScaleCache: Record<string, string> = {};
let hasBeenPausedBefore = false;

const homeLoopTangentSmoothers: Record<string, TangentSmoother> = {};

function initializeHomeLoopTangentSmoothers() {
  const smoothingFactor = TANGENT_SMOOTHING.HOME_LOOP;
  const initialVector = new THREE.Vector3(1, 0, 0);

  OBJECT_KEYS.forEach((key) => {
    homeLoopTangentSmoothers[key] = new TangentSmoother(
      initialVector.clone(),
      smoothingFactor
    );
  });
}

function stopHomeLoop() {
  if (!isHomeLoopActive) return;
  isHomeLoopActive = false;
  setHomeLoopActive(false);
  hasBeenPausedBefore = true;

  const exactT = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  setHomeLoopStartT(exactT);

  for (const key of OBJECT_KEYS) {
    const ghost = ghosts[key];
    const tempPos = vector3PoolTemp.acquire();
    tempPos.copy(ghost.position);
    updateObjectPosition(key, tempPos, true, true);
    vector3PoolTemp.release(tempPos);

    const tempRot = quaternionPoolTemp.acquire();
    tempRot.copy(ghost.quaternion);
    updateObjectRotation(key, tempRot, true);
    quaternionPoolTemp.release(tempRot);
  }

  initHomeScrollAnimation();
}

export function startHomeLoop() {
  isHomeLoopActive = true;
  setHomeLoopActive(true);

  const homePaths = getHomePaths();
  const homeLoopStartRot = getHomeLoopStartRotations();
  const savedT = getHomeLoopStartT();

  if (hasBeenPausedBefore && savedT !== null) {
    animationTime = savedT * LOOP_DURATION;
  }

  rotationTransitionTime = 0;
  startRotations = {};

  applyHomeLoopPreset(true);

  initializeHomeLoopTangentSmoothers();

  for (const key of OBJECT_KEYS) {
    const ghost = ghosts[key];
    const path = homePaths[key];
    if (path) {
      if (hasBeenPausedBefore && savedT !== null) {
        const tempPos = vector3PoolTemp.acquire();
        pathCache.getPoint(path, savedT, tempPos);
        ghost.position.copy(tempPos);
        updateObjectPosition(key, tempPos);
        vector3PoolTemp.release(tempPos);
      }

      const savedRotation = homeLoopStartRot[key];

      if (savedRotation) {
        ghost.quaternion.copy(savedRotation);
        updateObjectRotation(key, savedRotation);
        if (hasBeenPausedBefore) {
          const tempRot = quaternionPoolTemp.acquire();
          tempRot.copy(savedRotation);
          startRotations[key] = tempRot;
        }
      } else {
        updateObjectRotation(key, ghost.quaternion);
        if (hasBeenPausedBefore) {
          const tempRot = quaternionPoolTemp.acquire();
          tempRot.copy(ghost.quaternion);
          startRotations[key] = tempRot;
        }
      }

      if (key !== "pacman") {
        ghost.visible = true;
      }
      const scaleKey = `${key}-home`;
      if (homeLoopScaleCache[scaleKey] !== "home") {
        setObjectScale(ghost, key, "home");
        homeLoopScaleCache[scaleKey] = "home";
      }

      if (homeLoopTangentSmoothers[key] && savedT !== null) {
        const tempTangent = vector3PoolTemp.acquire();
        pathCache.getTangent(path, savedT, tempTangent);
        if (tempTangent.length() > 0) {
          homeLoopTangentSmoothers[key].reset(tempTangent);
        }
        vector3PoolTemp.release(tempTangent);
      }
    }
  }

  if (!homeLoopFrameRegistered) {
    let lastTime = clock.getElapsedTime();
    onFrame(() => {
      if (document.hidden) {
        lastTime = clock.getElapsedTime();
        return;
      }

      if (!adaptivePerformance.update()) {
        return;
      }

      const currentTime = clock.getElapsedTime();
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      updateHomeLoop(delta);
    });
    homeLoopFrameRegistered = true;
  }
}

function updateHomeLoop(delta: number) {
  if (!isHomeLoopActive) return;

  const introScrollTrigger = ScrollTrigger.getById("introScroll");
  if (introScrollTrigger?.isActive) return;

  const maxDelta = 0.1;
  const clampedDelta = Math.min(delta, maxDelta);
  const updateInterval = adaptivePerformance.getUpdateInterval();
  const adjustedDelta = clampedDelta * updateInterval;

  animationTime += adjustedDelta;
  rotationTransitionTime += adjustedDelta;

  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  updateHomeLoopT(t, animationTime);

  if (!cachedHomePaths) {
    cachedHomePaths = getHomePaths();
  }
  const homePaths = cachedHomePaths;
  if (pacmanMixer) {
    pacmanMixer.update(adjustedDelta);
  }

  const transitionProgress = Math.min(
    rotationTransitionTime / ROTATION_TRANSITION_DURATION,
    1
  );
  const isTransitioning = hasBeenPausedBefore && transitionProgress < 1;

  const shouldSimplify = adaptivePerformance.getCurrentFps() < 20;

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const objectT = t;

      const tempPos = vector3PoolTemp.acquire();
      pathCache.getPoint(path, objectT, tempPos);
      ghost.position.copy(tempPos);
      updateObjectPosition(key, tempPos);
      vector3PoolTemp.release(tempPos);

      const scaleKey = `${key}-home`;
      if (homeLoopScaleCache[scaleKey] !== "home") {
        setObjectScale(ghost, key, "home");
        homeLoopScaleCache[scaleKey] = "home";
      }

      const targetQuat = quaternionPool.acquire();
      if (homeLoopTangentSmoothers[key] && objectT > 0) {
        const rawTangent = vector3PoolTemp.acquire();
        pathCache.getTangent(path, objectT, rawTangent);
        if (rawTangent.length() > 0) {
          let smoothTangent = rawTangent;
          if (!shouldSimplify) {
            smoothTangent = homeLoopTangentSmoothers[key].update(rawTangent);
          }
          const objectType = key === "pacman" ? "pacman" : "ghost";

          const tempObject = object3DPool.acquire();
          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          targetQuat.copy(tempObject.quaternion);
          object3DPool.release(tempObject);
        }
        vector3PoolTemp.release(rawTangent);
      }

      if (isTransitioning && startRotations[key]) {
        const easedProgress =
          transitionProgress *
          transitionProgress *
          (3 - 2 * transitionProgress);
        const tempQuat = quaternionPool.acquire();
        tempQuat.copy(startRotations[key]).slerp(targetQuat, easedProgress);
        ghost.quaternion.copy(tempQuat);
        quaternionPool.release(tempQuat);
      } else {
        ghost.quaternion.copy(targetQuat);
      }

      updateObjectRotation(key, ghost.quaternion);
      quaternionPool.release(targetQuat);
    }
  });
}

export function homeLoopHandler() {
  if (window.scrollY === 0) {
    startHomeLoop();
  }
}

export function setupHomeLoopScrollHandler() {
  const throttledScrollHandler = throttle(() => {
    if (window.scrollY === 0) {
      if (!isHomeLoopActive) {
        startHomeLoop();
      }
    } else {
      if (isHomeLoopActive) {
        stopHomeLoop();
      }
    }
  }, 16);

  window.addEventListener("scroll", throttledScrollHandler, { passive: true });
}
