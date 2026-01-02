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
import { getStartPosition, getLookAtPosition } from "../paths/pathpoints";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let isTransitioningToIntro = false;
let animationTime = 0;
let homeLoopFrameRegistered = false;
let rotationTransitionTime = 0;
let startRotations: Record<string, THREE.Quaternion> = {};
let hasBeenPausedBefore = false;

const homeLoopTangentSmoothers: Record<string, TangentSmoother> = {};
let pillGuides: THREE.Group | null = null;

const ghostEntries = Object.entries(ghosts);

const tempObject = new THREE.Object3D();
const tempQuaternion = new THREE.Quaternion();

const lastScales: Record<string, number> = {};

function createPillPositionGuides(pillPos: THREE.Vector3) {
  if (pillGuides) {
    scene.remove(pillGuides);
    pillGuides = null;
  }

  pillGuides = new THREE.Group();
  pillGuides.name = "pillPositionGuides";

  const guideSize = 1.0;

  const axesHelper = new THREE.AxesHelper(guideSize);
  axesHelper.position.copy(pillPos);
  pillGuides.add(axesHelper);

  const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.7,
    wireframe: true,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(pillPos);
  pillGuides.add(sphere);

  const boxGeometry = new THREE.BoxGeometry(guideSize, guideSize, guideSize);
  const boxMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
  });
  const boxEdges = new THREE.EdgesGeometry(boxGeometry);
  const boxWireframe = new THREE.LineSegments(boxEdges, boxMaterial);
  boxWireframe.position.copy(pillPos);
  pillGuides.add(boxWireframe);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffff00,
    linewidth: 3,
  });

  const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, pillPos.y, pillPos.z),
    pillPos,
  ]);
  const xLine = new THREE.Line(
    xLineGeometry,
    new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
  );
  pillGuides.add(xLine);

  const yLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(pillPos.x, 0, pillPos.z),
    pillPos,
  ]);
  const yLine = new THREE.Line(
    yLineGeometry,
    new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 })
  );
  pillGuides.add(yLine);

  const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(pillPos.x, pillPos.y, 0),
    pillPos,
  ]);
  const zLine = new THREE.Line(
    zLineGeometry,
    new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 })
  );
  pillGuides.add(zLine);

  scene.add(pillGuides);
}

function removePillPositionGuides() {
  if (pillGuides) {
    scene.remove(pillGuides);
    pillGuides = null;
  }
}

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

export function stopHomeLoop() {
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
  if (isTransitioningToIntro) {
    return;
  }

  const introScrollTrigger = ScrollTrigger.getById("introScroll");
  const povScrollTrigger = ScrollTrigger.getById("povScroll");

  if (introScrollTrigger?.isActive) {
    return;
  }

  if (
    povScrollTrigger &&
    !povScrollTrigger.isActive &&
    povScrollTrigger.progress > 0
  ) {
    return;
  }

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

  const targetCameraPos = getStartPosition();
  const currentCameraPos = camera.position.clone();
  const cameraDistance = currentCameraPos.distanceTo(targetCameraPos);

  const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
  const wasInHomeScroll = homeScrollTrigger && homeScrollTrigger.progress > 0;

  const checkAndStop = () => {
    const introScrollTrigger = ScrollTrigger.getById("introScroll");
    if (introScrollTrigger?.isActive) {
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camera.quaternion);
      gsap.killTweensOf(camera.rotation);
      return true;
    }
    return false;
  };

  if (cameraDistance > 0.1) {
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(camera.quaternion);
    gsap.killTweensOf(camera.rotation);

    if (checkAndStop()) return;

    const transitionDuration = wasInHomeScroll ? 1.0 : 0.5;

    const positionTween = gsap.to(camera.position, {
      x: targetCameraPos.x,
      y: targetCameraPos.y,
      z: targetCameraPos.z,
      duration: transitionDuration,
      ease: "power2.out",
      onUpdate: () => {
        if (checkAndStop()) {
          positionTween.kill();
          return;
        }
        camera.updateProjectionMatrix();
      },
    });

    const targetLookAt = getLookAtPosition();
    const lookAtProps = { t: 0 };
    const startLookAt = new THREE.Vector3();
    camera.getWorldDirection(startLookAt);
    startLookAt.multiplyScalar(10).add(currentCameraPos);

    const lookAtTween = gsap.to(lookAtProps, {
      t: 1,
      duration: transitionDuration,
      ease: "power2.out",
      onUpdate: () => {
        if (checkAndStop()) {
          lookAtTween.kill();
          return;
        }
        const currentLookAt = startLookAt
          .clone()
          .lerp(targetLookAt, lookAtProps.t);
        camera.lookAt(currentLookAt);
        camera.updateProjectionMatrix();
      },
    });
  } else {
    if (checkAndStop()) return;
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
          const currentPosition = ghost.position.clone();
          const distance = currentPosition.distanceTo(targetPosition);

          const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
          const isTransitioningFromHomeScroll =
            homeScrollTrigger && homeScrollTrigger.isActive;

          if (distance > 0.001 || isTransitioningFromHomeScroll) {
            gsap.killTweensOf(ghost.position);

            ghost.position.copy(currentPosition);

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
            ghost.position.copy(targetPosition);
            updateObjectPosition(key, targetPosition);
          }
        }
      }

      const savedRotation = homeLoopStartRot[key];

      if (savedRotation) {
        const currentQuat = ghost.quaternion.clone();
        const angle = currentQuat.angleTo(savedRotation);

        if (angle > 0.01) {
          gsap.killTweensOf(ghost.quaternion);

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

      const expectedScale =
        key === "pacman" ? SCALE.PACMAN_HOME : SCALE.GHOST_NORMAL;
      if (lastScales[key] !== expectedScale) {
        setObjectScale(ghost, key, "home");
        lastScales[key] = expectedScale;
      }

      tempQuaternion.set(0, 0, 0, 1);
      if (homeLoopTangentSmoothers[key] && objectT > 0) {
        const rawTangent = path.getTangentAt(objectT);
        if (rawTangent && rawTangent.length() > 0) {
          const smoothTangent =
            homeLoopTangentSmoothers[key].update(rawTangent);
          const objectType = key === "pacman" ? "pacman" : "ghost";

          calculateObjectOrientation(tempObject, smoothTangent, objectType);
          tempQuaternion.copy(tempObject.quaternion);
        }
      }

      if (isTransitioning && startRotations[key]) {
        const easedProgress =
          transitionProgress *
          transitionProgress *
          (3 - 2 * transitionProgress);

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
  const introScrollTrigger = ScrollTrigger.getById("introScroll");
  if (introScrollTrigger?.isActive) {
    return;
  }

  if (window.scrollY === 0) {
    startHomeLoop();
  }
}

export function setupHomeLoopScrollHandler() {
  window.addEventListener("scroll", () => {
    if (isTransitioningToIntro) {
      if (isHomeLoopActive) {
        stopHomeLoop();
      }
      return;
    }

    const introScrollTrigger = ScrollTrigger.getById("introScroll");
    const povScrollTrigger = ScrollTrigger.getById("povScroll");

    if (introScrollTrigger?.isActive) {
      if (isHomeLoopActive) {
        stopHomeLoop();
      }
      return;
    }

    if (
      povScrollTrigger &&
      !povScrollTrigger.isActive &&
      povScrollTrigger.progress > 0
    ) {
      if (isHomeLoopActive) {
        stopHomeLoop();
      }
      return;
    }

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

export function setTransitioningToIntro(value: boolean) {
  isTransitioningToIntro = value;
}
