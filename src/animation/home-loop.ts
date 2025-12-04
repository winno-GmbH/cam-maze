import * as THREE from "three";
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

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let homeLoopFrameRegistered = false;
let rotationTransitionTime = 0;
let startRotations: Record<string, THREE.Quaternion> = {};
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
    onFrame(() => updateHomeLoop(clock.getDelta()));
    homeLoopFrameRegistered = true;
  }
}

function updateHomeLoop(delta: number) {
  if (!isHomeLoopActive) return;
  animationTime += delta;
  rotationTransitionTime += delta;

  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  updateHomeLoopT(t, animationTime);

  const homePaths = getHomePaths();
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

      setObjectScale(ghost, key, "home");

      const targetQuat = new THREE.Quaternion();
      if (homeLoopTangentSmoothers[key] && objectT > 0) {
        const rawTangent = path.getTangentAt(objectT);
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";

          const tempObject = new THREE.Object3D();
          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          targetQuat.copy(tempObject.quaternion);
        }
      }

      if (isTransitioning && startRotations[key]) {
        const easedProgress =
          transitionProgress *
          transitionProgress *
          (3 - 2 * transitionProgress);
        ghost.quaternion.copy(
          startRotations[key].clone().slerp(targetQuat, easedProgress)
        );
      } else {
        ghost.quaternion.copy(targetQuat);
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
