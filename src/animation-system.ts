import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { pathsMap } from "./paths";
import { renderer, scene } from "./scene";
import { camera, startQuaternion, endQuaternion } from "./camera";
// Removed redundant smooth scroll system - using direct progress for precise control

// 1. STATE MANAGEMENT
type AnimationState = "HOME" | "SCROLL_ANIMATION" | "POV_ANIMATION";
let currentAnimationState: AnimationState = "HOME";

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

// Constants
const MAZE_CENTER = new THREE.Vector3(0.55675, 0.5, 0.45175);
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

// FOV Constants (from backup.js)
const ORIGINAL_FOV = 50; // Used in HOME state
const WIDE_FOV = 80; // Used in POV animation
const END_SEQUENCE_FOV = WIDE_FOV / 4; // 20 - Used in end sequence

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

  const lag = targetProgress - globalSmoothing.smoothedProgress;

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
    const startPos = capturedPositions[ghostKey].clone(); // Aktuelle Position der Geister
    const endPos = MAZE_CENTER.clone(); // Use global MAZE_CENTER constant

    // Control point: Mittelpunkt zwischen Start und Ende in x/z, aber hoch oben bei y=1
    const controlPoint = new THREE.Vector3(
      (startPos.x + endPos.x) / 2, // Mittelpunkt x zwischen Start und Maze-Mitte
      2, // Hoch oben bei y=1
      (startPos.z + endPos.z) / 2 // Mittelpunkt z zwischen Start und Maze-Mitte
    );

    bezierCurves[ghostKey] = new THREE.QuadraticBezierCurve3(
      startPos, // Wo Geist ist wenn Animation stoppt
      controlPoint, // Hoher Bogen-Punkt
      endPos // Maze-Mitte
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

// 3. SCROLL MANAGEMENT
let initialCameraPosition = new THREE.Vector3();
let initialCameraTarget = new THREE.Vector3();
let initialCameraQuaternion = new THREE.Quaternion();
let cameraHomePath: THREE.CubicBezierCurve3;

// 4. ANIMATION LOOP
let animationStartTime = Date.now();

function animationLoop() {
  // Only run home animation if we're in HOME state
  if (currentAnimationState !== "HOME") return;

  const currentTime = Date.now();
  const elapsedTime = (currentTime - animationStartTime - timeOffset) / 1000; // Convert to seconds
  const t = (savedAnimationProgress + elapsedTime * HOME_ANIMATION_SPEED) % 1; // Use consistent speed

  // Animate ghosts on their home paths only during HOME state
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
  // Only change FOV if backup.js specifically does it
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
      endQuaternion,
      progress
    );
    camera.quaternion.copy(currentQuaternion);
  }
}

// Smooth step function from backup.js
function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
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

// 5. GSAP INTEGRATION - To be called by GSAP ScrollTriggers
// 6. INTRO TEXT ANIMATIONS (after arriving at maze)
function setupIntroAnimations() {
  // Setup intro header animation (.sc_h--intro) - CORRECTED initial states
  const introHeader = document.querySelector(".sc_h--intro");
  if (introHeader) {
    // Set initial state - VISIBLE but transparent
    (introHeader as HTMLElement).style.transform = "scale(0)";
    (introHeader as HTMLElement).style.opacity = "0";
    (introHeader as HTMLElement).style.display = "block"; // VISIBLE for animations
  }

  // Setup intro body animation (.sc_b--intro) - CORRECTED initial states
  const introBody = document.querySelector(".sc_b--intro");
  if (introBody) {
    // Set initial state - transparent but no display manipulation
    (introBody as HTMLElement).style.transform = "scale(0.5)";
    (introBody as HTMLElement).style.opacity = "0";
    // Removed display: block - let CSS handle positioning
  }

  // INJECT CSS FOR FIXED POSITIONING - Override any sticky behavior
  if (!document.getElementById("intro-fixed-styles")) {
    const style = document.createElement("style");
    style.id = "intro-fixed-styles";
    style.textContent = `
      .intro-text-fixed {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        z-index: 1000 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Handle intro section scroll animations (like backup.js)
function handleIntroScroll() {
  const introSection = document.querySelector(".sc--intro") as HTMLElement;
  if (!introSection) return;

  const rect = introSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Calculate if intro section is in view - NO BUFFER ZONE for precise "bottom bottom" timing
  const sectionTop = rect.top;
  const sectionBottom = rect.bottom;
  const sectionHeight = rect.height;

  // Simplified GSAP logic: Just use section scrolling from top to bottom
  if (sectionTop <= 0 && sectionBottom >= 0) {
    // Section is crossing the viewport
    const progress = Math.min(1, Math.abs(sectionTop) / sectionHeight);

    // Calculate when "center center" is reached
    // "center center" = when section center aligns with viewport center
    const centerProgress = 0.5; // This happens halfway through the section

    // Header: "top top" to "center center" (0% to 50%)
    if (progress <= centerProgress) {
      const headerProgress = progress / centerProgress; // 0-0.5 maps to 0-1
      animateIntroHeaderDirect(headerProgress);
      animateIntroBodyDirect(0); // Body not started yet
    } else {
      // Body: "center center" to "bottom bottom" (50% to 100%)
      const bodyProgress = (progress - centerProgress) / (1 - centerProgress); // 0.5-1 maps to 0-1
      animateIntroHeaderDirect(1); // Header finished
      animateIntroBodyDirect(bodyProgress);
    }
  } else {
    // CORRECTED: Reset to invisible but keep display block for future animations
    const introHeader = document.querySelector(".sc_h--intro") as HTMLElement;
    const introBody = document.querySelector(".sc_b--intro") as HTMLElement;

    if (introHeader) {
      introHeader.style.opacity = "0";
      introHeader.style.transform = "scale(0)";
    }
    if (introBody) {
      introBody.style.opacity = "0";
      introBody.style.transform = "scale(0.5)";
    }
  }
}

// FIXED intro scroll handler with corrected backup.js timing
function handleIntroScrollFixed() {
  const introSection = document.querySelector(".sc--intro") as HTMLElement;
  if (!introSection) {
    return;
  }

  const rect = introSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const sectionTop = rect.top;
  const sectionBottom = rect.bottom;
  const sectionHeight = rect.height;

  // CORRECTED backup.js timing:
  // Header: "top top" to "center center"
  // Body: "center center" to "bottom bottom"

  if (sectionTop <= 0 && sectionBottom >= 0) {
    // Section is visible - calculate overall progress
    const scrolledDistance = Math.abs(sectionTop);
    const overallProgress = Math.min(1, scrolledDistance / sectionHeight);

    // HEADER: Animate from 0% to 50% (top top -> center center)
    if (overallProgress <= 0.5) {
      const headerProgress = overallProgress / 0.5; // Map 0-0.5 to 0-1
      animateIntroHeaderDirect(headerProgress);
      animateIntroBodyDirect(0); // Body stays hidden
    } else {
      // BODY: Animate from 50% to 100% (center center -> bottom bottom)
      const bodyProgress = (overallProgress - 0.5) / 0.5; // Map 0.5-1 to 0-1
      animateIntroHeaderDirect(1); // Header finished
      animateIntroBodyDirect(bodyProgress);
    }
  } else {
    // Section not visible - reset elements
    animateIntroHeaderDirect(0);
    animateIntroBodyDirect(0);
  }
}

// State tracking to prevent conflicts
let isHeaderAnimating = false;
let isBodyAnimating = false;

// Smooth easing function for opacity transitions
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateIntroHeaderDirect(directProgress: number) {
  const introHeader = document.querySelector(".sc_h--intro") as HTMLElement;
  if (!introHeader) {
    return;
  }

  // Header animation: directProgress goes from 0-1 for the full header animation
  let scale = 0;
  let opacity = 0;

  if (directProgress > 0 && directProgress < 1) {
    if (directProgress <= 0.2) {
      // 0% - 20%: scale 0->0.8, opacity 0->1 (RESTORED: Back to original behavior)
      const keyframeProgress = directProgress / 0.2;
      const easedProgress = easeInOutCubic(keyframeProgress);
      scale = easedProgress * 0.8;
      opacity = easedProgress; // 0.0 -> 1.0
    } else if (directProgress <= 0.8) {
      // 20% - 80%: scale 0.8->1.2, opacity stays 1 (LÄNGER sichtbar)
      const keyframeProgress = (directProgress - 0.2) / 0.6;
      scale = 0.8 + keyframeProgress * 0.4; // 0.8 -> 1.2
      opacity = 1;
    } else {
      // 80% - 100%: scale 1.2->1.5, opacity 1->0 (RESTORED: Back to original behavior)
      const keyframeProgress = (directProgress - 0.8) / 0.2;
      scale = 1.2 + keyframeProgress * 0.3; // 1.2 -> 1.5
      opacity = 1 - keyframeProgress; // 1 -> 0.0
    }
  } else if (directProgress >= 1) {
    // Header finished
    scale = 1.5;
    opacity = 0; // RESTORED: Back to original behavior
  } else {
    // Header not started
    scale = 0;
    opacity = 0; // RESTORED: Back to original behavior
  }

  // ROBUST STATE-TRACKED POSITIONING
  const shouldBeFixed = directProgress > 0 && directProgress < 1;

  if (shouldBeFixed && !isHeaderAnimating) {
    // Start animation - add fixed class once
    isHeaderAnimating = true;
    introHeader.classList.add("intro-text-fixed");
    console.log("🎬 Header: Fixed positioning ON");
  } else if (!shouldBeFixed && isHeaderAnimating) {
    // End animation - remove fixed class once
    isHeaderAnimating = false;
    introHeader.classList.remove("intro-text-fixed");
    console.log("🎬 Header: Fixed positioning OFF");
  }

  // Always update transform and opacity based on current state
  if (isHeaderAnimating) {
    introHeader.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale})`,
      "important"
    );
  } else {
    introHeader.style.setProperty("transform", `scale(${scale})`, "important");
  }
  introHeader.style.opacity = opacity.toString();
}

