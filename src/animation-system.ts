import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { pathsMap } from "./paths";
import { renderer, scene } from "./scene";
import { camera, startQuaternion, endQuaternion } from "./camera";

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
      scrollProgress?: number;
    };
  }
}

// Constants
const MAZE_CENTER = new THREE.Vector3(0.55675, 0.5, 0.45175);
const GHOSTS_END_AT = 0.8; // Ghosts finish their animation at 80% scroll
const OPACITY_FADE_START = 0.8; // Last 20% for opacity fade (same as ghosts end)
const CAMERA_DELAY = 0.15; // Camera starts 15% later than ghosts

// Rotation constants (easily changeable)
const ROTATION_AXIS_X: "x" | "y" | "z" = "x"; // Primary rotation axis (e.g., to lay down)
const ROTATION_AXIS_Y: "x" | "y" | "z" = "y"; // Secondary rotation axis (to next 90° step)
const ROTATION_AMOUNT_X = Math.PI / 2; // 90 degrees for X-axis
const USE_SMART_Y_ROTATION = true; // Whether to snap to nearest straight orientation (0° or 180°) on Y-axis

// Helper function to find the nearest 0° or 180° step
function getNearestStraightOrientation(currentRadians: number): number {
  // Convert to degrees for easier calculation
  const currentDegrees = (currentRadians * 180) / Math.PI;

  // Normalize to 0-360 range
  const normalizedDegrees = ((currentDegrees % 360) + 360) % 360;

  // Find distance to 0° and 180°
  const distanceTo0 = Math.min(normalizedDegrees, 360 - normalizedDegrees);
  const distanceTo180 = Math.abs(normalizedDegrees - 180);

  // Choose the nearer one
  let targetDegrees;
  if (distanceTo0 <= distanceTo180) {
    // Nearer to 0° (could be 0° or 360°)
    targetDegrees = normalizedDegrees <= 180 ? 0 : 360;
  } else {
    // Nearer to 180°
    targetDegrees = 180;
  }

  // Convert back to radians
  return (targetDegrees * Math.PI) / 180;
}

// 2. POSITION & BEZIER SYSTEM
const capturedPositions: { [key: string]: THREE.Vector3 } = {};
const capturedRotations: { [key: string]: THREE.Euler } = {};
const bezierCurves: { [key: string]: THREE.QuadraticBezierCurve3 } = {};
let timeOffset = 0;
let pauseTime = 0;

function captureGhostPositions() {
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghosts[ghostKey]) {
      capturedPositions[ghostKey] = ghosts[ghostKey].position.clone();
      capturedRotations[ghostKey] = ghosts[ghostKey].rotation.clone();
      console.log(
        `Captured ${ghostKey} at position:`,
        ghosts[ghostKey].position,
        "rotation:",
        ghosts[ghostKey].rotation
      );
    }
  });
  console.log("All ghost positions captured:", capturedPositions);
  console.log("All ghost rotations captured:", capturedRotations);
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

    console.log(`Created bezier curve for ${ghostKey}:`, {
      start: startPos,
      control: controlPoint,
      end: endPos,
    });
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

  // Interpolate rotation: Start with original rotation, end with target rotation
  const originalRotation = capturedRotations[ghostKey];
  const targetRotation = originalRotation.clone();

  // X-axis rotation (e.g., to lay down) - always add specified amount
  if (ROTATION_AXIS_X === "x") {
    targetRotation.x += ROTATION_AMOUNT_X * ghostProgress;
  } else if (ROTATION_AXIS_X === "y") {
    targetRotation.y += ROTATION_AMOUNT_X * ghostProgress;
  } else if (ROTATION_AXIS_X === "z") {
    targetRotation.z += ROTATION_AMOUNT_X * ghostProgress;
  }

  // Y-axis rotation (smart rotation to nearest 0° or 180°)
  if (USE_SMART_Y_ROTATION) {
    const currentYRotation = originalRotation.y;
    const targetYRotation = getNearestStraightOrientation(currentYRotation);
    const yDifference = targetYRotation - currentYRotation;

    // Debug logging for the first ghost
    if (ghostKey === "ghost1" && ghostProgress > 0.1 && ghostProgress < 0.2) {
      console.log(
        `${ghostKey} Y-rotation: current=${(
          (currentYRotation * 180) /
          Math.PI
        ).toFixed(1)}°, target=${((targetYRotation * 180) / Math.PI).toFixed(
          1
        )}°, difference=${((yDifference * 180) / Math.PI).toFixed(1)}°`
      );
    }

    if (ROTATION_AXIS_Y === "y") {
      targetRotation.y = originalRotation.y + yDifference * ghostProgress;
    } else if (ROTATION_AXIS_Y === "x") {
      targetRotation.x = originalRotation.x + yDifference * ghostProgress;
    } else if (ROTATION_AXIS_Y === "z") {
      targetRotation.z = originalRotation.z + yDifference * ghostProgress;
    }
  }

  ghost.rotation.copy(targetRotation);

  // Handle opacity fade in last 20% of GHOST animation (not scroll progress!)
  let opacity = 1;
  if (ghostProgress >= OPACITY_FADE_START) {
    const fadeProgress =
      (ghostProgress - OPACITY_FADE_START) / (1 - OPACITY_FADE_START);
    opacity = 1 - fadeProgress;
    opacity = Math.max(0.1, opacity); // Keep minimum visibility
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
  // Use current camera position as start (don't jump)
  const startPosition = initialCameraPosition.clone();

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

  console.log(
    `Camera path created starting from current position:`,
    `${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(
      2
    )}, ${startPosition.z.toFixed(2)}`,
    "to maze center (0.55675, 0.5, 0.45175)"
  );
}

