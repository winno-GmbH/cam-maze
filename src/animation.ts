import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { paths, cameraHomePath, getPathsForSection } from "./paths";
import { camera, startQuaternion, endQuaternion } from "./camera";
import { MAZE_CENTER, CAMERA_CONFIG, SELECTORS, startPosition } from "./config";
import { AnimationState } from "./types";

// 1. STATE MANAGEMENT
let currentAnimationState: AnimationState = "HOME";

// Debug info for window
declare global {
  interface Window {
    animationDebugInfo: {
      state: AnimationState;
      scrollProgress?: number;
    };
  }
}

// Constants
const GHOSTS_END_AT = 0.8; // Ghosts finish their animation at 80% scroll
const GHOST_OPACITY_FADE_START = 0.9; // Last 10% of GHOST animation (ghostProgress 0.9-1.0) - DELAYED FADE

// Speed multipliers for different ghosts (higher = faster, reaches center earlier)
const GHOST_SPEED_MULTIPLIERS = {
  ghost1: 1.25, // Fastest - reaches center at 64% scroll (0.8/1.25 = 0.64)
  ghost2: 1.14, // Reaches center at 70% scroll (0.8/1.14 = 0.70)
  ghost3: 1.05, // Reaches center at 76% scroll (0.8/1.05 = 0.76)
  ghost4: 0.97, // Reaches center at 82% scroll (0.8/0.97 = 0.82)
  ghost5: 0.89, // Reaches center at 90% scroll (0.8/0.89 = 0.90)
  pacman: 0.8, // Reaches center at 100% scroll (0.8/0.8 = 1.0) - exactly with camera
};

// Staggered animation timing constants
const GHOST_STAGGER_DELAY = 0.15; // Delay between each ghost (15% of scroll progress)
const PACMAN_DELAY = 0.3; // Pacman starts 30% later than the first ghost

// 2. POSITION & BEZIER SYSTEM
const capturedPositions: { [key: string]: THREE.Vector3 } = {};
const capturedRotations: { [key: string]: THREE.Euler } = {};
const originalHomePositions: { [key: string]: THREE.Vector3 } = {}; // ORIGINAL home positions captured at start
const originalHomeRotations: { [key: string]: THREE.Euler } = {}; // ORIGINAL home rotations captured at start
const originalHomeScales: { [key: string]: THREE.Vector3 } = {}; // ORIGINAL home scales captured at start
let homePositionsCaptured = false; // Flag to ensure we only capture home positions once
const bezierCurves: { [key: string]: THREE.QuadraticBezierCurve3 } = {};
let timeOffset = 0;
let pauseTime = 0;
let savedAnimationProgress = 0; // Store the home animation progress when pausing

// HOME ANIMATION SPEED - Keep this consistent everywhere!
const HOME_ANIMATION_SPEED = 0.03; // 3x slower than original (was 0.1)

// Animation timing
let animationStartTime = Date.now();

// GLOBAL MOMENTUM SMOOTHING for all scroll animations
interface GlobalSmoothingState {
  smoothedProgress: number;
  targetProgress: number;
  velocity: number;
  lastTargetProgress: number;
  lastTime: number;
}

const globalSmoothing: GlobalSmoothingState = {
  smoothedProgress: 0,
  targetProgress: 0,
  velocity: 0,
  lastTargetProgress: 0,
  lastTime: 0,
};