function animateIntroBodyDirect(directProgress: number) {
  const introBody = document.querySelector(".sc_b--intro") as HTMLElement;
  if (!introBody) {
    return;
  }

  // Body animation: directProgress goes from 0-1 for the full body animation
  let scale = 0.5;
  let opacity = 0;

  if (directProgress > 0 && directProgress < 1) {
    if (directProgress <= 0.2) {
      // 0% - 20%: scale 0.5->0.8, opacity 0->1 (RESTORED: Back to original behavior)
      const keyframeProgress = directProgress / 0.2;
      const easedProgress = easeInOutCubic(keyframeProgress);
      scale = 0.5 + easedProgress * 0.3; // 0.5 -> 0.8
      opacity = easedProgress; // 0.0 -> 1.0
    } else if (directProgress <= 0.8) {
      // 20% - 80%: scale 0.8->1.2, opacity stays 1 (LÄNGER sichtbar)
      const keyframeProgress = (directProgress - 0.2) / 0.6;
      scale = 0.8 + keyframeProgress * 0.4; // 0.8 -> 1.2
      opacity = 1;
    } else {
      // 80% - 100%: scale 1.2->1.5, opacity 1->0 (RESTORED: Back to original behavior)
      const keyframeProgress = (directProgress - 0.8) / 0.2;
      scale = 1.2 + keyframeProgress * 0.3; // 1.2 -> 1.5
      opacity = 1 - keyframeProgress; // 1 -> 0.0
    }
  } else if (directProgress >= 1) {
    // Body finished
    scale = 1.5;
    opacity = 0; // RESTORED: Back to original behavior
  } else {
    // Body not started yet
    scale = 0.5;
    opacity = 0; // RESTORED: Back to original behavior
  }

  // ROBUST STATE-TRACKED POSITIONING
  const shouldBeFixed = directProgress > 0 && directProgress < 1;

  if (shouldBeFixed && !isBodyAnimating) {
    // Start animation - add fixed class once
    isBodyAnimating = true;
    introBody.classList.add("intro-text-fixed");
    console.log("🎬 Body: Fixed positioning ON");
  } else if (!shouldBeFixed && isBodyAnimating) {
    // End animation - remove fixed class once
    isBodyAnimating = false;
    introBody.classList.remove("intro-text-fixed");
    console.log("🎬 Body: Fixed positioning OFF");
  }

  // Always update transform and opacity based on current state
  if (isBodyAnimating) {
    introBody.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale})`,
      "important"
    );
  } else {
    introBody.style.setProperty("transform", `scale(${scale})`, "important");
  }
  introBody.style.opacity = opacity.toString();
}

// GSAP-based intro animations (exact backup.js timing)
async function setupGSAPIntroAnimations() {
  try {
    // Dynamic import GSAP with validation
    const gsapModule = await import("gsap");
    const scrollTriggerModule = await import("gsap/ScrollTrigger");

    const gsap = gsapModule.gsap || gsapModule.default;
    const ScrollTrigger =
      scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;

    if (!gsap || !ScrollTrigger) {
      throw new Error("GSAP modules not loaded properly");
    }

    gsap.registerPlugin(ScrollTrigger);

    // SMOOTH GSAP settings to prevent flickering + fast scroll issues
    gsap.config({
      force3D: true, // Hardware acceleration
      nullTargetWarn: false,
      autoSleep: 60, // Keep animations responsive
    });

    // Optimize ScrollTrigger for smooth performance + fast scroll handling
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load", // Reduce refresh triggers
      limitCallbacks: true, // Prevent callback overload during fast scrolling
    });

    console.log(
      "🎬 Setting up GSAP intro animations with exact backup.js timing"
    );

    // EXACT backup.js setupIntroHeader() timing - ROBUST FIXED POSITIONING
    gsap.fromTo(
      ".sc_h--intro",
      {
        scale: 0,
        opacity: 0,
        className: "+=intro-text-fixed", // Add CSS class for fixed positioning
        x: "-50%",
        y: "-50%",
      },
      {
        scale: 1.5,
        opacity: 0,
        scrollTrigger: {
          trigger: ".sc--intro",
          start: "top top", // BACKUP.JS: Exact same as original
          end: "center center", // BACKUP.JS: Exact same as original
          scrub: 0.3, // OPTIMIZED: Faster response for fast scrolling
          invalidateOnRefresh: true, // Ensure proper recalculation
        },
        onComplete: () => {
          // Reset positioning after animation
          document
            .querySelector(".sc_h--intro")
            ?.classList.remove("intro-text-fixed");
        },
        ease: "none",
        keyframes: [
          { scale: 0, opacity: 0, duration: 0 },
          { scale: 0.8, opacity: 1, duration: 0.3 },
          { scale: 1.2, opacity: 1, duration: 0.4 },
          { scale: 1.5, opacity: 0, duration: 0.3 },
        ],
      }
    );

    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".sc--intro",
          start: "center center", // BACKUP.JS: Exact same as original
          end: "bottom bottom", // BACKUP.JS: Exact same as original
          scrub: 0.3, // OPTIMIZED: Faster response for fast scrolling
          invalidateOnRefresh: true, // Ensure proper recalculation
        },
      })
      .fromTo(
        ".sc_b--intro",
        {
          scale: 0.5,
          opacity: 0,
          className: "+=intro-text-fixed", // Add CSS class for fixed positioning
          x: "-50%",
          y: "-50%",
        },
        {
          keyframes: [
            { scale: 0.5, opacity: 0, duration: 0 },
            { scale: 0.8, opacity: 1, duration: 0.3 },
            { scale: 1.2, opacity: 1, duration: 0.4 },
            { scale: 1.5, opacity: 0, duration: 0.3 },
          ],
          onComplete: () => {
            // Reset positioning after animation
            document
              .querySelector(".sc_b--intro")
              ?.classList.remove("intro-text-fixed");
          },
        }
      );

    console.log("✅ GSAP intro animations successfully setup");
  } catch (error) {
    console.error("❌ GSAP setup failed:", error);
    throw error; // Re-throw to trigger the catch in setupScrollTriggers
  }
}

export function setupScrollTriggers() {
  console.log("🚀 setupScrollTriggers called!");

  // Setup intro animations (set initial states correctly)
  setupIntroAnimations();

  // TRY GSAP FIRST, fallback to manual on failure
  console.log("🎬 Attempting to setup GSAP intro animations...");

  // DISABLE GSAP FOR NOW - Use reliable manual system only
  console.log("🔧 Using manual intro animations for maximum reliability");

  // MANUAL SYSTEM ONLY: Skip GSAP, go straight to manual fallback
  {
    console.log("🎬 Setting up reliable manual intro animations");

    // Manual scroll handler
    let scrollCount = 0;
    window.addEventListener("scroll", () => {
      scrollCount++;
      if (scrollCount % 10 === 0) {
        // Only log every 10th scroll to avoid spam
        console.log(`📜 SCROLL #${scrollCount} - Y: ${window.scrollY}`);
      }

      // Test if we can find intro elements
      const intro = document.querySelector(".sc--intro");
      const header = document.querySelector(".sc_h--intro");
      const body = document.querySelector(".sc_b--intro");

      if (scrollCount === 1) {
        // Log once on first scroll
        console.log("🔍 Elements found:", {
          intro: !!intro,
          header: !!header,
          body: !!body,
        });
      }

      // WORKING INTRO ANIMATION: Use the exact backup.js timing
      if (intro && header && body) {
        const rect = intro.getBoundingClientRect();

        if (rect.top <= 0 && rect.bottom >= 0) {
          // Section is visible - calculate progress
          const scrolledDistance = Math.abs(rect.top);
          const overallProgress = Math.min(1, scrolledDistance / rect.height);

          // HEADER: 0% to 50% (backup.js: "top top" to "center center")
          if (overallProgress <= 0.5) {
            const headerProgress = overallProgress / 0.5;
            animateIntroHeaderDirect(headerProgress);
            animateIntroBodyDirect(0);
          } else {
            // BODY: 50% to 100% (backup.js: "center center" to "bottom bottom")
            const bodyProgress = (overallProgress - 0.5) / 0.5;
            animateIntroHeaderDirect(1);
            animateIntroBodyDirect(bodyProgress);
          }

          if (scrollCount % 20 === 0) {
            console.log(
              `🎬 Intro: ${(overallProgress * 100).toFixed(0)}% - Header: ${
                overallProgress <= 0.5
                  ? ((overallProgress / 0.5) * 100).toFixed(0)
                  : 100
              }% - Body: ${
                overallProgress > 0.5
                  ? (((overallProgress - 0.5) / 0.5) * 100).toFixed(0)
                  : 0
              }%`
            );
          }
        } else {
          // Section not visible - reset
          animateIntroHeaderDirect(0);
          animateIntroBodyDirect(0);
        }
      }
    });
  } // End of manual intro animations block

  // Setup scroll event listeners for home section
  window.addEventListener("scroll", handleScroll);

  // Animation loop for smooth scrolling in POV
  function smoothScrollLoop() {
    // ALWAYS check POV section - handle activation/deactivation + smooth scrolling
    const povSection = document.querySelector(".sc--pov") as HTMLElement;
    if (povSection) {
      const rect = povSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionTop = rect.top;
      const sectionHeight = rect.height;

      // Calculate progress within POV section
      const animationBuffer = windowHeight * 0.3;
      const totalAnimationHeight = sectionHeight + animationBuffer;

      if (
        sectionTop <= windowHeight &&
        sectionTop + sectionHeight >= -animationBuffer
      ) {
        // POV section is in view - calculate progress
        const scrolledIntoSection = Math.max(0, -sectionTop);
        const rawProgress = Math.min(
          1,
          scrolledIntoSection / totalAnimationHeight
        );

        // Start POV animation if not already active and we're in correct state
        if (
          !povAnimationState.isActive &&
          rawProgress > 0 &&
          (currentAnimationState === "SCROLL_ANIMATION" ||
            currentAnimationState === "HOME")
        ) {
          povAnimationState.isActive = true;
          onPOVAnimationStart();
        }

        // Update POV animation with SMOOTH progress
        if (povAnimationState.isActive) {
          // Use direct progress for precise trigger control
          updatePOVAnimation(rawProgress);
        }
      } else {
        // POV section is out of view - end animation
        if (povAnimationState.isActive) {
          povAnimationState.isActive = false;
          onPOVAnimationEnd();
        }
      }
    }

    requestAnimationFrame(smoothScrollLoop);
  }

  // Start the animation loop
  smoothScrollLoop();
}

