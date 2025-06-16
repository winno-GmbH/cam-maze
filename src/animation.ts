import * as THREE from "three";
import { camera, initCamera } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman, pacmanMixer } from "./objects";
import { paths, getPathsForSection } from "./paths";
import { MAZE_CENTER, CAMERA_CONFIG, DOM_ELEMENTS } from "./config";

// Animation state
export type AnimationState = "HOME" | "SCROLL_ANIMATION" | "POV_ANIMATION";
let currentAnimationState: AnimationState = "HOME";

// Constants from old animation-system.ts
const GHOSTS_END_AT = 0.8; // Ghosts finish their animation at 80% scroll
const GHOST_OPACITY_FADE_START = 0.9; // Last 10% of GHOST animation
const HOME_ANIMATION_SPEED = 0.03; // 3x slower than original

// Speed multipliers for different ghosts (higher = faster, reaches center earlier)
const GHOST_SPEED_MULTIPLIERS = {
  ghost1: 1.25, // Fastest - reaches center at 64% scroll
  ghost2: 1.14, // Reaches center at 70% scroll
  ghost3: 1.05, // Reaches center at 76% scroll
  ghost4: 0.97, // Reaches center at 82% scroll
  ghost5: 0.89, // Reaches center at 90% scroll
  pacman: 0.8, // Reaches center at 100% scroll - exactly with camera
};

// Staggered animation timing constants
const GHOST_STAGGER_DELAY = 0.15; // Delay between each ghost
const PACMAN_DELAY = 0.3; // Pacman starts 30% later than the first ghost

// FOV Constants (from backup.js)
const ORIGINAL_FOV = 50; // Used in HOME state
const WIDE_FOV = 80; // Used in POV animation
const END_SEQUENCE_FOV = WIDE_FOV / 4; // 20 - Used in end sequence

// Position tracking
const capturedPositions: { [key: string]: THREE.Vector3 } = {};
const capturedRotations: { [key: string]: THREE.Euler } = {};
const originalHomePositions: { [key: string]: THREE.Vector3 } = {};
const originalHomeRotations: { [key: string]: THREE.Euler } = {};
const originalHomeScales: { [key: string]: THREE.Vector3 } = {};
let homePositionsCaptured = false;
const bezierCurves: { [key: string]: THREE.QuadraticBezierCurve3 } = {};

// Animation timing
let timeOffset = 0;
let pauseTime = 0;
let savedAnimationProgress = 0;
let animationRunning = true;
let animationStartTime = Date.now();

// Global momentum smoothing for all scroll animations
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

// Scroll management
let initialCameraPosition = new THREE.Vector3();
let initialCameraTarget = new THREE.Vector3();
let initialCameraQuaternion = new THREE.Quaternion();
let cameraHomePath: THREE.CubicBezierCurve3;

// POV Animation State
interface POVAnimationState {
  isActive: boolean;
  cameraPOVPath: THREE.CurvePath<THREE.Vector3> | null;
  ghostPOVPaths: { [key: string]: THREE.CurvePath<THREE.Vector3> };
  triggerPositions: { [key: string]: any };
  previousCameraPosition: THREE.Vector3 | null;
  smoothedProgress: number;
  targetProgress: number;
  velocity: number;
  lastTargetProgress: number;
  lastTime: number;
}

const povAnimationState: POVAnimationState = {
  isActive: false,
  cameraPOVPath: null,
  ghostPOVPaths: {},
  triggerPositions: {},
  previousCameraPosition: null,
  smoothedProgress: 0,
  targetProgress: 0,
  velocity: 0,
  lastTargetProgress: 0,
  lastTime: 0,
};

// POV Camera Smoothing State
let previousCameraRotation: THREE.Quaternion | null = null;
const CAMERA_ROTATION_SMOOTHING = 0.25;
const MAX_ROTATION_SPEED = Math.PI / 14;
const LOOK_AHEAD_DISTANCE = 0.012;

// POV Text Animation Constants
const GHOST_TEXT_START = 0.1;
const CAM_TEXT_START = 0.15;
const FADE_OUT_START = 0.85;
const FADE_IN_DURATION = 0.1;
const FADE_OUT_DURATION = 0.15;
const TRIGGER_DISTANCE = 0.02;

