import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { pathsMap } from "./paths";
import { renderer, scene } from "./scene";
import { camera } from "./camera";

// 1. STATE MANAGEMENT
type AnimationState = "HOME" | "SCROLL_ANIMATION";
let currentAnimationState: AnimationState = "HOME";
let isFirstScroll = true;

// Debug info for window
declare global {
  interface Window {
    animationDebugInfo: {
      state: AnimationState;
      isFirstScroll: boolean;
      capturedPositions: any;
      bezierCurves: any;
    };
  }
}

// Constants
const MAZE_CENTER = new THREE.Vector3(0.45175, 0.5, 0.55675);
const OPACITY_FADE_START = 0.8; // Last 20% for opacity fade

// 2. POSITION & BEZIER SYSTEM
const capturedPositions: { [key: string]: THREE.Vector3 } = {};
const bezierCurves: { [key: string]: THREE.QuadraticBezierCurve3 } = {};
let timeOffset = 0;
let pauseTime = 0;

function captureGhostPositions() {
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghostKey !== "pacman" && ghosts[ghostKey]) {
      capturedPositions[ghostKey] = ghosts[ghostKey].position.clone();
    }
  });
  console.log("Ghost positions captured:", capturedPositions);
}

function createBezierCurves() {
  Object.keys(capturedPositions).forEach((ghostKey) => {
    const startPos = capturedPositions[ghostKey];
    const endPos = startPos.clone(); // Round trip back to start

    // Create control point that goes through maze center
    const controlPoint = MAZE_CENTER.clone();

    bezierCurves[ghostKey] = new THREE.QuadraticBezierCurve3(
      startPos,
      controlPoint,
      endPos
    );
  });
  console.log("Bezier curves created");
}

function moveGhostOnCurve(ghostKey: string, scrollProgress: number) {
  if (!bezierCurves[ghostKey] || !ghosts[ghostKey] || ghostKey === "pacman")
    return;

  // Get position on curve (0-1)
  const position = bezierCurves[ghostKey].getPoint(scrollProgress);
  ghosts[ghostKey].position.copy(position);

  // Handle opacity fade in last 20%
  let opacity = 1;
  if (scrollProgress >= OPACITY_FADE_START) {
    const fadeProgress =
      (scrollProgress - OPACITY_FADE_START) / (1 - OPACITY_FADE_START);
    opacity = 1 - fadeProgress;
  }

  // Set opacity for both Mesh and Group
  const ghost = ghosts[ghostKey];
  if (ghost instanceof THREE.Mesh && ghost.material) {
    if (Array.isArray(ghost.material)) {
      ghost.material.forEach((mat) => {
        if ("opacity" in mat) mat.opacity = opacity;
      });
    } else {
      if ("opacity" in ghost.material) ghost.material.opacity = opacity;
    }
  } else if (ghost instanceof THREE.Group) {
    ghost.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if ("opacity" in mat) mat.opacity = opacity;
          });
        } else {
          if ("opacity" in child.material) child.material.opacity = opacity;
        }
      }
    });
  }
}

// 3. SCROLL MANAGEMENT
function onFirstScroll() {
  if (!isFirstScroll) return;

  isFirstScroll = false;
  pauseTime = Date.now();

  captureGhostPositions();
  createBezierCurves();
  currentAnimationState = "SCROLL_ANIMATION";

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.state = currentAnimationState;
    window.animationDebugInfo.isFirstScroll = isFirstScroll;
  }

  console.log(
    "First scroll detected - animation paused and bezier curves created"
  );
}

// 4. ANIMATION LOOP
let animationStartTime = Date.now();

function animationLoop() {
  if (currentAnimationState !== "HOME") return;

  const currentTime = Date.now();
  const elapsedTime = (currentTime - animationStartTime - timeOffset) / 1000; // Convert to seconds
  const t = (elapsedTime * 0.1) % 1; // Speed control (0.1 = slower, 0.2 = faster)

  // Animate ghosts on their home paths
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (!pathsMap[key]) {
      // Don't spam warnings, just return
      return;
    }

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

// Scroll event handler
function handleScroll() {
  const scrollY = window.scrollY;

  if (scrollY > 0 && currentAnimationState === "HOME") {
    onFirstScroll();
  } else if (scrollY === 0 && currentAnimationState === "SCROLL_ANIMATION") {
    // Reset to home state
    currentAnimationState = "HOME";
    isFirstScroll = true;

    if (pauseTime) {
      timeOffset += Date.now() - pauseTime;
      pauseTime = 0;
    }

    // Update debug info
    if (window.animationDebugInfo) {
      window.animationDebugInfo.state = currentAnimationState;
      window.animationDebugInfo.isFirstScroll = isFirstScroll;
    }

    console.log("Returned to top - resuming home animation");
  }
}

// 5. GSAP INTEGRATION - To be called by GSAP ScrollTriggers
export function setupScrollTriggers() {
  // This will be implemented when GSAP is available
  // For now, we use basic scroll events
  window.addEventListener("scroll", handleScroll);
  console.log("Scroll triggers setup complete");
}

// Main animation loop
function animate() {
  // Update pacman mixer
  if (pacmanMixer) {
    const delta = clock.getDelta();
    pacmanMixer.update(delta);
  }

  // Run animation loop if in HOME state
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
    state: currentAnimationState,
    isFirstScroll: isFirstScroll,
    capturedPositions: capturedPositions,
    bezierCurves: bezierCurves,
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

  setupScrollTriggers();
  animate();

  console.log("Animation system initialized");
}

// Export functions for GSAP integration
export { moveGhostOnCurve, captureGhostPositions, createBezierCurves };