// Fallback scroll handler for POV if GSAP fails
function setupFallbackPOVScroll() {
  window.addEventListener("scroll", handlePOVScroll);
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

  // Setup scroll triggers
  setupScrollTriggers();

  animate();

  // Initialize POV Animation System
  initializePOVAnimation();
}

// Export functions for external use
export {
  moveGhostOnCurve,
  captureGhostPositions,
  createBezierCurves,
  captureOriginalHomePositions,
};

/*------------------
POV Animation System
------------------*/

// POV Path Points (from backup.js)
const cameraPOVPathPoints = [
  {
    pos: new THREE.Vector3(0.55675, 0.8, 0.45175),
    type: "curve",
    curveType: "forwardDownArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 0.6025),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.607, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.85375), type: "straight" },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.15525),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.9085, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(0.808, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.15525), type: "straight" },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.7075, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.205, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.205, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(0.5065, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 1.306),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.44825, 1, 2.0095), type: "straight" },
];

const ghost1POVPathPoints = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "straight" },
];

const ghost2POVPathPoints = [
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.009, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.05475), type: "straight" },
];

const ghost3POVPathPoints = [
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.95425),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.406, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.0045), type: "straight" },
];

const ghost4POVPathPoints = [
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.05475),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.3055, 0.55, 1.0045), type: "straight" },
];

const ghost5POVPathPoints = [
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "straight" },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 1.25575),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.2055), type: "straight" },
];

// POV Path creation function
function createPOVPath(pathPoints: any[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.type === "straight") {
      const line = new THREE.LineCurve3(current.pos, next.pos);
      path.add(line);
    } else if (current.type === "curve") {
      let midPoint: THREE.Vector3;
      if (current.curveType === "upperArc") {
        midPoint = new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
      } else if (current.curveType === "lowerArc") {
        midPoint = new THREE.Vector3(next.pos.x, current.pos.y, current.pos.z);
      } else if (current.curveType === "forwardDownArc") {
        midPoint = new THREE.Vector3(current.pos.x, next.pos.y, current.pos.z);
      } else {
        midPoint = new THREE.Vector3(
          (current.pos.x + next.pos.x) / 2,
          (current.pos.y + next.pos.y) / 2,
          (current.pos.z + next.pos.z) / 2
        );
      }
      const curve = new THREE.QuadraticBezierCurve3(
        current.pos,
        midPoint,
        next.pos
      );
      path.add(curve);
    }
  }
  return path;
}

// POV Animation State
interface POVAnimationState {
  isActive: boolean;
  cameraPOVPath: THREE.CurvePath<THREE.Vector3> | null;
  ghostPOVPaths: { [key: string]: THREE.CurvePath<THREE.Vector3> };
  triggerPositions: { [key: string]: any };
  previousCameraPosition: THREE.Vector3 | null;
  startRotationPoint: THREE.Vector3;
  endRotationPoint: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  finalLookAt: THREE.Vector3;
  rotationStarted: boolean;
  cachedStartYAngle: number | null;
  // MOMENTUM-BASED SCRUBBING
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
  startRotationPoint: new THREE.Vector3(0.55675, 0.55, 1.306),
  endRotationPoint: new THREE.Vector3(-0.14675, 1, 1.8085),
  targetLookAt: new THREE.Vector3(0.55675, 1, 1.306), // Look straight up
  finalLookAt: new THREE.Vector3(-0.14675, 0, 1.8085),
  rotationStarted: false,
  cachedStartYAngle: null,
  // MOMENTUM-BASED SCRUBBING
  smoothedProgress: 0,
  targetProgress: 0,
  velocity: 0,
  lastTargetProgress: 0,
  lastTime: 0,
};

