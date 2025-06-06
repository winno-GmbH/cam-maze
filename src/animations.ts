import * as THREE from 'three';
import { camera, startQuaternion, endQuaternion } from './camera';
import { scene, clock, canvas, finalSection, parentElements, renderer } from './scene';
import { ghosts, pacman, pacmanMixer } from './objects';
import { paths, cameraHomePath, getPathsForSection } from './paths';
import { animationState } from './events';
import { TriggerPosition } from './types';
import { CAMERA_CONFIG, ANIMATION_CONFIG, SPECIAL_POINTS } from './config';
import { smoothStep, findClosestProgressOnPath, ensureGhostsInScene } from './utils';

// Use global gsap
const gsap = (window as any).gsap;
const ScrollTrigger = (window as any).ScrollTrigger;

// Register GSAP plugins (assuming external GSAP is loaded)
if (typeof window !== 'undefined' && gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// Trigger Positions for POV section - EXACT MATCH to backup.js
export const triggerPositions: { [key: string]: TriggerPosition } = {
  ghost1: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    camTextPos: new THREE.Vector3(0.75775, 0.55, 0.8035),
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
    parent: parentElements[0],
    active: false,
  },
  ghost2: {
    triggerPos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    ghostTextPos: new THREE.Vector3(0.95875, 0.55, 0.85375),
    camTextPos: new THREE.Vector3(0.95875, 0.55, 0.904),
    endPosition: new THREE.Vector3(0.95875, 0.55, 1.0045),
    parent: parentElements[1],
    active: false,
  },
  ghost3: {
    triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
    parent: parentElements[2],
    active: false,
  },
  ghost4: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    ghostTextPos: new THREE.Vector3(0.5065, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.45625, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
    parent: parentElements[3],
    active: false,
  },
  ghost5: {
    triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    ghostTextPos: new THREE.Vector3(0.205, 0.55, 1.2055),
    camTextPos: new THREE.Vector3(0.25525, 0.55, 1.2055),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
    parent: parentElements[4],
    active: false,
  },
};

// Previous positions tracking
const previousPositions: { [key: string]: any } = {
  ghost1: null,
  ghost2: null,
  ghost3: null,
  ghost4: null,
  ghost5: null,
};

// GSAP Animation Setup Functions
export function setupScrollIndicator(): void {
  if (!gsap) return;
  
  gsap.set(".cmp--scroll", { display: "block" });
  if (window.scrollY > 0) {
    gsap.set(".cmp--scroll", { opacity: 1, y: 0 });
  }
  setTimeout(() => {
    gsap.to(".cmp--scroll", {
      opacity: 0,
      y: "1em",
      duration: 0.25,
      onComplete: () => gsap.set(".cmp--scroll", { display: "none" }),
      scrollTrigger: {
        trigger: ".sc--home.sc",
        start: "top top",
        toggleActions: "play none none reverse"
      }
    });
  }, 10000);
}

export function setupIntroHeader(): void {
  if (!gsap) return;
  
  gsap.fromTo(
    ".sc_h--intro", { scale: 0, opacity: 0 },
    {
      scale: 1.5,
      opacity: 0,
      scrollTrigger: {
        trigger: ".sc--intro",
        start: "top top",
        end: "center center",
        scrub: 0.5
      },
      ease: "none",
      keyframes: [
        { scale: 0, opacity: 0, duration: 0 },
        { scale: 0.8, opacity: 1, duration: 0.3 },
        { scale: 1.2, opacity: 1, duration: 0.4 },
        { scale: 1.5, opacity: 0, duration: 0.3 }
      ]
    }
  );
}

export function initIntro(): void {
  if (!gsap) return;
  
  setupIntroHeader();

  gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--intro",
      start: "center center",
      end: "bottom bottom",
      scrub: 0.5,
      onEnter: () => {
        gsap.killTweensOf(camera.position);
        camera.position.set(0.55, -5, 0.45);
        camera.updateMatrix();
        camera.updateMatrixWorld();
      }
    }
  }).fromTo(
    ".sc_b--intro", { scale: 0.5, opacity: 0 },
    {
      keyframes: [
        { scale: 0.5, opacity: 0, duration: 0 },
        { scale: 0.8, opacity: 1, duration: 0.3 },
        { scale: 1.2, opacity: 1, duration: 0.4 },
        { scale: 1.5, opacity: 0, duration: 0.3 }
      ]
    }
  );
}

