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

// Register GSAP plugins (assuming external GSAP is loaded)
if (typeof window !== 'undefined' && (window as any).gsap && (window as any).ScrollTrigger) {
  (window as any).gsap.registerPlugin((window as any).ScrollTrigger);
}

// Trigger Positions for POV section
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
      onComplete: () => { gsap.set(".cmp--scroll", { display: "none" }); },
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
    console.warn("Camera animation variables not ready or GSAP not available");
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
    console.warn("Animation resources not ready");
    return;
  }

  setupPovTimeline();
}

// Animation Handler Functions
export function handleAnimationStart(): void {
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
}

export function handleAnimationUpdate(this: any): void {
  const overallProgress = this.targets()[0].progress;
  const cameraPosition = paths.cameraPOVPath.getPointAt(overallProgress);

  if (animationState.previousCameraPosition) {
    updateGhosts(cameraPosition);
    updateCamera(overallProgress);
    animationState.previousCameraPosition.copy(cameraPosition);
  } else {
    animationState.previousCameraPosition = cameraPosition.clone();
  }
}

export function handleLeavePOV(): void {
  ensureGhostsInScene(ghosts, scene);
  
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      if (triggerPositions[key]) {
        triggerPositions[key].hasBeenTriggered = false;
        triggerPositions[key].hasBeenDeactivated = false;
        triggerPositions[key].active = false;
      }

      const parent = triggerPositions[key] ? triggerPositions[key].parent : null;
      if (parent) {
        parent.classList.add("hidden");
        const camText = parent.querySelector(".cmp--pov-cam") as HTMLElement;
        if (camText) {
          camText.classList.add("hidden");
          camText.style.opacity = "0";
        }
        (parent as HTMLElement).style.opacity = "0";
      }

      ghost.visible = true;
      
      if (ghost instanceof THREE.Mesh && ghost.material) {
        if (Array.isArray(ghost.material)) {
          ghost.material.forEach(mat => {
            if (mat.transparent !== undefined) {
              mat.opacity = 1;
            }
          });
        } else {
          if (ghost.material.transparent !== undefined) {
            ghost.material.opacity = 1;
          }
        }
      }
      
      ghost.scale.set(1, 1, 1);
      
      if (animationState.homeAnimationPositions[key]) {
        ghost.position.copy(animationState.homeAnimationPositions[key].position);
        const target = new THREE.Vector3().addVectors(
          ghost.position,
          animationState.homeAnimationPositions[key].lookAt
        );
        ghost.lookAt(target);
      }
    }
  });

  pacman.visible = true;
  animationState.animationRunning = true;
}

// State Reset Functions
export function resetState(isReverse: boolean = false): void {
  resetGhostsState();
  resetCameraState(isReverse);
}

function resetGhostsState(): void {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      ghost.scale.set(1, 1, 1);
      
      if (ghost instanceof THREE.Mesh && ghost.material) {
        if (Array.isArray(ghost.material)) {
          ghost.material.forEach(mat => {
            if (mat.transparent !== undefined) {
              mat.opacity = 1;
            }
          });
        } else {
          if (ghost.material.transparent !== undefined) {
            ghost.material.opacity = 1;
          }
        }
      }
      
      ghost.visible = false;

      const { parent } = triggerPositions[key];
      if (parent) {
        const ghostText = parent as HTMLElement;
        const camText = parent.querySelector(".cmp--pov-cam") as HTMLElement;

        ghostText.classList.add("hidden");
        if (camText) {
          camText.classList.add("hidden");
        }

        triggerPositions[key].active = false;
      }
    }
  });
}

function resetCameraState(isReverse: boolean = false): void {
  pacman.visible = true;
  animationState.rotationStarted = false;
  animationState.cachedStartYAngle = null;
  animationState.startEndProgress = 0;
  animationState.startedInitEndScreen = false;

  if (!isReverse) {
    camera.lookAt(SPECIAL_POINTS.finalLookAt);
    animationState.endScreenPassed = true;
  } else {
    animationState.endScreenPassed = false;
  }
}

// Camera and Ghost Update Functions
function updateCamera(progress: number): void {
  const position = paths.cameraPOVPath.getPointAt(progress);
  camera.position.copy(position);
  camera.fov = CAMERA_CONFIG.wideFOV;

  const tangent = paths.cameraPOVPath.getTangentAt(progress).normalize();
  const defaultLookAt = position.clone().add(tangent);

  handleCameraPhases(progress, position, defaultLookAt);
  camera.updateProjectionMatrix();
}