// 3. SCROLL MANAGEMENT
let initialCameraPosition = new THREE.Vector3();
let initialCameraTarget = new THREE.Vector3();
let initialCameraQuaternion = new THREE.Quaternion();
let cameraHomePath: THREE.CubicBezierCurve3;

function onFirstScroll() {
  if (!isFirstScroll) return;

  console.log("onFirstScroll called - stopping all animations immediately");

  isFirstScroll = false;
  pauseTime = Date.now();

  // IMMEDIATELY stop the home animation by changing state first
  currentAnimationState = "SCROLL_ANIMATION";

  // Use the CURRENT camera position and rotation as start point (don't jump!)
  const currentCameraPosition = camera.position.clone();
  const currentCameraQuaternion = camera.quaternion.clone();
  const currentDirection = new THREE.Vector3(0, 0, -1);
  currentDirection.applyQuaternion(camera.quaternion);
  const currentCameraTarget = camera.position
    .clone()
    .add(currentDirection.multiplyScalar(5));

  console.log("Using current camera position for path:", currentCameraPosition);
  console.log(
    "Using current camera rotation (quaternion):",
    currentCameraQuaternion
  );
  console.log("Using current camera look-at target:", currentCameraTarget);

  // Update the camera start position and rotation for smooth transition
  initialCameraPosition.copy(currentCameraPosition);
  initialCameraTarget.copy(currentCameraTarget);
  initialCameraQuaternion.copy(currentCameraQuaternion);

  // Capture ghost positions AFTER stopping animation
  captureGhostPositions();
  createBezierCurves();

  // Create camera path starting from CURRENT position (not jump)
  createCameraPath();

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.state = currentAnimationState;
    window.animationDebugInfo.isFirstScroll = isFirstScroll;
  }

  console.log(
    "First scroll detected - animation STOPPED immediately, bezier curves created"
  );
}

// 4. ANIMATION LOOP
let animationStartTime = Date.now();