export function initCameraHome(): void {
  if (!gsap || !camera || !cameraHomePath || !startQuaternion || !endQuaternion) {
    console.warn("Camera animation variables not ready, retrying in 100ms");
    setTimeout(initCameraHome, 100);
    return;
  }

  gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--home",
      start: "top top",
      end: "bottom top",
      scrub: 0.5
    }
  }).to({ t: 0 }, {
    t: 1,
    immediateRender: false,
    onUpdate: function () {
      const progress = this.targets()[0].t;
      const cameraPoint = cameraHomePath.getPoint(progress);
      camera.position.copy(cameraPoint);
      camera.fov = CAMERA_CONFIG.originalFOV;

      const currentQuaternion = new THREE.Quaternion();
      currentQuaternion.slerpQuaternions(startQuaternion, endQuaternion, progress);
      camera.quaternion.copy(currentQuaternion);

      if (progress > 0.98) {
        animationState.cachedHomeEndRotation = camera.quaternion.clone();
      }

      camera.updateProjectionMatrix();
    }
  });
}

export function initEndScreen(): void {
  if (!gsap || !finalSection) return;
  
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--final",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      toggleActions: "play none none reverse",
    },
  });

  tl.to(finalSection, {
    opacity: 1,
    ease: "power2.inOut",
    onComplete: () => {
      animationState.endScreenPassed = true;
      animationState.startedInitEndScreen = false;
    },
  });
}

export function setupPovTimeline(): void {
  if (!gsap) return;
  
  gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--pov",
      start: "top bottom",
      end: "bottom top",
      endTrigger: ".sc--final",
      scrub: 0.5,
      toggleActions: "play none none reverse",
      onLeave: handleLeavePOV,
      onLeaveBack: handleLeavePOV,
    },
  }).to({ progress: 0 }, {
    progress: 1,
    immediateRender: false,
    onStart: handleAnimationStart,
    onUpdate: handleAnimationUpdate,
    onReverseComplete: () => resetState(true),
    onComplete: resetState,
  });
}

export function initPovAnimations(): void {
  if (!ghosts || !camera || !paths.cameraPOVPath || !startQuaternion || !endQuaternion) {
    console.warn("Animation resources not ready, retrying in 100ms");
    setTimeout(initPovAnimations, 100);
    return;
  }

  setupPovTimeline();
}

// Camera Animation Functions - EXACT MATCH to backup.js
function updateCamera(progress: number): void {
  const position = paths.cameraPOVPath.getPointAt(progress);
  camera.position.copy(position);
  camera.fov = CAMERA_CONFIG.wideFOV;

  if (canvas.style.display === "none" && progress < 0.99) {
    canvas.style.display = "block";
  }
  if (pacman.visible) {
    pacman.visible = false;
  }

  const tangent = paths.cameraPOVPath.getTangentAt(progress).normalize();
  const defaultLookAt = position.clone().add(tangent);

  if (progress === 0) {
    camera.lookAt(new THREE.Vector3(camera.position.x, 2, camera.position.z));
  } else if (progress < 0.1) {
    const transitionProgress = progress / 0.1;
    const upLookAt = new THREE.Vector3(camera.position.x, 1, camera.position.z);
    const frontLookAt = new THREE.Vector3(camera.position.x, 0.5, camera.position.z + 1);

    const interpolatedLookAt = new THREE.Vector3();
    interpolatedLookAt.lerpVectors(upLookAt, frontLookAt, smoothStep(transitionProgress));

    camera.lookAt(interpolatedLookAt);
  }

  const point1Progress = findClosestProgressOnPath(paths.cameraPOVPath, SPECIAL_POINTS.povStartPoint1);
  const point2Progress = findClosestProgressOnPath(paths.cameraPOVPath, SPECIAL_POINTS.povStartPoint2);
  const startRotationProgress = findClosestProgressOnPath(paths.cameraPOVPath, SPECIAL_POINTS.startRotationPoint);
  const endRotationProgress = findClosestProgressOnPath(paths.cameraPOVPath, SPECIAL_POINTS.endRotationPoint);

  if (progress <= point2Progress && animationState.cachedHomeEndRotation) {
    handleHomeTransition(progress, position, defaultLookAt, point1Progress, point2Progress);
  } else if (progress >= startRotationProgress && progress <= endRotationProgress) {
    handleRotationPhase(progress, position, defaultLookAt, startRotationProgress, endRotationProgress);
  } else if (progress > ANIMATION_CONFIG.startEndScreenSectionProgress && animationState.endScreenPassed) {
    handleEndSequence(progress);
  } else {
    handleDefaultOrientation(progress, startRotationProgress, endRotationProgress, defaultLookAt);
  }

  camera.updateProjectionMatrix();
}

