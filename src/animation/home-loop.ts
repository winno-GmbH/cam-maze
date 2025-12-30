import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer, pill } from "../core/objects";
import { clock, onFrame, scene } from "../core/scene";
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
// Cache Object.entries to avoid recreating array every frame
const ghostEntries = Object.entries(ghosts);
// Reusable temp objects to avoid allocations
const tempObject = new THREE.Object3D();
const tempQuaternion = new THREE.Quaternion();
// Track last scale values to avoid unnecessary updates
const lastScales: Record<string, number> = {};

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

  // Smooth camera transition to home loop start position
  const { getStartPosition, getLookAtPosition } = require("../paths/pathpoints");
  const targetCameraPos = getStartPosition();
  const currentCameraPos = camera.position.clone();
  const cameraDistance = currentCameraPos.distanceTo(targetCameraPos);

  // Check if we're coming from home-scroll
  const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
  const wasInHomeScroll = homeScrollTrigger && homeScrollTrigger.progress > 0;

  // Always transition if distance is significant
  if (cameraDistance > 0.1) {
    gsap.killTweensOf(camera.position);
    
    // Use longer transition when coming from home-scroll
    const transitionDuration = wasInHomeScroll ? 1.0 : 0.5;
    
    gsap.to(camera.position, {
      x: targetCameraPos.x,
      y: targetCameraPos.y,
      z: targetCameraPos.z,
      duration: transitionDuration,
      ease: "power2.out",
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });

    // Also transition lookAt
    const targetLookAt = getLookAtPosition();
    const lookAtProps = { t: 0 };
    const startLookAt = new THREE.Vector3();
    camera.getWorldDirection(startLookAt);
    startLookAt.multiplyScalar(10).add(currentCameraPos);

    gsap.to(lookAtProps, {
      t: 1,
      duration: transitionDuration,
      ease: "power2.out",
      onUpdate: () => {
        const currentLookAt = startLookAt
          .clone()
          .lerp(targetLookAt, lookAtProps.t);
        camera.lookAt(currentLookAt);
        camera.updateProjectionMatrix();
      },
    });
  } else {
    // If already close, just set directly
    camera.position.copy(targetCameraPos);
    const targetLookAt = getLookAtPosition();
    camera.lookAt(targetLookAt);
    camera.updateProjectionMatrix();
  }

  applyHomeLoopPreset(true);

  initializeHomeLoopTangentSmoothers();

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      if (hasBeenPausedBefore && savedT !== null) {
        const targetPosition = path.getPointAt(savedT);
        if (targetPosition) {
          // Get current position BEFORE any changes to avoid first frame jump
          const currentPosition = ghost.position.clone();
          const distance = currentPosition.distanceTo(targetPosition);

          // Check if we're transitioning from home-scroll
          const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
          const isTransitioningFromHomeScroll =
            homeScrollTrigger && homeScrollTrigger.isActive;

          // Always use smooth transition when coming from home-scroll or if distance is significant
          if (distance > 0.001 || isTransitioningFromHomeScroll) {
            // Kill any existing position animations
            gsap.killTweensOf(ghost.position);

            // IMPORTANT: Set initial position to current to prevent first frame jump
            ghost.position.copy(currentPosition);

            // Smooth transition to target position
            // Use longer duration when transitioning from scroll for smoother effect
            gsap.to(ghost.position, {
              x: targetPosition.x,
              y: targetPosition.y,
              z: targetPosition.z,
              duration: isTransitioningFromHomeScroll ? 0.8 : 0.5,
              ease: "power2.out",
              onUpdate: () => {
                updateObjectPosition(key, ghost.position);
              },
              onComplete: () => {
                updateObjectPosition(key, targetPosition);
              },
            });
          } else {
            // If very close and not transitioning, just set directly
            ghost.position.copy(targetPosition);
            updateObjectPosition(key, targetPosition);
          }
        }
      }

      const savedRotation = homeLoopStartRot[key];

      if (savedRotation) {
        // Smooth rotation transition
        const currentQuat = ghost.quaternion.clone();
        const angle = currentQuat.angleTo(savedRotation);

        // Only animate if there's a significant rotation difference
        if (angle > 0.01) {
          gsap.killTweensOf(ghost.quaternion);

          // Create a temporary object to animate quaternion
          const quatProps = { t: 0 };
          gsap.to(quatProps, {
            t: 1,
            duration: 0.5,
            ease: "power2.out",
            onUpdate: () => {
              ghost.quaternion
                .copy(currentQuat)
                .slerp(savedRotation, quatProps.t);
              updateObjectRotation(key, ghost.quaternion);
            },
            onComplete: () => {
              ghost.quaternion.copy(savedRotation);
              updateObjectRotation(key, savedRotation);
              if (hasBeenPausedBefore) {
                startRotations[key] = savedRotation.clone();
              }
            },
          });
        } else {
          ghost.quaternion.copy(savedRotation);
          updateObjectRotation(key, savedRotation);
          if (hasBeenPausedBefore) {
            startRotations[key] = savedRotation.clone();
          }
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
  
  // Don't update if home-scroll is active (to prevent rotation conflicts)
  const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
  if (homeScrollTrigger?.isActive) return;

  const maxDelta = 0.1;
  const clampedDelta = Math.min(delta, maxDelta);

  animationTime += clampedDelta;
  rotationTransitionTime += clampedDelta;

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

  // Use cached entries instead of Object.entries() every frame
  for (let i = 0; i < ghostEntries.length; i++) {
    const [key, ghost] = ghostEntries[i];
    const path = homePaths[key];
    if (path) {
      const objectT = t;

      const position = path.getPointAt(objectT);
      if (position) {
        ghost.position.copy(position);
        updateObjectPosition(key, position);
      }

      // Only update scale if it changed
      const expectedScale =
        key === "pacman" ? SCALE.PACMAN_HOME : SCALE.GHOST_NORMAL;
      if (lastScales[key] !== expectedScale) {
        setObjectScale(ghost, key, "home");
        lastScales[key] = expectedScale;
      }

      // Reuse tempQuaternion instead of creating new one
      tempQuaternion.set(0, 0, 0, 1);
      if (homeLoopTangentSmoothers[key] && objectT > 0) {
        const rawTangent = path.getTangentAt(objectT);
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";

          // Reuse tempObject instead of creating new one
          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          tempQuaternion.copy(tempObject.quaternion);
        }
      }

      if (isTransitioning && startRotations[key]) {
        const easedProgress =
          transitionProgress *
          transitionProgress *
          (3 - 2 * transitionProgress);
        // Use tempQuaternion for slerp result instead of cloning
        const slerpResult = startRotations[key]
          .clone()
          .slerp(tempQuaternion, easedProgress);
        ghost.quaternion.copy(slerpResult);
      } else {
        ghost.quaternion.copy(tempQuaternion);
      }

      updateObjectRotation(key, ghost.quaternion);
    }
  }
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