// ==========================================
// 🎛️ SMOOTHING CONTROLS - UNIFIED LIGHT DAMPING:
// ==========================================
// Alle Werte sind jetzt auf 0.2 für einheitliche leichte Abfederung:
// 1. Kamera-Rotation: Zeile ~1365 "CAMERA_ROTATION_SMOOTHING"
// 2. Scroll-Smoothing: Zeile ~2275 "scrollSmoothingFactor"
// 3. Visual-Smoothing: Zeile ~1620 "smoothingFactor"
// Empfohlen: 0.1 (stark) bis 0.3 (schwach) für leichte Abfederung
// ==========================================

// POV Camera Smoothing State - GENTLER SETTINGS
let previousCameraRotation: THREE.Quaternion | null = null;
const CAMERA_ROTATION_SMOOTHING = 0.2; // Light damping effect for rotation (was 0.08)
const MAX_ROTATION_SPEED = Math.PI / 12; // Slower max rotation (15° per frame, was 30°)
const LOOK_AHEAD_DISTANCE = 0.01; // Smaller look-ahead for less jitter (was 0.02)

// POV Text Animation Constants - Faster fade in/out, more time at full opacity
const GHOST_TEXT_START = 0.1; // Faster fade in (was 0.2)
const CAM_TEXT_START = 0.15; // Faster fade in (was 0.3)
const FADE_OUT_START = 0.85; // Later fade out for more full opacity time (was 0.8)
const FADE_IN_DURATION = 0.1; // Quick fade in over 10% of range
const FADE_OUT_DURATION = 0.15; // Quick fade out over 15% of range
const TRIGGER_DISTANCE = 0.02;

// Get parent elements for POV triggers
const parentElements = document.querySelectorAll(".cmp--pov.cmp");

const backupTriggerPositions = {
  ghost1: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    camTextPos: new THREE.Vector3(0.75775, 0.55, 0.8035),
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
    parent: parentElements[0] || null,
    active: false,
  },
  ghost2: {
    triggerPos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    ghostTextPos: new THREE.Vector3(0.95875, 0.55, 0.85375),
    camTextPos: new THREE.Vector3(0.95875, 0.55, 0.904),
    endPosition: new THREE.Vector3(0.95875, 0.55, 1.0045),
    parent: parentElements[1] || null,
    active: false,
  },
  ghost3: {
    triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
    parent: parentElements[2] || null,
    active: false,
  },
  ghost4: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    ghostTextPos: new THREE.Vector3(0.5065, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.45625, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
    parent: parentElements[3] || null,
    active: false,
  },
  ghost5: {
    triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    ghostTextPos: new THREE.Vector3(0.205, 0.55, 1.2055),
    camTextPos: new THREE.Vector3(0.25525, 0.55, 1.2055),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
    parent: parentElements[4] || null,
    active: false,
  },
};

// Initialize POV Animation System
function initializePOVAnimation() {
  // Create camera POV path
  povAnimationState.cameraPOVPath = createPOVPath(cameraPOVPathPoints);

  // Create ghost POV paths
  povAnimationState.ghostPOVPaths = {
    ghost1: createPOVPath(ghost1POVPathPoints),
    ghost2: createPOVPath(ghost2POVPathPoints),
    ghost3: createPOVPath(ghost3POVPathPoints),
    ghost4: createPOVPath(ghost4POVPathPoints),
    ghost5: createPOVPath(ghost5POVPathPoints),
  };

  // Initialize trigger positions
  povAnimationState.triggerPositions = {
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

  // POV animation will be handled by handlePOVScroll in setupScrollTriggers
}

// POV animation is now handled by handlePOVScroll function in setupScrollTriggers

// POV Animation Start Handler
function onPOVAnimationStart() {
  // Switch to POV state
  currentAnimationState = "POV_ANIMATION";

  // Initialize previous camera position
  if (povAnimationState.cameraPOVPath) {
    povAnimationState.previousCameraPosition =
      povAnimationState.cameraPOVPath.getPointAt(0);
  }

  // Reset rotation state
  povAnimationState.rotationStarted = false;
  povAnimationState.cachedStartYAngle = null;

  // Reset smooth camera rotation state
  previousCameraRotation = null;

  // CRITICAL: Set camera to look straight up at POV start
  if (povAnimationState.cameraPOVPath && camera) {
    const startPosition = povAnimationState.cameraPOVPath.getPointAt(0);
    camera.position.copy(startPosition);

    // Create 45° forward-up look direction (sanfter als direkt nach oben)
    const forwardVector = new THREE.Vector3(0, 0, 1); // Forward (positive Z)
    const upVector = new THREE.Vector3(0, 1, 0); // Up
    const forwardUpDirection = new THREE.Vector3()
      .addVectors(forwardVector, upVector)
      .normalize();

    const lookAtPoint = startPosition.clone().add(forwardUpDirection);
    camera.lookAt(lookAtPoint);
  }

  // Make sure pacman is visible
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  // Make sure all ghosts are visible for POV animation
  Object.entries(ghosts).forEach(([ghostKey, ghost]) => {
    if (ghostKey !== "pacman") {
      ghost.visible = true;
    }
  });

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.povAnimationActive = true;
  }
}

// DEPRECATED: GSAP handles all smoothing now
function applyMomentumScrubbing_DEPRECATED(targetProgress: number): number {
  const currentTime = performance.now() / 1000; // Current time in seconds

  // Initialize on first run
  if (povAnimationState.lastTime === 0) {
    povAnimationState.lastTime = currentTime;
    povAnimationState.lastTargetProgress = targetProgress;
    povAnimationState.smoothedProgress = targetProgress;
    return targetProgress;
  }

  const deltaTime = currentTime - povAnimationState.lastTime;

  // Calculate input velocity (how fast user is scrolling)
  const inputVelocity =
    (targetProgress - povAnimationState.lastTargetProgress) /
    Math.max(deltaTime, 0.001);

  // SCRUB SETTINGS - Adjust these for different feels:
  const friction = 0.85; // Higher = more momentum (0.8-0.95)
  const responsiveness = 0.15; // Higher = more responsive (0.05-0.3)
  const maxVelocity = 2.0; // Maximum velocity cap

  // Apply friction to current velocity
  povAnimationState.velocity *= friction;

  // Add input influence based on difference and input velocity
  const progressDiff = targetProgress - povAnimationState.smoothedProgress;
  const velocityInfluence = inputVelocity * 0.1; // How much input velocity affects our velocity

  // Update velocity with responsiveness and input influence
  povAnimationState.velocity +=
    progressDiff * responsiveness + velocityInfluence;

  // Cap velocity to prevent overshoot
  povAnimationState.velocity = Math.max(
    -maxVelocity,
    Math.min(maxVelocity, povAnimationState.velocity)
  );

  // Apply velocity to position
  povAnimationState.smoothedProgress += povAnimationState.velocity * deltaTime;

  // Clamp to valid range
  povAnimationState.smoothedProgress = Math.max(
    0,
    Math.min(1, povAnimationState.smoothedProgress)
  );

  // Update tracking variables
  povAnimationState.lastTargetProgress = targetProgress;
  povAnimationState.lastTime = currentTime;

  const lag = targetProgress - povAnimationState.smoothedProgress;

  return povAnimationState.smoothedProgress;
}

// Update POV Animation - Balanced approach: Direct triggers, smooth visuals
function updatePOVAnimation(progress: number) {
  if (!povAnimationState.cameraPOVPath || !povAnimationState.isActive) return;

  // Apply LIGHT smoothing for visual movement, but keep triggers precise
  const visualProgress = applyLightVisualSmoothing(progress);

  // Update camera with smoothed progress for fluid movement
  updatePOVCamera(visualProgress);

  // Update ghosts with DIRECT progress for precise triggering
  updatePOVGhosts(progress); // Direct for triggers

  // Update texts with DIRECT progress for precise timing
  updatePOVTexts(progress); // Direct for text timing
}

