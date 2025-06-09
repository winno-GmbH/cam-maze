import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { pathsMap } from "./paths";
import { renderer, scene } from "./scene";
import { camera } from "./camera";
import {
  initScrollSystem,
  currentAnimationState,
  resetToHomeState,
} from "./scroll-animations";
import { initIntroAnimations } from "./intro-animations";

// Debug info for window
declare global {
  interface Window {
    animationDebugInfo: {
      state: string;
      isFirstScroll: boolean;
      capturedPositions: any;
      bezierCurves: any;
      scrollProgress?: number;
    };
  }
}

// Home animation variables
let animationStartTime = Date.now();
let timeOffset = 0;
let pauseTime = 0;

// Debug counter to reduce console spam
let debugLogCounter = 0;

// Main animation loop for home state
export function animationLoop() {
  // Only run home animation if we're in HOME state
  if (currentAnimationState !== "HOME") {
    if (debugLogCounter % 60 === 0) {
      console.log(
        `⏸️ Skipping home animation - current state: ${currentAnimationState}`
      );
    }
    debugLogCounter++;
    return;
  }

  if (debugLogCounter % 60 === 0) {
    console.log(`🏠 Running home animation - state: ${currentAnimationState}`);
  }
  debugLogCounter++;

  const currentTime = Date.now();
  const elapsedTime = (currentTime - animationStartTime - timeOffset) / 1000;
  const t = (elapsedTime * 0.1) % 1; // Speed control

  // Animate ghosts on their home paths
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (!pathsMap[key]) return;

    if (key === "pacman") {
      // Pacman animation
      const position = pathsMap[key].getPointAt(t);
      ghost.position.copy(position);
      const tangent = pathsMap[key].getTangentAt(t).normalize();
      ghost.lookAt(position.clone().add(tangent));

      // Handle pacman rotation smoothing
      const zRotation = Math.atan2(tangent.x, tangent.z);
      if ((ghost as any).previousZRotation === undefined) {
        (ghost as any).previousZRotation = zRotation;
      }

      let rotationDiff = zRotation - (ghost as any).previousZRotation;
      if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
      else if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

      const smoothFactor = 0.1;
      const smoothedRotation =
        (ghost as any).previousZRotation + rotationDiff * smoothFactor;
      (ghost as any).previousZRotation = smoothedRotation;

      ghost.rotation.set(Math.PI / 2, Math.PI, smoothedRotation + Math.PI / 2);
    } else {
      // Ghost animation
      const position = pathsMap[key].getPointAt(t);
      ghost.position.copy(position);
      const tangent = pathsMap[key].getTangentAt(t).normalize();
      ghost.lookAt(position.clone().add(tangent));

      // Ensure full opacity
      if (
        ghost instanceof THREE.Mesh &&
        ghost.material &&
        "opacity" in ghost.material
      ) {
        ghost.material.opacity = 1;
      }
    }
  });
}

// Main render loop
function animate() {
  // Update pacman mixer
  if (pacmanMixer) {
    const delta = clock.getDelta();
    pacmanMixer.update(delta);
  }

  // Run animation loop
  animationLoop();

  // Render the scene
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

// Initialize animation system
export function initAnimationSystem() {
  console.log("Initializing animation system...");

  // Setup debug info
  window.animationDebugInfo = {
    state: "HOME",
    isFirstScroll: true,
    capturedPositions: {},
    bezierCurves: {},
  };

  // Ensure all ghosts are visible and have full opacity
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghosts[ghostKey]) {
      ghosts[ghostKey].visible = true;
      console.log(
        `Ghost ${ghostKey} set to visible:`,
        ghosts[ghostKey].visible
      );

      const ghost = ghosts[ghostKey];
      if (
        ghost instanceof THREE.Mesh &&
        ghost.material &&
        "opacity" in ghost.material
      ) {
        ghost.material.opacity = 1;
      } else if (ghost instanceof THREE.Group) {
        ghost.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material &&
            "opacity" in child.material
          ) {
            child.material.opacity = 1;
          }
        });
      }
    }
  });

  // Debug: Check if pathsMap is available
  console.log("Available paths:", Object.keys(pathsMap));
  console.log("Ghosts:", Object.keys(ghosts));

  // Provide timeOffset update function for scroll system
  window.updateAnimationTimeOffset = (delta: number) => {
    timeOffset += delta;
  };

  // Initialize scroll and intro systems
  initScrollSystem();
  initIntroAnimations();

  // Start main animation loop
  animate();

  console.log("Animation system initialized");
}