function handleHomeTransition(progress: number, position: THREE.Vector3, defaultLookAt: THREE.Vector3, point1Progress: number, point2Progress: number): void {
  const transitionProgress = (progress - point1Progress) / (point2Progress - point1Progress);

  if (transitionProgress >= 0 && transitionProgress <= 1) {
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(position, defaultLookAt, camera.up)
    );

    const easedProgress = smoothStep(transitionProgress);
    const newQuaternion = new THREE.Quaternion()
      .copy(animationState.cachedHomeEndRotation!)
      .slerp(targetQuaternion, easedProgress);

    camera.quaternion.copy(newQuaternion);
  } else if (transitionProgress > 1) {
    camera.lookAt(defaultLookAt);
  }
}

function handleRotationPhase(progress: number, position: THREE.Vector3, defaultLookAt: THREE.Vector3, startRotationProgress: number, endRotationProgress: number): void {
  const sectionProgress = (progress - startRotationProgress) / (endRotationProgress - startRotationProgress);

  if (animationState.cachedStartYAngle === null) {
    const startDir = new THREE.Vector2(defaultLookAt.x - position.x, defaultLookAt.z - position.z).normalize();
    animationState.cachedStartYAngle = Math.atan2(startDir.y, startDir.x);
    animationState.cachedStartYAngle = animationState.cachedStartYAngle > 3 ? animationState.cachedStartYAngle / 2 : animationState.cachedStartYAngle;
  }

  const targetDir = new THREE.Vector2(SPECIAL_POINTS.targetLookAt.x - position.x, SPECIAL_POINTS.targetLookAt.z - position.z).normalize();
  let targetYAngle = Math.atan2(targetDir.y, targetDir.x);

  let angleDiff = targetYAngle - animationState.cachedStartYAngle;
  if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  else if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  angleDiff = -angleDiff * 1.75;
  targetYAngle = animationState.cachedStartYAngle + angleDiff;

  const easedProgress = smoothStep(sectionProgress);
  const newYAngle = animationState.cachedStartYAngle * (1 - easedProgress) + targetYAngle * easedProgress;

  const radius = 1.0;
  const newLookAt = new THREE.Vector3(
    position.x + Math.cos(newYAngle) * radius,
    position.y,
    position.z + Math.sin(newYAngle) * radius
  );

  camera.lookAt(newLookAt);

  if (progress >= endRotationProgress) {
    animationState.cachedStartYAngle = null;
  }
  animationState.rotationStarted = true;

  if (progress >= ANIMATION_CONFIG.startEndScreenSectionProgress && !animationState.startedInitEndScreen) {
    animationState.startedInitEndScreen = true;
    initEndScreen();
  }
}