// Light visual smoothing - only for camera movement smoothness
function applyLightVisualSmoothing(targetProgress: number): number {
  const currentTime = performance.now() / 1000;

  // Initialize smoothing state if not exists
  if (typeof (applyLightVisualSmoothing as any).lastTime === "undefined") {
    (applyLightVisualSmoothing as any).lastTime = currentTime;
    (applyLightVisualSmoothing as any).smoothedProgress = targetProgress;
    return targetProgress;
  }

  const deltaTime = Math.max(
    currentTime - (applyLightVisualSmoothing as any).lastTime,
    0.001
  );

  // Light consistent smoothing to match rotation smoothing
  const smoothingFactor = 0.2; // Light damping effect (matches camera rotation)

  // Direct interpolation instead of velocity-based approach
  const diff =
    targetProgress - (applyLightVisualSmoothing as any).smoothedProgress;

  // Simple consistent lerp - same approach as rotation
  (applyLightVisualSmoothing as any).smoothedProgress += diff * smoothingFactor;
  (applyLightVisualSmoothing as any).smoothedProgress = Math.max(
    0,
    Math.min(1, (applyLightVisualSmoothing as any).smoothedProgress)
  );

  (applyLightVisualSmoothing as any).lastTime = currentTime;

  return (applyLightVisualSmoothing as any).smoothedProgress;
}

// Update POV Camera
function updatePOVCamera(progress: number) {
  if (!povAnimationState.cameraPOVPath || !camera) return;

  const cameraPosition = povAnimationState.cameraPOVPath.getPointAt(progress);
  camera.position.copy(cameraPosition);

  // Handle camera rotation based on progress - improved end sequence
  const rotationStartingPoint = 0.95; // Start rotation earlier for smoother transition

  if (progress >= rotationStartingPoint && !povAnimationState.rotationStarted) {
    povAnimationState.rotationStarted = true;
    const lookAtPoint = getCameraLookAtPoint();
    povAnimationState.cachedStartYAngle = Math.atan2(
      lookAtPoint.x - camera.position.x,
      lookAtPoint.z - camera.position.z
    );
  }

  if (progress < rotationStartingPoint) {
    // Before rotation phase - 2-phase camera transition: 45° up to tangent look

    // Calculate progress for transition point - use first third of path for transition
    const totalPoints = cameraPOVPathPoints.length;
    const transitionEndProgress = 2 / (totalPoints - 1); // Transition until point 2

    if (progress < transitionEndProgress) {
      // Phase 1: Transition from 45° up to tangent direction
      const transitionProgress = progress / transitionEndProgress; // 0 to 1 during transition
      const smoothTransition = smoothStep(transitionProgress);

      const forwardVector = new THREE.Vector3(0, 0, 1); // Forward (positive Z)
      const upVector = new THREE.Vector3(0, 1, 0); // Up

      // 45° forward-up direction
      const forwardUpDirection = new THREE.Vector3()
        .addVectors(forwardVector, upVector)
        .normalize();

      // Get tangent direction for target
      const forwardTangent = getSmoothCameraTangent(progress);

      // Interpolate from 45° up directly to tangent direction
      const lookAtDirection = new THREE.Vector3()
        .addVectors(
          forwardUpDirection.multiplyScalar(1.0 - smoothTransition),
          forwardTangent.multiplyScalar(smoothTransition)
        )
        .normalize();

      const lookAtPoint = camera.position.clone().add(lookAtDirection);
      applySmoothCameraRotation(lookAtPoint);
    } else {
      // Phase 2: Normal tangent-looking camera behavior (after transition)
      const smoothedTangent = getSmoothCameraTangent(progress);
      const lookAtPoint = camera.position.clone().add(smoothedTangent);
      applySmoothCameraRotation(lookAtPoint);
    }
  } else {
    // End sequence rotation - smoother transition to look at maze exit
    const rotationProgress =
      (progress - rotationStartingPoint) / (1 - rotationStartingPoint);

    // Use a smoother easing function for the end rotation
    const smoothProgress = easeInOutCubic(rotationProgress);

    // Calculate the maze exit point (where the camera path ends)
    const mazeExitPoint = new THREE.Vector3(-0.44825, 0.5, 2.0095); // Slightly lower Y for better framing

    // Interpolate between current tangent direction and maze exit
    const currentTangent = getSmoothCameraTangent(rotationStartingPoint);
    const currentLookAt = camera.position.clone().add(currentTangent);

    const finalLookAt = mazeExitPoint;

    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      currentLookAt,
      finalLookAt,
      smoothProgress
    );

    applySmoothCameraRotation(interpolatedLookAt);
  }

  // Store previous position
  if (povAnimationState.previousCameraPosition) {
    povAnimationState.previousCameraPosition.copy(cameraPosition);
  }
}

// Get smoothed tangent for camera movement - optimized for straight movement in corners
function getSmoothCameraTangent(progress: number): THREE.Vector3 {
  if (!povAnimationState.cameraPOVPath) return new THREE.Vector3(0, 0, -1);

  // Get current tangent
  const currentTangent = povAnimationState.cameraPOVPath
    .getTangentAt(progress)
    .normalize();

  // Get look-ahead tangent for smoothing
  const lookAheadProgress = Math.min(progress + LOOK_AHEAD_DISTANCE, 1);
  const lookAheadTangent = povAnimationState.cameraPOVPath
    .getTangentAt(lookAheadProgress)
    .normalize();

  // Get look-behind tangent for more context
  const lookBehindProgress = Math.max(progress - LOOK_AHEAD_DISTANCE, 0);
  const lookBehindTangent = povAnimationState.cameraPOVPath
    .getTangentAt(lookBehindProgress)
    .normalize();

  // Calculate average tangent for smoothing
  const averageTangent = new THREE.Vector3()
    .addVectors(lookBehindTangent, currentTangent)
    .add(lookAheadTangent)
    .divideScalar(3)
    .normalize();

  // Detect sharp turns: if current and look-ahead have very different directions
  const dotProduct = currentTangent.dot(lookAheadTangent);
  const isSharpTurn = dotProduct < 0.3; // Sharp turn detection
  const isModerateTurn = dotProduct < 0.7; // Moderate turn detection

  if (isSharpTurn) {
    // For sharp turns (hin-und-her), EXTREMELY favor straight movement
    return new THREE.Vector3()
      .addVectors(
        currentTangent.multiplyScalar(0.1), // VERY little current direction
        averageTangent.multiplyScalar(0.9) // VERY strong averaged direction
      )
      .normalize();
  } else if (isModerateTurn) {
    // For moderate turns, use very strong smoothing
    return new THREE.Vector3()
      .addVectors(
        currentTangent.multiplyScalar(0.2), // Less current direction
        averageTangent.multiplyScalar(0.8) // More averaged direction
      )
      .normalize();
  } else {
    // For straight sections, use light smoothing
    return new THREE.Vector3()
      .addVectors(
        currentTangent.multiplyScalar(0.8),
        averageTangent.multiplyScalar(0.2)
      )
      .normalize();
  }
}

// Apply smooth camera rotation with dynamic smoothing based on scroll speed
function applySmoothCameraRotation(targetLookAt: THREE.Vector3) {
  if (!camera) return;

  // Calculate target rotation
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.lookAt(camera.position, targetLookAt, camera.up);
  const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    tempMatrix
  );

  if (!previousCameraRotation) {
    // First frame - set rotation directly
    camera.quaternion.copy(targetQuaternion);
    previousCameraRotation = targetQuaternion.clone();
    return;
  }

  // Calculate rotation difference
  const angleDifference = camera.quaternion.angleTo(targetQuaternion);

  // ENHANCED SMOOTHING: Extra smooth for end sequence
  let dynamicSmoothing = CAMERA_ROTATION_SMOOTHING;

  // Check if we're in the end sequence (camera near maze exit)
  const isNearExit = camera.position.z > 1.8; // Near the end of the path

  if (isNearExit) {
    // Extra smooth rotation for end sequence
    dynamicSmoothing = 0.1; // Much smoother for the final turn
  } else if (angleDifference > Math.PI / 8) {
    // > 22.5° = sharp corner - still light smoothing
    dynamicSmoothing = CAMERA_ROTATION_SMOOTHING * 0.8; // Light smoothing for corners
  } else if (angleDifference > Math.PI / 16) {
    // > 11.25° = moderate corner - very light smoothing
    dynamicSmoothing = CAMERA_ROTATION_SMOOTHING * 0.9; // Very light smoothing for moderate turns
  }

  // Always apply smoothing (no speed limiting - causes jumps)
  const smoothedQuaternion = new THREE.Quaternion();
  smoothedQuaternion.slerpQuaternions(
    camera.quaternion,
    targetQuaternion,
    dynamicSmoothing
  );
  camera.quaternion.copy(smoothedQuaternion);

  // Store for next frame
  previousCameraRotation.copy(camera.quaternion);
}