function animationLoop() {
  // Only run home animation if we're in HOME state
  if (currentAnimationState !== "HOME") return;

  const currentTime = Date.now();
  const elapsedTime = (currentTime - animationStartTime - timeOffset) / 1000; // Convert to seconds
  const t = (elapsedTime * 0.1) % 1; // Speed control (0.1 = slower, 0.2 = faster)

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
  isFirstScroll = true;

  if (pauseTime) {
    timeOffset += Date.now() - pauseTime;
    pauseTime = 0;
  }

  // Reset camera to initial position and rotation
  camera.position.copy(initialCameraPosition);
  camera.quaternion.copy(initialCameraQuaternion);

  // Reset all ghosts to their captured positions, rotations and full opacity
  Object.keys(ghosts).forEach((ghostKey) => {
    if (
      capturedPositions[ghostKey] &&
      capturedRotations[ghostKey] &&
      ghosts[ghostKey]
    ) {
      console.log(
        `Resetting ${ghostKey} to captured position:`,
        capturedPositions[ghostKey]
      );
      ghosts[ghostKey].position.copy(capturedPositions[ghostKey]);
      ghosts[ghostKey].rotation.copy(capturedRotations[ghostKey]);

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
    window.animationDebugInfo.isFirstScroll = isFirstScroll;
    window.animationDebugInfo.scrollProgress = 0;
  }
}

// Camera animation helper - smooth transition from current rotation (ONLY FOV FIX)
function animateCamera(progress: number) {
  if (!cameraHomePath) {
    console.warn("Camera path not created yet");
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

  console.log(
    `Camera at progress ${progress.toFixed(2)}: position=${position.x.toFixed(
      2
    )}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`
  );
}

// Smooth step function from backup.js
function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}

// Scroll event handler
function handleScroll() {
  const homeSection = document.querySelector(".sc--home") as HTMLElement;
  if (!homeSection) {
    console.warn(".sc--home element not found");
    return;
  }

  const rect = homeSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Check if we're scrolling through the home section
  const isInHomeSection = rect.top < windowHeight && rect.bottom > 0;

  if (!isInHomeSection) {
    // If we're not in home section and currently in scroll animation, reset
    if (currentAnimationState === "SCROLL_ANIMATION") {
      resetToHomeState();
      console.log("Left home section - resuming home animation");
    }
    return;
  }

  // Calculate scroll progress within the home section
  const sectionHeight = homeSection.offsetHeight;

  // Korrekte Berechnung: Wie weit sind wir IN die Section gescrollt (von oben)
  // Wenn rect.top = 0, sind wir am Anfang der Section (scrollProgress = 0)
  // Wenn rect.top = -sectionHeight, sind wir am Ende der Section (scrollProgress = 1)
  const scrolledIntoSection = Math.max(0, -rect.top);
  const scrollProgress = Math.min(scrolledIntoSection / sectionHeight, 1);

  console.log(
    `Scroll Debug: rect.top=${rect.top}, windowHeight=${windowHeight}, scrolledIntoSection=${scrolledIntoSection}, sectionHeight=${sectionHeight}, scrollProgress=${scrollProgress}`
  );

  // Start scroll animation IMMEDIATELY when we begin scrolling through home section
  if (scrollProgress > 0 && currentAnimationState === "HOME") {
    console.log("Starting scroll animation...");
    onFirstScroll();
  }

  if (currentAnimationState === "SCROLL_ANIMATION") {
    // If we're back at the very top (scrollProgress = 0), reset everything
    if (scrollProgress === 0) {
      console.log("Scroll progress at 0, resetting to home state");
      resetToHomeState();
      return;
    }

    console.log(`Animating with scrollProgress: ${scrollProgress}`);

    // Animate ghosts along bezier curves (they finish at 80% scroll)
    Object.keys(ghosts).forEach((ghostKey) => {
      if (bezierCurves[ghostKey]) {
        // Compress ghost animation into 0-80% range
        const ghostProgress = Math.min(scrollProgress / GHOSTS_END_AT, 1);
        moveGhostOnCurve(ghostKey, ghostProgress);
      }
    });

    // Animate camera normally (0% to 100%)
    animateCamera(scrollProgress);

    // Update debug info
    if (window.animationDebugInfo) {
      window.animationDebugInfo.scrollProgress = scrollProgress;
    }
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

  // FIRST THING: Capture the initial camera state before any animations start
  initialCameraPosition = camera.position.clone();
  initialCameraQuaternion = camera.quaternion.clone();
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  initialCameraTarget = camera.position
    .clone()
    .add(direction.multiplyScalar(5));

  console.log("Captured initial camera position:", initialCameraPosition);
  console.log("Captured initial camera quaternion:", initialCameraQuaternion);
  console.log("Captured initial camera look-at target:", initialCameraTarget);

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