function handleEndSequence(progress: number): void {
  if (animationState.startEndProgress === 0 && progress !== 1) {
    const truncatedProgress = Math.floor(progress * 100) / 100;
    animationState.startEndProgress = truncatedProgress === 0.99 ? ANIMATION_CONFIG.rotationStartingPoint : progress;
  }

  const animationProgress = (progress - animationState.startEndProgress) / (1 - animationState.startEndProgress);

  if (animationState.isMovingForward && animationProgress > 0) {
    const currentLookAt = getCameraLookAtPoint();

    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      currentLookAt,
      SPECIAL_POINTS.finalLookAt,
      smoothStep(animationProgress)
    );

    const startFOV = CAMERA_CONFIG.wideFOV;
    const targetFOV = CAMERA_CONFIG.wideFOV / 4;
    camera.fov = startFOV + (targetFOV - startFOV) * smoothStep(animationProgress);

    camera.lookAt(interpolatedLookAt);
  } else if (animationProgress > 0) {
    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      SPECIAL_POINTS.reverseFinalLookAt,
      SPECIAL_POINTS.finalLookAt,
      smoothStep(animationProgress)
    );

    const startFOV = CAMERA_CONFIG.wideFOV / 4;
    const targetFOV = CAMERA_CONFIG.wideFOV;
    camera.fov = targetFOV - (targetFOV - startFOV) * smoothStep(animationProgress);

    camera.lookAt(interpolatedLookAt);
  }
}

function handleDefaultOrientation(progress: number, startRotationProgress: number, endRotationProgress: number, defaultLookAt: THREE.Vector3): void {
  if ((progress < startRotationProgress || progress > endRotationProgress) && !animationState.startedInitEndScreen) {
    animationState.cachedStartYAngle = null;
    animationState.rotationStarted = false;
    animationState.endScreenPassed = false;
    animationState.startedInitEndScreen = false;
    if (finalSection) finalSection.style.opacity = "0";
  }

  if (!animationState.rotationStarted && !animationState.startedInitEndScreen) {
    camera.lookAt(defaultLookAt);
  }

  if (!(animationState.endScreenPassed && progress > 0.8)) {
    animationState.startEndProgress = 0;
  }
}

function getCameraLookAtPoint(): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

// Ghost Animation Functions - EXACT MATCH to backup.js complex logic
function handleAnimationStart(): void {
  const pathMapping = getPathsForSection("pov");
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key];
    if (paths[pathKey]) {
      const position = paths[pathKey].getPointAt(0);
      ghost.position.copy(position);
      const tangent = paths[pathKey].getTangentAt(0).normalize();
      ghost.lookAt(position.clone().add(tangent));

      if (key !== "pacman") {
        ghost.visible = false;
      }
    }
  });

  pacman.visible = false;
}

function updateGhosts(cameraPosition: THREE.Vector3): void {
  const pathMapping = getPathsForSection("pov");

  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key === "pacman") return;

    const pathKey = pathMapping[key];
    if (paths[pathKey] && triggerPositions[key]) {
      updateGhost(key, ghost, pathKey, cameraPosition);
    }
  });
}

