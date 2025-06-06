import * as THREE from 'three';
import { AnimationState, AnimationPosition } from './types';
import { ghosts } from './objects';
import { ANIMATION_CONFIG } from './config';

// Animation State
export const animationState: AnimationState = {
  animationRunning: true,
  savedPositions: {},
  pauseTime: null,
  timeOffset: 0,
  oldTop: 0,
  scrollTimeout: null,
  homePositionsSaved: false,
  homeAnimationPositions: {},
  isInPovSection: false,
  isMovingForward: true,
  previousCameraPosition: null,
  cachedStartYAngle: null,
  animationStarted: false,
  rotationStarted: false,
  startedInitEndScreen: false,
  endScreenPassed: false,
  startEndProgress: 0,
  cachedHomeEndRotation: null
};

// Scroll Handler
export function setupScrollHandler(): void {
  window.addEventListener("scroll", () => {
    const top = window.scrollY;
    const wasMovingForward = animationState.isMovingForward;
    animationState.isMovingForward = top > animationState.oldTop;
    animationState.oldTop = top;

    // Save home positions when at top
    if (!animationState.homePositionsSaved && window.scrollY === 0) {
      animationState.homePositionsSaved = true;
      Object.entries(ghosts).forEach(([key, ghost]) => {
        animationState.homeAnimationPositions[key] = {
          position: ghost.position.clone(),
          lookAt: ghost.getWorldDirection(new THREE.Vector3()).clone(),
          rotation: ghost.rotation.clone()
        };
      });
    }

    // Handle animation pause/resume - EXACT MATCH to backup.js
    if (window.scrollY > 0 && animationState.animationRunning) {
      animationState.pauseTime = Date.now();
      animationState.animationRunning = false;
    } else if (window.scrollY === 0 && !animationState.animationRunning) {
      if (animationState.pauseTime) {
        animationState.timeOffset += Date.now() - animationState.pauseTime;
      }
      animationState.animationRunning = true;

      // Clear scroll timeout like in backup.js
      if (animationState.scrollTimeout) {
        clearTimeout(animationState.scrollTimeout);
        animationState.scrollTimeout = null;
      }
    }
  });
}

// Window Load Handler
export function setupLoadHandler(): void {
  window.addEventListener("load", () => {
    console.log("Application loaded");
  });
}

// Initialize all event handlers - REMOVED duplicate resize handler
export function initEventHandlers(): void {
  setupScrollHandler();
  setupLoadHandler();
}