// Update POV Ghosts with enhanced triggering (from backup.js) - ONLY during active POV
function updatePOVGhosts(progress: number) {
  if (!povAnimationState.cameraPOVPath || !povAnimationState.isActive) return;

  const cameraPosition = povAnimationState.cameraPOVPath.getPointAt(progress);

  // Update each ghost using enhanced logic
  Object.entries(ghosts).forEach(([ghostKey, ghost]) => {
    if (ghostKey === "pacman") {
      // Pacman stays hidden during POV animation
      ghost.visible = false;
      return;
    }

    // Use the ghost key directly since that's how paths are stored
    if (povAnimationState.ghostPOVPaths[ghostKey]) {
      updateGhostInPOV(ghostKey, ghost, ghostKey, cameraPosition);
    }
  });
}

// Update POV Text Animations
function updatePOVTexts(progress: number) {
  if (!povAnimationState.cameraPOVPath) return;

  const cameraPosition = povAnimationState.cameraPOVPath.getPointAt(progress);

  Object.entries(povAnimationState.triggerPositions).forEach(
    ([key, trigger]) => {
      const currentCameraProgress =
        findClosestProgressOnPOVPath(cameraPosition);

      // Calculate trigger positions on camera path
      if (!trigger.triggerCameraProgress) {
        trigger.triggerCameraProgress = findClosestProgressOnPOVPath(
          trigger.triggerPos
        );
        trigger.ghostTextCameraProgress = findClosestProgressOnPOVPath(
          trigger.ghostTextPos
        );
        trigger.camTextCameraProgress = findClosestProgressOnPOVPath(
          trigger.camTextPos
        );
        trigger.endCameraProgress = findClosestProgressOnPOVPath(
          trigger.endPosition
        );
      }

      // Calculate text opacities
      let targetGhostOpacity = 0;
      let targetCamOpacity = 0;

      if (currentCameraProgress >= trigger.triggerCameraProgress) {
        // BACKUP.JS EXACT LOGIC: Use actual section length for calculations
        const sectionLength =
          trigger.endCameraProgress - trigger.triggerCameraProgress;

        // Ghost Text Animation (backup.js style)
        const fadeInStart = trigger.ghostTextCameraProgress;
        const fadeInEnd = fadeInStart + sectionLength * 0.07; // 7% for fade in
        const stayVisibleUntil =
          trigger.endCameraProgress - sectionLength * 0.15; // Stay visible until 85%
        const fadeOutEnd = trigger.endCameraProgress;

        if (
          currentCameraProgress >= fadeInStart &&
          currentCameraProgress < fadeInEnd
        ) {
          // Einblendphase
          const fadeProgress =
            (currentCameraProgress - fadeInStart) / (fadeInEnd - fadeInStart);
          targetGhostOpacity = fadeProgress;
        } else if (
          currentCameraProgress >= fadeInEnd &&
          currentCameraProgress < stayVisibleUntil
        ) {
          // Voll sichtbare Phase
          targetGhostOpacity = 1.0;
        } else if (
          currentCameraProgress >= stayVisibleUntil &&
          currentCameraProgress <= fadeOutEnd
        ) {
          // Ausblendphase
          const fadeProgress =
            (currentCameraProgress - stayVisibleUntil) /
            (fadeOutEnd - stayVisibleUntil);
          targetGhostOpacity = 1.0 - fadeProgress;
        }

        // Cam Text Animation (backup.js style with max 0.8 opacity)
        if (currentCameraProgress >= trigger.camTextCameraProgress) {
          const camFadeInStart = trigger.camTextCameraProgress;
          const camFadeInEnd = camFadeInStart + sectionLength * 0.07;
          const camStayVisibleUntil = stayVisibleUntil; // Same as ghost

          if (
            currentCameraProgress >= camFadeInStart &&
            currentCameraProgress < camFadeInEnd
          ) {
            // Einblendphase
            const fadeProgress =
              (currentCameraProgress - camFadeInStart) /
              (camFadeInEnd - camFadeInStart);
            targetCamOpacity = fadeProgress * 0.8; // Maximale Opazität 0.8
          } else if (
            currentCameraProgress >= camFadeInEnd &&
            currentCameraProgress < camStayVisibleUntil
          ) {
            // Voll sichtbare Phase
            targetCamOpacity = 0.8;
          } else if (
            currentCameraProgress >= camStayVisibleUntil &&
            currentCameraProgress <= fadeOutEnd
          ) {
            // Ausblendphase
            const fadeProgress =
              (currentCameraProgress - camStayVisibleUntil) /
              (fadeOutEnd - camStayVisibleUntil);
            targetCamOpacity = 0.8 * (1.0 - fadeProgress);
          }
        }
      }

      // BACKUP.JS EXACT SMOOTH INTERPOLATION
      const fadeInSpeed = 0.2; // Schnelleres Einblenden
      const fadeOutSpeed = 0.1; // Langsameres Ausblenden

      // Update Ghost-Text Opazität
      if (targetGhostOpacity > trigger.ghostTextOpacity) {
        trigger.ghostTextOpacity +=
          (targetGhostOpacity - trigger.ghostTextOpacity) * fadeInSpeed;
      } else {
        trigger.ghostTextOpacity +=
          (targetGhostOpacity - trigger.ghostTextOpacity) * fadeOutSpeed;
      }

      // Update CAM-Text Opazität
      if (targetCamOpacity > trigger.camTextOpacity) {
        trigger.camTextOpacity +=
          (targetCamOpacity - trigger.camTextOpacity) * fadeInSpeed;
      } else {
        trigger.camTextOpacity +=
          (targetCamOpacity - trigger.camTextOpacity) * fadeOutSpeed;
      }

      // Update DOM elements
      updatePOVTextElements(trigger);
    }
  );
}

// Update POV Text DOM Elements
function updatePOVTextElements(trigger: any) {
  if (!trigger.parent) return;

  const ghostText = trigger.parent.querySelector(".cmp--pov-ghost");
  const camText = trigger.parent.querySelector(".cmp--pov-cam");

  if (ghostText) {
    // BACKUP.JS EXACT ROUNDING: Opazitätswerte abrunden
    const ghostOpacity = Math.max(
      0,
      Math.min(1, Math.round(trigger.ghostTextOpacity * 1000) / 1000)
    );

    if (ghostOpacity > 0.01) {
      if (ghostText.classList.contains("hidden")) {
        ghostText.classList.remove("hidden");
      }
      ghostText.style.opacity = ghostOpacity.toString();
    } else if (
      ghostOpacity <= 0.01 &&
      !ghostText.classList.contains("hidden")
    ) {
      ghostText.classList.add("hidden");
      ghostText.style.opacity = "0";
    }
  }

  if (camText) {
    // BACKUP.JS EXACT ROUNDING: Opazitätswerte abrunden
    const camOpacity = Math.max(
      0,
      Math.min(1, Math.round(trigger.camTextOpacity * 1000) / 1000)
    );

    if (camOpacity > 0.01) {
      if (camText.classList.contains("hidden")) {
        camText.classList.remove("hidden");
      }
      camText.style.opacity = camOpacity.toString();
    } else if (camOpacity <= 0.01 && !camText.classList.contains("hidden")) {
      camText.classList.add("hidden");
      camText.style.opacity = "0";
    }
  }
}

// Find closest progress on POV path
function findClosestProgressOnPOVPath(
  targetPoint: THREE.Vector3,
  samples: number = 2000
): number {
  if (!povAnimationState.cameraPOVPath) return 0;

  let closestProgress = 0;
  let closestDistance = Infinity;

  for (let i = 0; i <= samples; i++) {
    const progress = i / samples;
    const point = povAnimationState.cameraPOVPath.getPointAt(progress);
    const distance = point.distanceTo(targetPoint);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestProgress = progress;
    }
  }

  return closestProgress;
}

