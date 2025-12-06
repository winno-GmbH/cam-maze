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
import { vector3Pool, quaternionPool, object3DPool } from "../core/object-pool";

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
const pathPointCache: Record<string, { t: number; point: THREE.Vector3 }> = {};
const pathTangentCache: Record<string, { t: number; tangent: THREE.Vector3 }> =
  {};
const tempPosition = vector3Pool.acquire();
const tempQuaternion = quaternionPool.acquire();
const tempObject = object3DPool.acquire();
const ghostKeys = Object.keys(ghosts);

const homeLoopTangentSmoothers: Record<string, TangentSmoother> = {};
const tempVector = vector3Pool.acquire();
tempVector.set(1, 0, 0);
const initialVector = tempVector.clone();
vector3Pool.release(tempVector);

function initializeHomeLoopTangentSmoothers() {
  const smoothingFactor = TANGENT_SMOOTHING.HOME_LOOP;

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

  ghostKeys.forEach((key) => {
    const ghost = ghosts[key as keyof typeof ghosts];
    if (!ghost) return;
    tempPosition.copy(ghost.position);
    updateObjectPosition(key, tempPosition, true, true);
    tempQuaternion.copy(ghost.quaternion);
    updateObjectRotation(key, tempQuaternion, true);
  });

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

  ghostKeys.forEach((key) => {
    const ghost = ghosts[key as keyof typeof ghosts];
    if (!ghost) return;
    const path = homePaths[key];
    if (path) {
      if (hasBeenPausedBefore && savedT !== null) {
        const cacheKey = `${key}-${savedT}`;
        let position = pathPointCache[cacheKey]?.point;
        if (!position) {
          position = path.getPointAt(savedT);
          if (position) {
            pathPointCache[cacheKey] = { t: savedT, point: position.clone() };
          }
        }
        if (position) {
          ghost.position.copy(position);
          updateObjectPosition(key, position);
        }
      }

      const savedRotation = homeLoopStartRot[key];

      if (savedRotation) {
        ghost.quaternion.copy(savedRotation);
        updateObjectRotation(key, savedRotation);
        if (hasBeenPausedBefore) {
          startRotations[key] = savedRotation.clone();
        }
      } else {
        updateObjectRotation(key, ghost.quaternion);
        if (hasBeenPausedBefore) {
          startRotations[key] = ghost.quaternion.clone();
        }
      }

      if (key !== "pacman") {
        ghost.visible = true;
      }
      setObjectScale(ghost, key, "home");

      if (homeLoopTangentSmoothers[key] && savedT !== null) {
        const cacheKey = `${key}-tangent-${savedT}`;
        let initialTangent = pathTangentCache[cacheKey]?.tangent;
        if (!initialTangent) {
          initialTangent = path.getTangentAt(savedT);
          if (initialTangent) {
            pathTangentCache[cacheKey] = {
              t: savedT,
              tangent: initialTangent.clone(),
            };
          }
        }
        if (initialTangent) {
          homeLoopTangentSmoothers[key].reset(initialTangent);
        }
      }
    }
  });

  if (!homeLoopFrameRegistered) {
    let lastTime = clock.getElapsedTime();
    onFrame(() => {
      if (document.hidden) {
        lastTime = clock.getElapsedTime();
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

  animationTime += clampedDelta;
  rotationTransitionTime += clampedDelta;

  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  updateHomeLoopT(t, animationTime);

  if (!cachedHomePaths) {
    cachedHomePaths = getHomePaths();
  }
  const homePaths = cachedHomePaths;
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }

  const transitionProgress = Math.min(
    rotationTransitionTime / ROTATION_TRANSITION_DURATION,
    1
  );
  const isTransitioning = hasBeenPausedBefore && transitionProgress < 1;

  ghostKeys.forEach((key) => {
    const ghost = ghosts[key as keyof typeof ghosts];
    if (!ghost) return;
    const path = homePaths[key];
    if (path) {
      const objectT = t;

      const cacheKey = `${key}-${objectT}`;
      let position = pathPointCache[cacheKey]?.point;
      if (!position || Math.abs(pathPointCache[cacheKey].t - objectT) > 0.001) {
        position = path.getPointAt(objectT);
        if (position) {
          pathPointCache[cacheKey] = { t: objectT, point: position.clone() };
        }
      }
      if (position) {
        ghost.position.copy(position);
        updateObjectPosition(key, position);
      }

      const scaleKey = `${key}-home`;
      if (homeLoopScaleCache[scaleKey] !== "home") {
        setObjectScale(ghost, key, "home");
        homeLoopScaleCache[scaleKey] = "home";
      }

      tempQuaternion.set(0, 0, 0, 1);
      if (homeLoopTangentSmoothers[key] && objectT > 0) {
        const tangentCacheKey = `${key}-tangent-${objectT}`;
        let rawTangent = pathTangentCache[tangentCacheKey]?.tangent;
        if (
          !rawTangent ||
          Math.abs(pathTangentCache[tangentCacheKey].t - objectT) > 0.001
        ) {
          rawTangent = path.getTangentAt(objectT);
          if (rawTangent) {
            pathTangentCache[tangentCacheKey] = {
              t: objectT,
              tangent: rawTangent.clone(),
            };
          }
        }
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";

          tempObject.position.set(0, 0, 0);
          tempObject.rotation.set(0, 0, 0);
          tempObject.quaternion.set(0, 0, 0, 1);
          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          tempQuaternion.copy(tempObject.quaternion);
        }
      }

      if (isTransitioning && startRotations[key]) {
        const easedProgress =
          transitionProgress *
          transitionProgress *
          (3 - 2 * transitionProgress);
        tempQuaternion
          .copy(startRotations[key])
          .slerp(tempQuaternion, easedProgress);
        ghost.quaternion.copy(tempQuaternion);
      } else {
        ghost.quaternion.copy(tempQuaternion);
      }

      updateObjectRotation(key, ghost.quaternion);
    }
  });
}

export function homeLoopHandler() {
  if (window.scrollY === 0) {
    startHomeLoop();
  }
}

export function setupHomeLoopScrollHandler() {
  window.addEventListener("scroll", () => {
    if (window.scrollY === 0) {
      if (!isHomeLoopActive) {
        startHomeLoop();
      }
    } else {
      if (isHomeLoopActive) {
        stopHomeLoop();
      }
    }
  });
}
