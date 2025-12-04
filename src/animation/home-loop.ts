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
  syncStateFromObjects,
  getCurrentPositions,
  getCurrentRotations,
  updateObjectPosition,
  updateObjectRotation,
  setHomeLoopActive,
  updateHomeLoopT,
  updateHomeLoopPausedT,
  getHomeLoopStartPositions,
  getHomeLoopStartRotations,
  clearHomeLoopStartPositions,
  clearHomeLoopStartRotations,
} from "./object-state";
import { isCurrencySymbol } from "./util";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
let homeLoopFrameRegistered = false;
let rotationTransitionTime = 0;
let startRotations: Record<string, THREE.Quaternion> = {};
let hasBeenPausedBefore = false;
let objectTValues: Record<string, number> = {};

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
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;

  updateHomeLoopPausedT(pausedT);

  syncStateFromObjects(true);

  Object.entries(ghosts).forEach(([key, ghost]) => {
    updateObjectPosition(key, ghost.position.clone(), true, true);
    updateObjectRotation(key, ghost.quaternion.clone(), true);
  });

  initHomeScrollAnimation();
}

function startHomeLoop() {
  isHomeLoopActive = true;
  setHomeLoopActive(true);

  const homePaths = getHomePaths();
  const homeLoopStartPos = getHomeLoopStartPositions();
  const homeLoopStartRot = getHomeLoopStartRotations();

  objectTValues = {};

  if (hasBeenPausedBefore && Object.keys(homeLoopStartPos).length > 0) {
    let totalT = 0;
    let count = 0;
    Object.entries(homeLoopStartPos).forEach(([key, pos]) => {
      const path = homePaths[key];
      if (path) {
        let closestT = 0;
        let closestDist = Infinity;
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const pathPoint = path.getPointAt(t);
          if (pathPoint) {
            const dist = pathPoint.distanceTo(pos);
            if (dist < closestDist) {
              closestDist = dist;
              closestT = t;
            }
          }
        }
        objectTValues[key] = closestT;
        totalT += closestT;
        count++;
      }
    });
    if (count > 0) {
      pausedT = totalT / count;
    }
    animationTime = pausedT * LOOP_DURATION;
  }

  rotationTransitionTime = 0;
  startRotations = {};

  applyHomeLoopPreset(true);

  initializeHomeLoopTangentSmoothers();

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const savedPosition = homeLoopStartPos[key];
      const savedRotation = homeLoopStartRot[key];

      let initialPosition: THREE.Vector3 | null = null;

      if (objectTValues[key] !== undefined) {
        initialPosition = path.getPointAt(objectTValues[key]);
      } else if (savedPosition) {
        initialPosition = savedPosition;
      } else {
        const currentPositions = getCurrentPositions();
        const currentPosition = currentPositions[key];
        if (currentPosition) {
          initialPosition = currentPosition;
        } else {
          initialPosition = path.getPointAt(pausedT);
        }
      }

      if (initialPosition) {
        ghost.position.copy(initialPosition);
        updateObjectPosition(key, initialPosition);
      }

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

      if (homeLoopTangentSmoothers[key]) {
        const tangentT =
          objectTValues[key] !== undefined ? objectTValues[key] : pausedT;
        const initialTangent = path.getTangentAt(tangentT);
        if (initialTangent) {
          homeLoopTangentSmoothers[key].reset(initialTangent);
        }
      }
    }
  });

  syncStateFromObjects();

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
      let objectT = t;
      if (objectTValues[key] !== undefined) {
        const deltaT = t - pausedT;
        objectT = (objectTValues[key] + deltaT + 1) % 1;
      }

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
    if (window.scrollY !== 0) {
      stopHomeLoop();
    }
  });
}
