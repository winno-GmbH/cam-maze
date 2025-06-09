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
      scrollProgress?: number;
    };
  }
}

// Constants
const MAZE_CENTER = new THREE.Vector3(0.95175, 0.5, 1.05675);
const OPACITY_FADE_START = 0.8; // Last 20% for opacity fade

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
  const mazeCenter = new THREE.Vector3(0.45175, 0.5, 0.55675);

  Object.keys(capturedPositions).forEach((ghostKey) => {
    const startPos = capturedPositions[ghostKey].clone(); // Aktuelle Position der Geister
    const endPos = mazeCenter.clone(); // Maze-Mitte als Endpunkt

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

function moveGhostOnCurve(ghostKey: string, scrollProgress: number) {
  if (
    !bezierCurves[ghostKey] ||
    !ghosts[ghostKey] ||
    !capturedPositions[ghostKey] ||
    !capturedRotations[ghostKey]
  )
    return;

  const ghost = ghosts[ghostKey];

  // Always use bezier curve for smooth interpolation
  const position = bezierCurves[ghostKey].getPoint(scrollProgress);
  ghost.position.copy(position);

  // Interpolate rotation: Start with original rotation, end with target rotation
  const originalRotation = capturedRotations[ghostKey];
  const targetRotation = originalRotation.clone();

  // X-axis rotation (e.g., to lay down) - always add specified amount
  if (ROTATION_AXIS_X === "x") {
    targetRotation.x += ROTATION_AMOUNT_X * scrollProgress;
  } else if (ROTATION_AXIS_X === "y") {
    targetRotation.y += ROTATION_AMOUNT_X * scrollProgress;
  } else if (ROTATION_AXIS_X === "z") {
    targetRotation.z += ROTATION_AMOUNT_X * scrollProgress;
  }

  // Y-axis rotation (smart rotation to nearest 0° or 180°)
  if (USE_SMART_Y_ROTATION) {
    const currentYRotation = originalRotation.y;
    const targetYRotation = getNearestStraightOrientation(currentYRotation);
    const yDifference = targetYRotation - currentYRotation;

    // Debug logging for the first ghost
    if (ghostKey === "ghost1" && scrollProgress > 0.1 && scrollProgress < 0.2) {
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
      targetRotation.y = originalRotation.y + yDifference * scrollProgress;
    } else if (ROTATION_AXIS_Y === "x") {
      targetRotation.x = originalRotation.x + yDifference * scrollProgress;
    } else if (ROTATION_AXIS_Y === "z") {
      targetRotation.z = originalRotation.z + yDifference * scrollProgress;
    }
  }

  ghost.rotation.copy(targetRotation);

  // Handle opacity fade in last 20%
  let opacity = 1;
  if (scrollProgress >= OPACITY_FADE_START) {
    const fadeProgress =
      (scrollProgress - OPACITY_FADE_START) / (1 - OPACITY_FADE_START);
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

// 3. SCROLL MANAGEMENT
let initialCameraPosition = new THREE.Vector3();
let initialCameraTarget = new THREE.Vector3();

function onFirstScroll() {
  if (!isFirstScroll) return;

  isFirstScroll = false;
  pauseTime = Date.now();

  // Capture initial camera state
  initialCameraPosition.copy(camera.position);
  // Assume camera is looking at origin initially or get the current target
  initialCameraTarget.set(0, 0, 0);

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

// Reset to home state helper
function resetToHomeState() {
  currentAnimationState = "HOME";
  isFirstScroll = true;

  if (pauseTime) {
    timeOffset += Date.now() - pauseTime;
    pauseTime = 0;
  }

  // Reset camera to initial position
  camera.position.copy(initialCameraPosition);
  camera.lookAt(initialCameraTarget);

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

// Camera animation helper
function animateCamera(progress: number) {
  // Lerp camera position towards maze center
  const mazeCenter = new THREE.Vector3(0.45175, 0.5, 0.55675);

  // Position camera above the maze for a top-down-ish view
  const cameraTargetPosition = new THREE.Vector3(
    mazeCenter.x,
    mazeCenter.y + 1.2, // Higher above the maze
    mazeCenter.z + 0.6 // Slightly back
  );

  camera.position.lerpVectors(
    initialCameraPosition,
    cameraTargetPosition,
    progress
  );

  // Make camera look at maze center
  const currentTarget = new THREE.Vector3().lerpVectors(
    initialCameraTarget,
    mazeCenter,
    progress
  );
  camera.lookAt(currentTarget);
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

  // Start scroll animation when we begin scrolling through home section (with threshold)
  if (scrollProgress > 0.05 && currentAnimationState === "HOME") {
    console.log("Starting scroll animation...");
    onFirstScroll();
  }

  if (currentAnimationState === "SCROLL_ANIMATION") {
    // If we're back at the top (scrollProgress <= 0.02), reset everything
    if (scrollProgress <= 0.02) {
      console.log("Scroll progress near 0, resetting to home state");
      resetToHomeState();
      return;
    }

    console.log(`Animating with scrollProgress: ${scrollProgress}`);

    // Animate ghosts along bezier curves
    Object.keys(ghosts).forEach((ghostKey) => {
      if (bezierCurves[ghostKey]) {
        moveGhostOnCurve(ghostKey, scrollProgress);
      }
    });

    // Animate camera towards maze center (only after 20% scroll progress)
    if (scrollProgress > 0.2) {
      const cameraProgress = (scrollProgress - 0.2) / 0.8; // Map 0.2-1.0 to 0-1
      animateCamera(Math.min(cameraProgress, 1));
    }

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