function updateGhost(key: string, ghost: any, pathKey: string, cameraPosition: THREE.Vector3): void {
  const { triggerPos, ghostTextPos, camTextPos, endPosition, parent } = triggerPositions[key];
  if (!triggerPos || !endPosition) return;

  const ghostText = parent as HTMLElement;
  const camText = parent.querySelector(".cmp--pov-cam") as HTMLElement;

  ghost.scale.set(0.5, 0.5, 0.5);

  // Initialize trigger position properties - EXACT MATCH to backup.js
  if (triggerPositions[key].hasBeenTriggered === undefined) {
    triggerPositions[key].hasBeenTriggered = false;
    triggerPositions[key].hasBeenDeactivated = false;
    triggerPositions[key].triggerCameraProgress = null;
    triggerPositions[key].ghostTextCameraProgress = null;
    triggerPositions[key].camTextCameraProgress = null;
    triggerPositions[key].endCameraProgress = null;
    triggerPositions[key].currentPathT = 0;
    triggerPositions[key].ghostTextOpacity = 0;
    triggerPositions[key].camTextOpacity = 0;
    triggerPositions[key].lastProgress = 0;

    ghost.visible = false;
    ghostText.classList.add("hidden");
    camText.classList.add("hidden");
    ghostText.style.opacity = "0";
    camText.style.opacity = "0";
  }

  const currentCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, cameraPosition, 800);

  // Calculate path positions if not done yet
  if (triggerPositions[key].triggerCameraProgress === null) {
    triggerPositions[key].triggerCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, triggerPos, 800);

    if (ghostTextPos) {
      triggerPositions[key].ghostTextCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, ghostTextPos, 800);
    } else {
      triggerPositions[key].ghostTextCameraProgress = triggerPositions[key].triggerCameraProgress;
    }

    if (camTextPos) {
      triggerPositions[key].camTextCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, camTextPos, 800);
    } else {
      triggerPositions[key].camTextCameraProgress = triggerPositions[key].ghostTextCameraProgress;
    }

    triggerPositions[key].endCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, endPosition, 800);
  }

  const triggerProgress = triggerPositions[key].triggerCameraProgress!;
  const ghostTextProgress = triggerPositions[key].ghostTextCameraProgress!;
  const camTextProgress = triggerPositions[key].camTextCameraProgress!;
  const endProgress = triggerPositions[key].endCameraProgress!;

  // Ghost visibility and position - EXACT MATCH to backup.js
  if (currentCameraProgress >= triggerProgress && currentCameraProgress <= endProgress) {
    if (!ghost.visible) {
      ghost.visible = true;
      triggerPositions[key].hasBeenTriggered = true;
    }

    const normalizedProgress = (currentCameraProgress - triggerProgress) / (endProgress - triggerProgress);
    let ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

    if (triggerPositions[key].currentPathT === undefined) {
      triggerPositions[key].currentPathT = ghostProgress;
    } else {
      const parameterSmoothingFactor = 0.1;
      triggerPositions[key].currentPathT! += (ghostProgress - triggerPositions[key].currentPathT!) * parameterSmoothingFactor;
    }

    ghostProgress = triggerPositions[key].currentPathT!;

    const pathPoint = paths[pathKey].getPointAt(ghostProgress);
    ghost.position.copy(pathPoint);

    const tangent = paths[pathKey].getTangentAt(ghostProgress).normalize();
    const lookAtPoint = ghost.position.clone().add(tangent);

    if (!triggerPositions[key].currentRotation) {
      triggerPositions[key].currentRotation = new THREE.Quaternion();
      ghost.getWorldQuaternion(triggerPositions[key].currentRotation);
    }
    const targetQuaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4().lookAt(
      ghost.position,
      lookAtPoint,
      new THREE.Vector3(0, 1, 0)
    );
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);

    const rotationSmoothingFactor = 0.15;
    triggerPositions[key].currentRotation!.slerp(targetQuaternion, rotationSmoothingFactor);
    ghost.quaternion.copy(triggerPositions[key].currentRotation);

    if (ghostProgress > 0.9) {
      ghost.material.opacity = 1 - (ghostProgress - 0.9) / 0.1;
    } else {
      ghost.material.opacity = 1;
    }
  } else {
    ghost.visible = false;
    triggerPositions[key].hasBeenTriggered = false;
  }

  // Text visibility logic - EXACT MATCH to backup.js complex opacity management
  const sectionLength = endProgress - triggerProgress;
  const fadeInStart = ghostTextProgress;
  const fadeInEnd = fadeInStart + (sectionLength * 0.07);
  const stayVisibleUntil = endProgress - (sectionLength * 0.15);
  const fadeOutEnd = endProgress;

  let targetGhostOpacity = 0;
  if (currentCameraProgress >= fadeInStart && currentCameraProgress < fadeInEnd) {
    const fadeProgress = (currentCameraProgress - fadeInStart) / (fadeInEnd - fadeInStart);
    targetGhostOpacity = fadeProgress;
  } else if (currentCameraProgress >= fadeInEnd && currentCameraProgress < stayVisibleUntil) {
    targetGhostOpacity = 1.0;
  } else if (currentCameraProgress >= stayVisibleUntil && currentCameraProgress <= fadeOutEnd) {
    const fadeProgress = (currentCameraProgress - stayVisibleUntil) / (fadeOutEnd - stayVisibleUntil);
    targetGhostOpacity = 1.0 - fadeProgress;
  }

  const camFadeInStart = camTextProgress;
  const camFadeInEnd = camFadeInStart + (sectionLength * 0.07);
  const camStayVisibleUntil = stayVisibleUntil;

  let targetCamOpacity = 0;
  if (currentCameraProgress >= camFadeInStart && currentCameraProgress < camFadeInEnd) {
    const fadeProgress = (currentCameraProgress - camFadeInStart) / (camFadeInEnd - camFadeInStart);
    targetCamOpacity = fadeProgress * 0.8;
  } else if (currentCameraProgress >= camFadeInEnd && currentCameraProgress < camStayVisibleUntil) {
    targetCamOpacity = 0.8;
  } else if (currentCameraProgress >= camStayVisibleUntil && currentCameraProgress <= fadeOutEnd) {
    const fadeProgress = (currentCameraProgress - camStayVisibleUntil) / (fadeOutEnd - camStayVisibleUntil);
    targetCamOpacity = 0.8 * (1.0 - fadeProgress);
  }

  // Opacity updates with different speeds
  const fadeInSpeed = 0.2;
  const fadeOutSpeed = 0.1;

  if (targetGhostOpacity > triggerPositions[key].ghostTextOpacity!) {
    triggerPositions[key].ghostTextOpacity! += (targetGhostOpacity - triggerPositions[key].ghostTextOpacity!) * fadeInSpeed;
  } else {
    triggerPositions[key].ghostTextOpacity! += (targetGhostOpacity - triggerPositions[key].ghostTextOpacity!) * fadeOutSpeed;
  }

  if (targetCamOpacity > triggerPositions[key].camTextOpacity!) {
    triggerPositions[key].camTextOpacity! += (targetCamOpacity - triggerPositions[key].camTextOpacity!) * fadeInSpeed;
  } else {
    triggerPositions[key].camTextOpacity! += (targetCamOpacity - triggerPositions[key].camTextOpacity!) * fadeOutSpeed;
  }

  // DOM updates
  const ghostTextOpacity = Math.max(0, Math.min(1, Math.round(triggerPositions[key].ghostTextOpacity! * 1000) / 1000));
  const camTextOpacity = Math.max(0, Math.min(1, Math.round(triggerPositions[key].camTextOpacity! * 1000) / 1000));

  if (ghostTextOpacity > 0.01) {
    if (ghostText.classList.contains("hidden")) {
      ghostText.classList.remove("hidden");
    }
    ghostText.style.opacity = ghostTextOpacity.toString();
  } else if (ghostTextOpacity <= 0.01 && !ghostText.classList.contains("hidden")) {
    ghostText.classList.add("hidden");
    ghostText.style.opacity = "0";
  }

  if (camTextOpacity > 0.01) {
    if (camText.classList.contains("hidden")) {
      camText.classList.remove("hidden");
    }
    camText.style.opacity = camTextOpacity.toString();
  } else if (camTextOpacity <= 0.01 && !camText.classList.contains("hidden")) {
    camText.classList.add("hidden");
    camText.style.opacity = "0";
  }

  triggerPositions[key].lastProgress = currentCameraProgress;
}