// POV Animation End Handler
function onPOVAnimationEnd() {
  // After POV animation, we want to maintain the scroll animation state
  // so the camera stays at its last scroll position and FOV returns to original
  currentAnimationState = "SCROLL_ANIMATION";

  // Reset all POV text elements
  Object.values(povAnimationState.triggerPositions).forEach((trigger: any) => {
    if (trigger.parent) {
      trigger.parent.classList.add("hidden");
      trigger.parent.style.opacity = "0";

      const ghostText = trigger.parent.querySelector(".cmp--pov-ghost");
      const camText = trigger.parent.querySelector(".cmp--pov-cam");

      if (ghostText) {
        ghostText.classList.add("hidden");
        ghostText.style.opacity = "0";
      }

      if (camText) {
        camText.classList.add("hidden");
        camText.style.opacity = "0";
      }
    }

    // Reset trigger state
    trigger.active = false;
    trigger.ghostTextOpacity = 0;
    trigger.camTextOpacity = 0;
  });

  // Restore ghosts to their home positions
  restoreGhostsToHomePositions();

  // CRITICAL: Properly restore pacman and home animation state
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghosts[ghostKey] && originalHomeScales[ghostKey]) {
      const wasVisible = ghosts[ghostKey].visible;
      ghosts[ghostKey].visible = true;

      // CRITICAL: Reset scale to ORIGINAL scale (not 1,1,1)
      ghosts[ghostKey].scale.copy(originalHomeScales[ghostKey]);

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

  // Check current scroll position to determine correct state
  const homeSection = document.querySelector(".sc--home") as HTMLElement;
  if (homeSection) {
    const rect = homeSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // If we're back in HOME section area, switch to HOME state
    if (rect.top <= windowHeight && rect.bottom >= 0) {
      currentAnimationState = "HOME";

      // FORCE restart HOME animation timing
      animationStartTime = Date.now();
      timeOffset = 0;
      pauseTime = 0;
    } else {
      currentAnimationState = "SCROLL_ANIMATION";
    }
  }

  // FORCE all ghosts visible one more time after state change AND restore scales
  setTimeout(() => {
    Object.keys(ghosts).forEach((ghostKey) => {
      if (ghosts[ghostKey] && originalHomeScales[ghostKey]) {
        const wasVisible = ghosts[ghostKey].visible;
        ghosts[ghostKey].visible = true;
        ghosts[ghostKey].scale.copy(originalHomeScales[ghostKey]); // ENSURE correct scale
      }
    });
  }, 100); // Small delay to ensure state change is complete

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.povAnimationActive = false;
  }

  // Reset smooth camera rotation state
  previousCameraRotation = null;
}

// Restore ghosts to ORIGINAL home positions with FORCE visibility
function restoreGhostsToHomePositions() {
  // Use ORIGINAL home positions, not captured scroll positions
  Object.entries(originalHomePositions).forEach(
    ([ghostKey, originalPosition]: [string, any]) => {
      const ghost = ghosts[ghostKey];
      const originalRotation = originalHomeRotations[ghostKey];
      const originalScale = originalHomeScales[ghostKey];

      if (ghost && originalPosition && originalRotation && originalScale) {
        ghost.position.copy(originalPosition);
        ghost.rotation.copy(originalRotation);
        ghost.scale.copy(originalScale); // CRITICAL: Restore original scale (especially for Pacman: 0.05)

        // FORCE visibility - super important!
        ghost.visible = true;

        // Reset material opacity with better handling
        if (ghost instanceof THREE.Mesh && ghost.material) {
          if (Array.isArray(ghost.material)) {
            ghost.material.forEach((mat) => {
              if ("opacity" in mat) mat.opacity = 1;
            });
          } else if ("opacity" in ghost.material) {
            ghost.material.opacity = 1;
          }
        } else if (ghost instanceof THREE.Group) {
          ghost.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                  if ("opacity" in mat) mat.opacity = 1;
                });
              } else if ("opacity" in child.material) {
                child.material.opacity = 1;
              }
            }
          });
        } else if ((ghost as any).material) {
          // Handle the case where ghost.material exists but isn't typed
          (ghost as any).material.opacity = 1;
        }
      }
    }
  );
}