// Apply momentum smoothing to ANY scroll progress
function applyGlobalMomentumSmoothing(targetProgress: number): number {
  const currentTime = performance.now() / 1000;

  // Initialize on first run
  if (globalSmoothing.lastTime === 0) {
    globalSmoothing.lastTime = currentTime;
    globalSmoothing.lastTargetProgress = targetProgress;
    globalSmoothing.smoothedProgress = targetProgress;
    return targetProgress;
  }

  const deltaTime = Math.max(currentTime - globalSmoothing.lastTime, 0.001);

  // Calculate input velocity (how fast user is scrolling)
  const inputVelocity =
    (targetProgress - globalSmoothing.lastTargetProgress) / deltaTime;

  // SMOOTH SETTINGS:
  const friction = 0.88; // Higher = more momentum
  const responsiveness = 0.2; // Higher = more direct response
  const maxVelocity = 3.0; // Max velocity cap

  // Apply friction
  globalSmoothing.velocity *= friction;

  // Add input influence
  const progressDiff = targetProgress - globalSmoothing.smoothedProgress;
  const velocityInfluence = inputVelocity * 0.15;

  globalSmoothing.velocity += progressDiff * responsiveness + velocityInfluence;
  globalSmoothing.velocity = Math.max(
    -maxVelocity,
    Math.min(maxVelocity, globalSmoothing.velocity)
  );

  // Apply velocity
  globalSmoothing.smoothedProgress += globalSmoothing.velocity * deltaTime;
  globalSmoothing.smoothedProgress = Math.max(
    0,
    Math.min(1, globalSmoothing.smoothedProgress)
  );

  // Update tracking
  globalSmoothing.lastTargetProgress = targetProgress;
  globalSmoothing.lastTime = currentTime;

  return globalSmoothing.smoothedProgress;
}

// Capture ORIGINAL home positions (called only once at start)
function captureOriginalHomePositions() {
  if (homePositionsCaptured) return; // Already captured

  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghosts[ghostKey]) {
      originalHomePositions[ghostKey] = ghosts[ghostKey].position.clone();
      originalHomeRotations[ghostKey] = ghosts[ghostKey].rotation.clone();
      originalHomeScales[ghostKey] = ghosts[ghostKey].scale.clone();
    }
  });
  homePositionsCaptured = true;
}

// Capture current positions for scroll animation (may be called multiple times)
function captureGhostPositions() {
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghosts[ghostKey]) {
      capturedPositions[ghostKey] = ghosts[ghostKey].position.clone();
      capturedRotations[ghostKey] = ghosts[ghostKey].rotation.clone();
    }
  });
}

function createBezierCurves() {
  // Use the global MAZE_CENTER constant so it can be changed easily
  Object.keys(capturedPositions).forEach((ghostKey) => {
    const startPos = capturedPositions[ghostKey].clone(); // Current position of ghosts
    const endPos = MAZE_CENTER.clone(); // Use global MAZE_CENTER constant

    // Control point: Middle point between start and end in x/z, but high up at y=2
    const controlPoint = new THREE.Vector3(
      (startPos.x + endPos.x) / 2, // Middle point x between start and maze center
      2, // High up at y=2
      (startPos.z + endPos.z) / 2 // Middle point z between start and maze center
    );

    bezierCurves[ghostKey] = new THREE.QuadraticBezierCurve3(
      startPos, // Where ghost is when animation stops
      controlPoint, // High arc point
      endPos // Maze center
    );
  });
}

