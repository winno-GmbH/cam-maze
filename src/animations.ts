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
  console.log('=== INIT CAMERA HOME DEBUG ===');
  console.log('camera:', !!camera);
  console.log('cameraHomePath:', !!cameraHomePath);
  console.log('startQuaternion:', !!startQuaternion);
  console.log('endQuaternion:', !!endQuaternion);
  
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
      toggle