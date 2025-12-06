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
import { quaternionPool, object3DPool } from "../core/object-pool";

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

  Object.entries(ghosts).forEach(([key, ghost]) => {
    updateObjectPosition(key, ghost.position.clone(), true, true);
    updateObjectRotation(key, ghost.quaternion.clone(), true);
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

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      if (hasBeenPausedBefore && savedT !== null) {
        const position = path.getPointAt(savedT);
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
        const initialTangent = path.getTangentAt(savedT);
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

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const objectT = t;

      const position = path.getPointAt(objectT);
      if (position) {
        ghost.position.copy(position);
        updateObjectPosition(key, position);
      }

      const scaleKey = `${key}-home`;
      if (homeLoopScaleCache[scaleKey] !== "home") {
        setObjectScale(ghost, key, "home");
        homeLoopScaleCache[scaleKey] = "home";
      }

      const targetQuat = quaternionPool.acquire();
      if (homeLoopTangentSmoothers[key] && objectT > 0) {
        const rawTangent = path.getTangentAt(objectT);
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";

          const tempObject = object3DPool.acquire();
          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          targetQuat.copy(tempObject.quaternion);
          object3DPool.release(tempObject);
        }
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