// Get camera look-at point (from backup.js)
function getCameraLookAtPoint(): THREE.Vector3 {
  if (!camera) return new THREE.Vector3();

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

// Handle POV scroll events - DIRECT control for precise triggering
function handlePOVScroll() {
  const povSection = document.querySelector(".sc--pov") as HTMLElement;
  if (!povSection) return;

  const rect = povSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Calculate if POV section is in view with buffer zone
  const sectionTop = rect.top;
  const sectionHeight = rect.height;

  // Reduced buffer zone for more responsive control
  const animationBuffer = windowHeight * 0.1; // 10% buffer for POV (was 30%)
  const totalAnimationHeight = sectionHeight + animationBuffer;

  if (
    sectionTop <= windowHeight &&
    sectionTop + sectionHeight >= -animationBuffer
  ) {
    // Section is in view (including buffer zone) - calculate progress
    const scrolledIntoSection = Math.max(0, -sectionTop);
    const rawProgress = Math.min(1, scrolledIntoSection / totalAnimationHeight);

    // Apply very light scroll smoothing to avoid jerkiness while keeping triggers precise
    let progress = rawProgress;
    if (typeof (handlePOVScroll as any).lastProgress === "undefined") {
      (handlePOVScroll as any).lastProgress = rawProgress;
    }

    // Light consistent smoothing - same approach as camera position/rotation
    const scrollSmoothingFactor = 0.2; // Light damping effect (matches camera)
    const diff = rawProgress - (handlePOVScroll as any).lastProgress;
    progress =
      (handlePOVScroll as any).lastProgress + diff * scrollSmoothingFactor;
    (handlePOVScroll as any).lastProgress = progress;

    // Start POV animation if not already active and we're in SCROLL_ANIMATION or HOME state
    if (
      !povAnimationState.isActive &&
      progress > 0 &&
      (currentAnimationState === "SCROLL_ANIMATION" ||
        currentAnimationState === "HOME")
    ) {
      povAnimationState.isActive = true;
      onPOVAnimationStart();
    }

    // Update POV animation with direct progress for triggers, smoothed for visuals
    if (povAnimationState.isActive) {
      // Use raw progress for trigger detection, smoothed for camera movement
      updatePOVAnimation(progress); // Direct progress ensures triggers fire correctly
    }
  } else {
    // Section is out of view (beyond buffer zone) - end POV animation
    if (povAnimationState.isActive) {
      povAnimationState.isActive = false;
      onPOVAnimationEnd();
    }
  }
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

// Complete POV ghost triggering system from backup.js
function updateGhostInPOV(
  ghostKey: string,
  ghost: THREE.Object3D,
  pathKey: string,
  cameraPosition: THREE.Vector3
) {
  if (!pathKey || !povAnimationState.ghostPOVPaths[pathKey]) return;

  const path = povAnimationState.ghostPOVPaths[pathKey];
  if (!path) return;

  // Check if ghost has trigger position
  if (ghostKey in povAnimationState.triggerPositions) {
    const trigger = povAnimationState.triggerPositions[ghostKey];
    const { triggerPos, ghostTextPos, camTextPos, endPosition, parent } =
      trigger;

    if (!triggerPos || !endPosition) return;

    const ghostText = parent as HTMLElement; // In backup.js, parent IS the ghost text
    const camText = parent?.querySelector(".cmp--pov-cam") as HTMLElement;

    ghost.scale.set(0.5, 0.5, 0.5);

    // Initialize ghost trigger state if not done already
    if (trigger.hasBeenTriggered === undefined) {
      trigger.hasBeenTriggered = false;
      trigger.hasBeenDeactivated = false;
      trigger.triggerCameraProgress = null;
      trigger.ghostTextCameraProgress = null;
      trigger.camTextCameraProgress = null;
      trigger.endCameraProgress = null;
      trigger.currentPathT = 0;
      trigger.ghostTextOpacity = 0;
      trigger.camTextOpacity = 0;
      trigger.lastProgress = 0;

      // Make ghost and text invisible initially
      ghost.visible = false;
      if (ghostText) {
        ghostText.classList.add("hidden");
        ghostText.style.opacity = "0";
      }
      if (camText) {
        camText.classList.add("hidden");
        camText.style.opacity = "0";
      }
    }

    // Get current camera progress on POV path (HIGH SAMPLES for smooth animation)
    const currentCameraProgress = findClosestProgressOnPOVPath(
      cameraPosition,
      4000 // MUCH higher samples for smoother interpolation
    );

    // Calculate path positions if not done already (HIGH SAMPLES for precision)
    if (trigger.triggerCameraProgress === null) {
      trigger.triggerCameraProgress = findClosestProgressOnPOVPath(
        triggerPos,
        4000
      );
      trigger.ghostTextCameraProgress = ghostTextPos
        ? findClosestProgressOnPOVPath(ghostTextPos, 4000)
        : trigger.triggerCameraProgress;
      trigger.camTextCameraProgress = camTextPos
        ? findClosestProgressOnPOVPath(camTextPos, 4000)
        : trigger.ghostTextCameraProgress;
      trigger.endCameraProgress = findClosestProgressOnPOVPath(
        endPosition,
        4000
      );
    }

    const triggerProgress = trigger.triggerCameraProgress;
    const ghostTextProgress = trigger.ghostTextCameraProgress;
    const camTextProgress = trigger.camTextCameraProgress;
    const endProgress = trigger.endCameraProgress;

    // 1. Ghost visibility and position (EXACT backup.js logic)
    if (
      currentCameraProgress >= triggerProgress &&
      currentCameraProgress <= endProgress
    ) {
      // Make ghost visible if not already active
      if (!ghost.visible) {
        ghost.visible = true;
        trigger.hasBeenTriggered = true;
      }

      // Update ghost position
      const normalizedProgress =
        (currentCameraProgress - triggerProgress) /
        (endProgress - triggerProgress);
      let ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

      // SIMPLE: Use ghost progress directly (already globally smoothed)

      // Update ghost position
      const pathPoint = path.getPointAt(ghostProgress);
      ghost.position.copy(pathPoint);

      // Simple ghost orientation
      const tangent = path.getTangentAt(ghostProgress).normalize();
      const lookAtPoint = ghost.position.clone().add(tangent);
      ghost.lookAt(lookAtPoint);

      // Simple fade: Use ghostProgress directly for fade
      if (ghostProgress > 0.9) {
        const fadeOpacity = 1 - (ghostProgress - 0.9) / 0.1;
        (ghost as any).material.opacity = Math.max(0, Math.min(1, fadeOpacity));
      } else {
        (ghost as any).material.opacity = 1;
      }

      // Check if ghost actually has material and if it's working
      if (!(ghost as any).material) {
      } else if (typeof (ghost as any).material.opacity === "undefined") {
      }
    } else {
      // EXACT backup.js logic: Ghost invisible when outside range

      ghost.visible = false;
      trigger.hasBeenTriggered = false;
    }

    // 2. TEXT VISIBILITY: Adjusted timing ranges
    const sectionLength = endProgress - triggerProgress;

    // Text should appear later and stay visible longer
    const fadeIn = ghostTextProgress;
    const fadeInEnd = fadeIn + sectionLength * 0.07;
    const stayVisibleUntil = endProgress - sectionLength * 0.15;
    const fadeOutEnd = endProgress;

    // Calculate ghost text visibility
    let targetGhostOpacity = 0;
    if (currentCameraProgress >= fadeIn && currentCameraProgress < fadeInEnd) {
      const fadeProgress =
        (currentCameraProgress - fadeIn) / (fadeInEnd - fadeIn);
      targetGhostOpacity = fadeProgress;
    } else if (
      currentCameraProgress >= fadeInEnd &&
      currentCameraProgress < stayVisibleUntil
    ) {
      targetGhostOpacity = 1.0;
    } else if (
      currentCameraProgress >= stayVisibleUntil &&
      currentCameraProgress <= fadeOutEnd
    ) {
      const fadeProgress =
        (currentCameraProgress - stayVisibleUntil) /
        (fadeOutEnd - stayVisibleUntil);
      targetGhostOpacity = 1.0 - fadeProgress;
    }

    // Similar logic for CAM text, but slightly offset
    const camFadeIn = camTextProgress;
    const camFadeInEnd = camFadeIn + sectionLength * 0.07;

    let targetCamOpacity = 0;
    if (
      currentCameraProgress >= camFadeIn &&
      currentCameraProgress < camFadeInEnd
    ) {
      const fadeProgress =
        (currentCameraProgress - camFadeIn) / (camFadeInEnd - camFadeIn);
      targetCamOpacity = fadeProgress * 0.8; // Max opacity 0.8
    } else if (
      currentCameraProgress >= camFadeInEnd &&
      currentCameraProgress < stayVisibleUntil
    ) {
      targetCamOpacity = 0.8;
    } else if (
      currentCameraProgress >= stayVisibleUntil &&
      currentCameraProgress <= fadeOutEnd
    ) {
      const fadeProgress =
        (currentCameraProgress - stayVisibleUntil) /
        (fadeOutEnd - stayVisibleUntil);
      targetCamOpacity = 0.8 * (1.0 - fadeProgress);
    }

    // 3. OPACITY UPDATES
    const fadeInSpeed = 0.2; // Faster fade in
    const fadeOutSpeed = 0.1; // Slower fade out

    // Update ghost text opacity
    if (targetGhostOpacity > trigger.ghostTextOpacity) {
      trigger.ghostTextOpacity +=
        (targetGhostOpacity - trigger.ghostTextOpacity) * fadeInSpeed;
    } else {
      trigger.ghostTextOpacity +=
        (targetGhostOpacity - trigger.ghostTextOpacity) * fadeOutSpeed;
    }

    // Update CAM text opacity
    if (targetCamOpacity > trigger.camTextOpacity) {
      trigger.camTextOpacity +=
        (targetCamOpacity - trigger.camTextOpacity) * fadeInSpeed;
    } else {
      trigger.camTextOpacity +=
        (targetCamOpacity - trigger.camTextOpacity) * fadeOutSpeed;
    }

    // 4. DOM UPDATES
    const ghostTextOpacity = Math.max(
      0,
      Math.min(1, Math.round(trigger.ghostTextOpacity * 1000) / 1000)
    );
    const camTextOpacity = Math.max(
      0,
      Math.min(1, Math.round(trigger.camTextOpacity * 1000) / 1000)
    );

    // Debug text opacity calculations
    if (ghostTextOpacity > 0 || camTextOpacity > 0) {
    }

    // Update DOM only when necessary
    if (ghostText) {
      if (ghostTextOpacity > 0.01) {
        if (ghostText.classList.contains("hidden")) {
          ghostText.classList.remove("hidden");
        }
        ghostText.style.opacity = ghostTextOpacity.toString();
      } else if (
        ghostTextOpacity <= 0.01 &&
        !ghostText.classList.contains("hidden")
      ) {
        ghostText.classList.add("hidden");
        ghostText.style.opacity = "0";
      }
    }

    if (camText) {
      if (camTextOpacity > 0.01) {
        if (camText.classList.contains("hidden")) {
          camText.classList.remove("hidden");
        }
        camText.style.opacity = camTextOpacity.toString();
      } else if (
        camTextOpacity <= 0.01 &&
        !camText.classList.contains("hidden")
      ) {
        camText.classList.add("hidden");
        camText.style.opacity = "0";
      }
    }

    // Store position for next iteration
    trigger.lastProgress = currentCameraProgress;
  } else {
    // Default behavior for ghosts without triggers (HIGH SAMPLES for smoothness)
    const closestProgress = findClosestProgressOnPOVPath(cameraPosition, 4000);
    const ghostPosition = path.getPointAt(closestProgress);
    ghost.position.copy(ghostPosition);

    const tangent = path.getTangentAt(closestProgress).normalize();
    const lookAtPoint = ghostPosition.clone().add(tangent);
    ghost.lookAt(lookAtPoint);

    ghost.visible = true;
  }
}

// Old updateGhostTextTrigger function is now integrated into updateGhostInPOV