// Ghost position smoothing state
let previousGhostPositions: { [key: string]: THREE.Vector3 } = {};
const GHOST_POSITION_SMOOTHING = 0.2;

// Debug info for window
declare global {
  interface Window {
    animationDebugInfo: {
      state: AnimationState;
      capturedPositions: any;
      bezierCurves: any;
      scrollProgress?: number;
      povAnimationActive: boolean;
    };
  }
}

// Utility Functions
function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}

function getCameraLookAtPoint(): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

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

    // Control point: midpoint between start and end in x/z, but high up at y=2
    const controlPoint = new THREE.Vector3(
      (startPos.x + endPos.x) / 2, // Midpoint x between start and maze center
      2, // High up at y=2
      (startPos.z + endPos.z) / 2 // Midpoint z between start and maze center
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

  // Handle opacity fade in last 10% of GHOST animation (not scroll progress!) - DELAYED FADE
  let opacity = 1;
  if (ghostProgress >= GHOST_OPACITY_FADE_START) {
    const fadeProgress =
      (ghostProgress - GHOST_OPACITY_FADE_START) /
      (1 - GHOST_OPACITY_FADE_START);
    opacity = 1 - fadeProgress;
    opacity = Math.max(0, opacity); // Allow complete invisibility
  }

  // Set opacity for both Mesh and Group
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

// Create camera path exactly like backup.js but starting from current position
function createCameraPath() {
  // Use current camera position as start (don't jump) - capture it NOW
  const startPosition = camera.position.clone();

  // Update the initial camera state to current state for smooth transitions
  initialCameraPosition.copy(camera.position);
  initialCameraQuaternion.copy(camera.quaternion);
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  initialCameraTarget = camera.position
    .clone()
    .add(direction.multiplyScalar(5));

  // Calculate a smooth second position towards backup.js path
  const isMobile = window.innerWidth < 768;
  const targetSecondPositionMobile = new THREE.Vector3(0.5, 2.5, 2);
  const targetSecondPositionDesktop = new THREE.Vector3(-1.5, 3, 2);
  const targetSecondPosition = isMobile
    ? targetSecondPositionMobile
    : targetSecondPositionDesktop;

  // Create a second position between current and target
  const secondPosition = new THREE.Vector3().lerpVectors(
    startPosition,
    targetSecondPosition,
    0.3
  );

  // Exact same control and end points as backup.js
  cameraHomePath = new THREE.CubicBezierCurve3(
    startPosition, // Current position (no jump)
    secondPosition, // Interpolated second position
    new THREE.Vector3(0.55675, 3, 0.45175), // High control point
    new THREE.Vector3(0.55675, 0.5, 0.45175) // End point (maze center)
  );
}

// Animation loop
function animationLoop() {
  // Only run home animation if we're in HOME state
  if (currentAnimationState !== "HOME") return;

  const currentTime = Date.now();
  const elapsedTime = (currentTime - animationStartTime - timeOffset) / 1000; // Convert to seconds
  const t = (savedAnimationProgress + elapsedTime * HOME_ANIMATION_SPEED) % 1; // Use consistent speed

  // Animate ghosts on their home paths only during HOME state
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathMapping = getPathsForSection("home");
    const path = pathMapping[key as keyof typeof pathMapping];

    if (!path) {
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
  camera.position.copy(initialCameraPosition);
  camera.quaternion.copy(initialCameraQuaternion);

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

// Camera animation helper - smooth transition from current rotation (ONLY FOV FIX)
function animateCamera(progress: number) {
  if (!cameraHomePath) {
    return;
  }

  // Keep original FOV (50°) - don't jump to wide FOV immediately!
  camera.fov = 50; // Keep originalFOV, don't jump to 80°!
  camera.updateProjectionMatrix();

  // Get position on the backup.js curve
  const position = cameraHomePath.getPointAt(progress);
  camera.position.copy(position);

  // Calculate target look-at direction (towards maze center)
  const mazeCenter = new THREE.Vector3(0.55675, 0.5, 0.45175);
  const targetLookAt = mazeCenter.clone();

  // EXACT backup.js logic: interpolate between startQuaternion and endQuaternion
  if (progress === 0) {
    // At progress 0: keep the EXACT current rotation (no jump!)
    camera.quaternion.copy(initialCameraQuaternion);
  } else {
    // Backup.js logic: slerp between startQuaternion and endQuaternion
    // endQuaternion = looking straight down (-90° on X-axis)
    const currentQuaternion = new THREE.Quaternion();
    currentQuaternion.slerpQuaternions(
      initialCameraQuaternion,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
      progress
    );
    camera.quaternion.copy(currentQuaternion);
  }
}

// Scroll event handler
function handleScroll() {
  // CRITICAL: Don't update HOME ghosts when POV animation is active!
  if (povAnimationState.isActive) {
    return; // POV system handles everything
  }

  const homeSection = document.querySelector(".sc--home") as HTMLElement;
  if (!homeSection) {
    return;
  }

  const rect = homeSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Check if we're in or approaching the home section animation range
  const isInHomeSection =
    rect.top <= windowHeight && rect.bottom > -windowHeight;

  // Calculate scroll progress: LIMITED to "top top" -> "bottom top" (like backup.js)
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
        currentAnimationState = "SCROLL_ANIMATION";

        // Capture positions immediately when starting scroll animation
        captureGhostPositions();
        createBezierCurves();
        createCameraPath();
      }

      // BACK TO ORIGINAL: No smoothing in home section (it was working fine)

      // Animate ghosts along bezier curves with different speeds
      const ghostKeys = Object.keys(ghosts);
      ghostKeys.forEach((ghostKey) => {
        if (bezierCurves[ghostKey]) {
          // All ghosts start at the same time, but move at different speeds
          const speedMultiplier =
            GHOST_SPEED_MULTIPLIERS[
              ghostKey as keyof typeof GHOST_SPEED_MULTIPLIERS
            ] || 1.0;
          const adjustedProgress = scrollProgress * speedMultiplier;
          const ghostProgress = Math.min(adjustedProgress / GHOSTS_END_AT, 1);

          moveGhostOnCurve(ghostKey, ghostProgress);
        }
      });

      // Animate camera normally (0% to 100%)
      animateCamera(scrollProgress);

      // Update debug info
      if (window.animationDebugInfo) {
        window.animationDebugInfo.scrollProgress = scrollProgress;
      }
    } else if (scrollProgress === 0) {
      // Back at the beginning of home section - reset to home state
      if (currentAnimationState !== "HOME") {
        resetToHomeState();
      }
    }
  } else {
    // We're outside the home section and buffer zone

    // Check if we're at the very top of the page (above home section)
    if (window.scrollY <= 10) {
      resetToHomeState();
    }
  }
}