function handleAnimationUpdate(): void {
  const overallProgress = (this as any).targets()[0].progress;
  const cameraPosition = paths.cameraPOVPath.getPointAt(overallProgress);

  if (animationState.previousCameraPosition) {
    updateGhosts(cameraPosition);
    updateCamera(overallProgress);
    animationState.previousCameraPosition.copy(cameraPosition);
  } else {
    animationState.previousCameraPosition = cameraPosition.clone();
  }
}

function handleLeavePOV(): void {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      if (triggerPositions[key]) {
        triggerPositions[key].hasBeenTriggered = false;
        triggerPositions[key].hasBeenDeactivated = false;
        triggerPositions[key].active = false;
      }

      const parent = triggerPositions[key] ? triggerPositions[key].parent : null;
      if (parent) {
        (parent as HTMLElement).classList.add("hidden");
        const camText = (parent as HTMLElement).querySelector(".cmp--pov-cam") as HTMLElement;
        if (camText) {
          camText.classList.add("hidden");
          camText.style.opacity = "0";
        }
        (parent as HTMLElement).style.opacity = "0";
      }
    }

    if (animationState.homeAnimationPositions[key]) {
      ghost.position.copy(animationState.homeAnimationPositions[key].position);

      if (key === "pacman") {
        ghost.rotation.copy(animationState.homeAnimationPositions[key].rotation);
        (ghost as any).previousZRotation = Math.atan2(
          animationState.homeAnimationPositions[key].lookAt.x,
          animationState.homeAnimationPositions[key].lookAt.z
        );
      } else {
        const target = new THREE.Vector3().addVectors(
          ghost.position,
          animationState.homeAnimationPositions[key].lookAt
        );
        ghost.lookAt(target);
      }

      ghost.visible = true;
      ghost.material.opacity = 1;
    }
  });

  pacman.visible = true;
  animationState.animationRunning = true;
}