function moveGhostOnCurve(ghostKey: string, ghostProgress: number) {
  if (
    !bezierCurves[ghostKey] ||
    !ghosts[ghostKey] ||
    !capturedPositions[ghostKey] ||
    !capturedRotations[ghostKey]
  )
    return;

  const ghost = ghosts[ghostKey];

  // Always use bezier curve for smooth interpolation
  const position = bezierCurves[ghostKey].getPoint(ghostProgress);
  ghost.position.copy(position);

  // Simple rotation: interpolate from start rotation to (90°, 0°, 0°)
  const originalRotation = capturedRotations[ghostKey];
  const targetRotation = new THREE.Euler(Math.PI / -2, 0, 0); // Target: (90°, 0°, 0°)

  // Interpolate between original and target rotation
  const currentRotation = new THREE.Euler(
    originalRotation.x +
      (targetRotation.x - originalRotation.x) * ghostProgress,
    originalRotation.y +
      (targetRotation.y - originalRotation.y) * ghostProgress,
    originalRotation.z + (targetRotation.z - originalRotation.z) * ghostProgress
  );

  ghost.rotation.copy(currentRotation);

  // Handle opacity fade for ghosts (not pacman)
  if (ghostKey !== "pacman" && ghost instanceof THREE.Mesh && ghost.material) {
    let opacity = 1;
    if (ghostProgress > GHOST_OPACITY_FADE_START) {
      const fadeProgress =
        (ghostProgress - GHOST_OPACITY_FADE_START) /
        (1 - GHOST_OPACITY_FADE_START);
      opacity = 1 - fadeProgress;
    }

    if (Array.isArray(ghost.material)) {
      ghost.material.forEach((mat) => {
        if ("opacity" in mat) mat.opacity = opacity;
      });
    } else {
      if ("opacity" in ghost.material) ghost.material.opacity = opacity;
    }
  } else if (ghostKey !== "pacman" && ghost instanceof THREE.Group) {
    // Handle group opacity
    const opacity =
      ghostProgress > GHOST_OPACITY_FADE_START
        ? 1 -
          (ghostProgress - GHOST_OPACITY_FADE_START) /
            (1 - GHOST_OPACITY_FADE_START)
        : 1;

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

// Home animation loop
function animationLoop() {
  // Only run home animation if we're in HOME state
  if (currentAnimationState !== "HOME") return;

  const currentTime = Date.now();
  const elapsedTime = (currentTime - animationStartTime - timeOffset) / 1000; // Convert to seconds
  const t = (savedAnimationProgress + elapsedTime * HOME_ANIMATION_SPEED) % 1; // Use consistent speed

  // Animate ghosts on their home paths only during HOME state
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const homePaths = getPathsForSection("home");
    const path = homePaths[key as keyof typeof homePaths];
    if (!path) {
      // Don't spam warnings, just return
      return;
    }

    if (key === "pacman") {
      // Pacman animation
      const position = path.getPointAt(t);
      ghost.position.copy(position);
      const tangent = path.getTangentAt(t).normalize();
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
      const position = path.getPointAt(t);
      ghost.position.copy(position);
      const tangent = path.getTangentAt(t).normalize();
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

// Reset to home state helper
function resetToHomeState() {
  currentAnimationState = "HOME";

  // CRITICAL FIX: Reset animation timing to continue from saved progress
  animationStartTime = Date.now();
  timeOffset = 0;
  pauseTime = 0;

  // Reset camera to initial position and rotation
  camera.position.copy(startPosition);
  camera.quaternion.copy(startQuaternion);

  // Reset all ghosts to their ORIGINAL home positions, rotations, scales and full opacity
  Object.keys(ghosts).forEach((ghostKey) => {
    if (
      originalHomePositions[ghostKey] &&
      originalHomeRotations[ghostKey] &&
      originalHomeScales[ghostKey] &&
      ghosts[ghostKey]
    ) {
      ghosts[ghostKey].position.copy(originalHomePositions[ghostKey]);
      ghosts[ghostKey].rotation.copy(originalHomeRotations[ghostKey]);
      ghosts[ghostKey].scale.copy(originalHomeScales[ghostKey]); // CRITICAL: Restore original scale

      // Reset opacity to full
      const ghost = ghosts[ghostKey];
      if (ghost instanceof THREE.Mesh && ghost.material) {
        if (Array.isArray(ghost.material)) {
          ghost.material.forEach((mat) => {
            if ("opacity" in mat) mat.opacity = 1;
          });
        } else {
          if ("opacity" in ghost.material) ghost.material.opacity = 1;
        }
      } else if (ghost instanceof THREE.Group) {
        ghost.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if ("opacity" in mat) mat.opacity = 1;
              });
            } else {
              if ("opacity" in child.material) child.material.opacity = 1;
            }
          }
        });
      }
    }
  });

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.state = currentAnimationState;
    window.animationDebugInfo.scrollProgress = 0;
  }
}

// Camera animation helper - smooth transition from current rotation
function animateCamera(progress: number) {
  if (!cameraHomePath) {
    return;
  }

  // Keep original FOV (50°) - don't jump to wide FOV immediately!
  camera.fov = CAMERA_CONFIG.originalFOV;
  camera.updateProjectionMatrix();

  // Get position on the curve
  const position = cameraHomePath.getPointAt(progress);
  camera.position.copy(position);

  // Calculate target look-at direction (towards maze center)
  const targetLookAt = MAZE_CENTER.clone();

  // Interpolate between startQuaternion and endQuaternion
  if (progress === 0) {
    // At progress 0: keep the EXACT current rotation (no jump!)
    camera.quaternion.copy(startQuaternion);
  } else {
    // Slerp between startQuaternion and endQuaternion
    // endQuaternion = looking straight down (-90° on X-axis)
    const currentQuaternion = new THREE.Quaternion();
    currentQuaternion.slerpQuaternions(
      startQuaternion,
      endQuaternion,
      progress
    );
    camera.quaternion.copy(currentQuaternion);
  }
}