function handleCameraPhases(progress: number, position: THREE.Vector3, defaultLookAt: THREE.Vector3): void {
  if (progress === 0) {
    camera.lookAt(new THREE.Vector3(camera.position.x, 2, camera.position.z));
  } else {
    camera.lookAt(defaultLookAt);
  }
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

function updateGhost(key: string, ghost: THREE.Object3D, pathKey: string, cameraPosition: THREE.Vector3): void {
  const { triggerPos, ghostTextPos, camTextPos, endPosition, parent } = triggerPositions[key];
  if (!triggerPos || !endPosition || !parent) return;

  const ghostText = parent as HTMLElement;
  const camText = parent.querySelector(".cmp--pov-cam") as HTMLElement;
  if (!camText) return;

  ghost.scale.set(0.5, 0.5, 0.5);

  // Initialize trigger data if needed
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

  // Calculate camera progress on POV path
  const currentCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, cameraPosition, 800);

  // Calculate path progress markers if not done
  if (triggerPositions[key].triggerCameraProgress === null) {
    triggerPositions[key].triggerCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, triggerPos, 800);
    triggerPositions[key].ghostTextCameraProgress = ghostTextPos ? 
      findClosestProgressOnPath(paths.cameraPOVPath, ghostTextPos, 800) : 
      triggerPositions[key].triggerCameraProgress!;
    triggerPositions[key].camTextCameraProgress = camTextPos ? 
      findClosestProgressOnPath(paths.cameraPOVPath, camTextPos, 800) : 
      triggerPositions[key].ghostTextCameraProgress!;
    triggerPositions[key].endCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, endPosition, 800);
  }

  const triggerProgress = triggerPositions[key].triggerCameraProgress!;
  const ghostTextProgress = triggerPositions[key].ghostTextCameraProgress!;
  const camTextProgress = triggerPositions[key].camTextCameraProgress!;
  const endProgress = triggerPositions[key].endCameraProgress!;

  // Handle ghost visibility and position
  if (currentCameraProgress >= triggerProgress && currentCameraProgress <= endProgress) {
    if (!ghost.visible) {
      ghost.visible = true;
      triggerPositions[key].hasBeenTriggered = true;
    }

    const normalizedProgress = (currentCameraProgress - triggerProgress) / (endProgress - triggerProgress);
    let ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

    // Smooth parameter transition
    if (triggerPositions[key].currentPathT === undefined) {
      triggerPositions[key].currentPathT = ghostProgress;
    } else {
      const smoothingFactor = 0.1;
      triggerPositions[key].currentPathT! += (ghostProgress - triggerPositions[key].currentPathT!) * smoothingFactor;
    }

    ghostProgress = triggerPositions[key].currentPathT!;

    // Update ghost position
    const pathPoint = paths[pathKey].getPointAt(ghostProgress);
    ghost.position.copy(pathPoint);

    // Update ghost rotation
    const tangent = paths[pathKey].getTangentAt(ghostProgress).normalize();
    const lookAtPoint = ghost.position.clone().add(tangent);

    if (!triggerPositions[key].currentRotation) {
      triggerPositions[key].currentRotation = new THREE.Quaternion();
      ghost.getWorldQuaternion(triggerPositions[key].currentRotation!);
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
    ghost.quaternion.copy(triggerPositions[key].currentRotation!);

    // Fade out at end
    if (ghostProgress > 0.9) {
      const material = (ghost as THREE.Mesh).material;
      if (material && !Array.isArray(material)) {
        material.opacity = 1 - (ghostProgress - 0.9) / 0.1;
      }
    } else {
      const material = (ghost as THREE.Mesh).material;
      if (material && !Array.isArray(material)) {
        material.opacity = 1;
      }
    }
  } else {
    ghost.visible = false;
    triggerPositions[key].hasBeenTriggered = false;
  }

  // Handle text visibility with proper timing
  const sectionLength = endProgress - triggerProgress;

  // Ghost text timing
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

  // CAM text timing
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

  // Update opacities
  const fadeInSpeed = 0.2;
  const fadeOutSpeed = 0.1;

  if (targetGhostOpacity > (triggerPositions[key].ghostTextOpacity || 0)) {
    triggerPositions[key].ghostTextOpacity = (triggerPositions[key].ghostTextOpacity || 0) + (targetGhostOpacity - (triggerPositions[key].ghostTextOpacity || 0)) * fadeInSpeed;
  } else {
    triggerPositions[key].ghostTextOpacity = (triggerPositions[key].ghostTextOpacity || 0) + (targetGhostOpacity - (triggerPositions[key].ghostTextOpacity || 0)) * fadeOutSpeed;
  }

  if (targetCamOpacity > (triggerPositions[key].camTextOpacity || 0)) {
    triggerPositions[key].camTextOpacity = (triggerPositions[key].camTextOpacity || 0) + (targetCamOpacity - (triggerPositions[key].camTextOpacity || 0)) * fadeInSpeed;
  } else {
    triggerPositions[key].camTextOpacity = (triggerPositions[key].camTextOpacity || 0) + (targetCamOpacity - (triggerPositions[key].camTextOpacity || 0)) * fadeOutSpeed;
  }

  // Update DOM
  const ghostTextOpacity = Math.max(0, Math.min(1, Math.round((triggerPositions[key].ghostTextOpacity || 0) * 1000) / 1000));
  const camTextOpacity = Math.max(0, Math.min(1, Math.round((triggerPositions[key].camTextOpacity || 0) * 1000) / 1000));

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

// Main Animation Loop
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

  // Always render
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Initialize GSAP Animations
export function initGsap(): void {
  // Only initialize if gsap is available
  if (!gsap) {
    console.warn('GSAP not available, skipping scroll animations');
    return;
  }
  
  setupScrollIndicator();
  initIntro();
  initCameraHome();
  initPovAnimations();
}