function resetCameraState(isReverse: boolean = false): void {
  pacman.visible = true;
  animationState.rotationStarted = false;
  animationState.cachedStartYAngle = null;
  animationState.startEndProgress = 0;
  animationState.startedInitEndScreen = false;

  if (!isReverse) {
    if (canvas) canvas.style.display = "none";
    camera.lookAt(SPECIAL_POINTS.finalLookAt);
    animationState.endScreenPassed = true;
  } else {
    animationState.endScreenPassed = false;
  }
}

function resetGhostsState(): void {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      ghost.scale.set(1, 1, 1);
      ghost.material.opacity = 1;
      ghost.visible = false;

      const { parent } = triggerPositions[key];
      const ghostText = parent as HTMLElement;
      const camText = (parent as HTMLElement).querySelector(".cmp--pov-cam") as HTMLElement;

      ghostText.classList.add("hidden");
      camText.classList.add("hidden");

      (ghost as any).previousProgress = 0;
      triggerPositions[key].active = false;
      previousPositions[key] = false;
    }
  });
}

function resetState(isReverse: boolean = false): void {
  resetGhostsState();
  resetCameraState(isReverse);
}

// Main animation loop - EXACT MATCH to backup.js
export function animate(): void {
  const currentTime = Date.now();
  const adjustedTime = currentTime - animationState.timeOffset;

  if (animationState.animationRunning) {
    const t = ((adjustedTime / 6000) % 6) / 6;
    const pathMapping = getPathsForSection("home");

    if (!pacman.visible) {
      pacman.visible = true;
    }

    const delta = clock.getDelta();
    if (pacmanMixer) {
      pacmanMixer.update(delta);
    }

    Object.entries(ghosts).forEach(([key, ghost]) => {
      const pathKey = pathMapping[key];
      if (paths[pathKey]) {
        const position = paths[pathKey].getPointAt(t);
        ghost.position.copy(position);
        const tangent = paths[pathKey].getTangentAt(t).normalize();
        ghost.lookAt(position.clone().add(tangent));

        if (key === "pacman") {
          const zRotation = Math.atan2(tangent.x, tangent.z);

          if ((ghost as any).previousZRotation === undefined) {
            (ghost as any).previousZRotation = zRotation;
          }

          let rotationDiff = zRotation - (ghost as any).previousZRotation;

          if (rotationDiff > Math.PI) {
            rotationDiff -= 2 * Math.PI;
          } else if (rotationDiff < -Math.PI) {
            rotationDiff += 2 * Math.PI;
          }

          const smoothFactor = 0.1;
          const smoothedRotation = (ghost as any).previousZRotation + rotationDiff * smoothFactor;

          (ghost as any).previousZRotation = smoothedRotation;
          ghost.rotation.set(Math.PI / 2, Math.PI, smoothedRotation + Math.PI / 2);
        }
      }
    });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Initialize GSAP - EXACT MATCH to backup.js
export function initGsap(): void {
  setupScrollIndicator();
  initIntro();
  initCameraHome();
  initPovAnimations();
}