// Smooth step function
function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}

// Scroll event handler
function handleScroll() {
  const homeSection = document.querySelector(
    SELECTORS.homeSection
  ) as HTMLElement;
  if (!homeSection) {
    return;
  }

  const rect = homeSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Check if we're in or approaching the home section animation range
  const isInHomeSection =
    rect.top <= windowHeight && rect.bottom > -windowHeight;

  // Calculate scroll progress: LIMITED to "top top" -> "bottom top"
  // Animation starts when section top hits viewport top (rect.top = 0)
  // Animation ends when section bottom hits viewport top (rect.bottom = 0)

  let scrollProgress = 0;

  if (rect.top <= 0 && rect.bottom >= 0) {
    // We're in the animation range: section is crossing the viewport
    const sectionHeight = rect.height;
    const scrolledDistance = Math.abs(rect.top); // How far the section has scrolled past viewport top
    scrollProgress = Math.min(1, scrolledDistance / sectionHeight); // 0 to 1
  } else if (rect.bottom < 0) {
    // Past the animation range - section completely scrolled out, animation complete
    scrollProgress = 1;
  }
  // else scrollProgress stays 0 (before animation range)

  if (isInHomeSection) {
    // We're in the home section or buffer zone - handle scroll animation

    if (scrollProgress > 0) {
      // Always animate when scrollProgress > 0, regardless of state
      // Switch to SCROLL_ANIMATION state if not already
      if (currentAnimationState === "HOME") {
        // Capture current animation progress before switching states
        const currentTime = Date.now();
        const elapsedTime =
          (currentTime - animationStartTime - timeOffset) / 1000;
        savedAnimationProgress =
          (savedAnimationProgress + elapsedTime * HOME_ANIMATION_SPEED) % 1;

        // Capture current ghost positions for scroll animation
        captureGhostPositions();
        createBezierCurves();

        currentAnimationState = "SCROLL_ANIMATION";
        animationStartTime = currentTime;
        timeOffset = 0;
      }

      // Apply momentum smoothing to scroll progress
      const smoothedProgress = applyGlobalMomentumSmoothing(scrollProgress);

      // Animate camera
      animateCamera(smoothedProgress);

      // Animate ghosts with staggered timing
      Object.keys(ghosts).forEach((ghostKey) => {
        const speedMultiplier =
          GHOST_SPEED_MULTIPLIERS[
            ghostKey as keyof typeof GHOST_SPEED_MULTIPLIERS
          ];
        const ghostProgress = Math.min(1, smoothedProgress * speedMultiplier);

        if (ghostProgress <= 1) {
          moveGhostOnCurve(ghostKey, ghostProgress);
        }
      });

      // Update debug info
      if (window.animationDebugInfo) {
        window.animationDebugInfo.state = currentAnimationState;
        window.animationDebugInfo.scrollProgress = smoothedProgress;
      }
    } else {
      // Back at the beginning of home section - reset to home state
      if (currentAnimationState !== "HOME") {
        resetToHomeState();
      }
    }
  } else {
    // We're outside the home section and buffer zone

    // Check if we're at the very top of the page (above home section)
    if (rect.top > windowHeight) {
      resetToHomeState();
    }
  }
}

// Main animation function
function animate() {
  // Update clock
  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }

  // Run home animation loop
  animationLoop();

  // Request next frame
  requestAnimationFrame(animate);
}

// Initialize animation system
export function initAnimationSystem() {
  // CRITICAL: Capture ORIGINAL home positions before any animations start
  captureOriginalHomePositions();

  // Setup scroll event listener
  window.addEventListener("scroll", handleScroll, { passive: true });

  // Setup debug info
  window.animationDebugInfo = {
    state: currentAnimationState,
    scrollProgress: 0,
  };

  // Start animation loop
  animate();

  console.log("Animation system initialized");
}

// Export functions for external use
export {
  resetToHomeState,
  animateCamera,
  handleScroll,
  currentAnimationState,
  captureOriginalHomePositions,
  captureGhostPositions,
  createBezierCurves,
  moveGhostOnCurve,
  animationLoop,
};