// Main animation loop
function animate() {
  // Update FOV based on current animation state
  updateCameraFOV();

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

// Update Camera FOV based on animation state (INSTANT change)
function updateCameraFOV() {
  if (!camera) return;

  let targetFOV = ORIGINAL_FOV;

  switch (currentAnimationState) {
    case "HOME":
      targetFOV = ORIGINAL_FOV;
      break;
    case "SCROLL_ANIMATION":
      targetFOV = ORIGINAL_FOV;
      break;
    case "POV_ANIMATION":
      targetFOV = WIDE_FOV;
      break;
    default:
      targetFOV = ORIGINAL_FOV;
  }

  // INSTANT FOV change (no animation)
  if (camera.fov !== targetFOV) {
    camera.fov = targetFOV;
    camera.updateProjectionMatrix();
  }
}

// Initialize animation system
export function initAnimationSystem() {
  // FIRST THING: Capture the initial camera state before any animations start
  initialCameraPosition = camera.position.clone();
  initialCameraQuaternion = camera.quaternion.clone();
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  initialCameraTarget = camera.position
    .clone()
    .add(direction.multiplyScalar(5));

  // CRITICAL: Capture ORIGINAL home positions before any animations start
  captureOriginalHomePositions();

  // Setup debug info
  window.animationDebugInfo = {
    state: currentAnimationState,
    capturedPositions: capturedPositions,
    bezierCurves: bezierCurves,
    povAnimationActive: false,
  };

  // Ensure all ghosts are visible and have full opacity
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghosts[ghostKey]) {
      ghosts[ghostKey].visible = true;

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

  // Setup scroll event listeners for home section
  window.addEventListener("scroll", handleScroll);

  // Initialize camera
  initCamera();

  // Start animation loop
  animate();
}

// Export functions for external use
export {
  moveGhostOnCurve,
  captureGhostPositions,
  createBezierCurves,
  captureOriginalHomePositions,
};
