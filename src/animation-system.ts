import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { pathsMap } from "./paths";
import { renderer, scene } from "./scene";
import { camera, startQuaternion, endQuaternion } from "./camera";

// 1. STATE MANAGEMENT
type AnimationState = "HOME" | "SCROLL_ANIMATION" | "POV_ANIMATION";
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
      povAnimationActive: boolean;
    };
  }
}

// Constants
const MAZE_CENTER = new THREE.Vector3(0.55675, 0.5, 0.45175);
const GHOSTS_END_AT = 0.8; // Ghosts finish their animation at 80% scroll
const GHOST_OPACITY_FADE_START = 0.8; // Last 20% of GHOST animation (ghostProgress 0.8-1.0)

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

  // Debug rotation for the problematic ghost
  if (ghostProgress > 0.9 && (ghostKey === "ghost1" || ghostKey === "pacman")) {
    console.log(
      `${ghostKey} at ${ghostProgress.toFixed(2)}: original=(${(
        (originalRotation.x * 180) /
        Math.PI
      ).toFixed(1)}°, ${((originalRotation.y * 180) / Math.PI).toFixed(1)}°, ${(
        (originalRotation.z * 180) /
        Math.PI
      ).toFixed(1)}°) current=(${((currentRotation.x * 180) / Math.PI).toFixed(
        1
      )}°, ${((currentRotation.y * 180) / Math.PI).toFixed(1)}°, ${(
        (currentRotation.z * 180) /
        Math.PI
      ).toFixed(1)}°)`
    );
  }

  // Handle opacity fade in last 20% of GHOST animation (not scroll progress!)
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
// 6. INTRO TEXT ANIMATIONS (after arriving at maze)
function setupIntroAnimations() {
  console.log("Setting up intro animations...");

  // Setup intro header animation (.sc_h--intro)
  const introHeader = document.querySelector(".sc_h--intro");
  if (introHeader) {
    // Set initial state
    (introHeader as HTMLElement).style.transform = "scale(0)";
    (introHeader as HTMLElement).style.opacity = "0";
    (introHeader as HTMLElement).style.display = "none"; // Hidden initially

    console.log("✅ Intro header element found and initialized");
  } else {
    console.warn("❌ Intro header element (.sc_h--intro) not found in DOM");
  }

  // Setup intro body animation (.sc_b--intro)
  const introBody = document.querySelector(".sc_b--intro");
  if (introBody) {
    // Set initial state
    (introBody as HTMLElement).style.transform = "scale(0.5)";
    (introBody as HTMLElement).style.opacity = "0";
    (introBody as HTMLElement).style.display = "none"; // Hidden initially

    console.log("✅ Intro body element found and initialized");
  } else {
    console.warn("❌ Intro body element (.sc_b--intro) not found in DOM");
  }

  // Debug: List all elements in DOM for troubleshooting
  const allElements = document.querySelectorAll('[class*="intro"]');
  console.log(
    `Found ${allElements.length} elements with 'intro' in class name:`,
    Array.from(allElements).map((el) => el.className)
  );
}

// Handle intro section scroll animations (like backup.js)
function handleIntroScroll() {
  const introSection = document.querySelector(".sc--intro") as HTMLElement;
  if (!introSection) return;

  const rect = introSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const sectionHeight = introSection.offsetHeight;

  // Check if we're scrolling through the intro section
  const isInIntroSection = rect.top < windowHeight && rect.bottom > 0;

  if (!isInIntroSection) return;

  // Calculate scroll progress within the intro section
  const scrolledIntoSection = Math.max(0, -rect.top);
  const scrollProgress = Math.min(scrolledIntoSection / sectionHeight, 1);

  console.log(`Intro Scroll Progress: ${scrollProgress.toFixed(3)}`);

  // Header animation: from 0% to 50% of intro section (like backup.js "top top" to "center center")
  const headerProgress = Math.min(scrollProgress * 2, 1); // 0-50% becomes 0-100%
  animateIntroHeader(headerProgress);

  // Body animation: from 50% to 100% of intro section (like backup.js "center center" to "bottom bottom")
  const bodyProgress = Math.max(0, (scrollProgress - 0.5) * 2); // 50-100% becomes 0-100%
  animateIntroBody(bodyProgress);
}

function animateIntroHeader(progress: number) {
  const introHeader = document.querySelector(".sc_h--intro") as HTMLElement;
  if (!introHeader) return;

  // Make visible
  introHeader.style.display = "block";

  // Keyframe progress mapping (like backup.js)
  let scale = 0;
  let opacity = 0;

  if (progress <= 0.3) {
    // 0% - 30%: scale 0->0.8, opacity 0->1
    const localProgress = progress / 0.3;
    scale = localProgress * 0.8;
    opacity = localProgress;
  } else if (progress <= 0.7) {
    // 30% - 70%: scale 0.8->1.2, opacity stays 1
    const localProgress = (progress - 0.3) / 0.4;
    scale = 0.8 + localProgress * 0.4; // 0.8 -> 1.2
    opacity = 1;
  } else {
    // 70% - 100%: scale 1.2->1.5, opacity 1->0
    const localProgress = (progress - 0.7) / 0.3;
    scale = 1.2 + localProgress * 0.3; // 1.2 -> 1.5
    opacity = 1 - localProgress; // 1 -> 0
  }

  introHeader.style.transform = `scale(${scale})`;
  introHeader.style.opacity = opacity.toString();
}

function animateIntroBody(progress: number) {
  const introBody = document.querySelector(".sc_b--intro") as HTMLElement;
  if (!introBody) return;

  // Make visible
  introBody.style.display = "block";

  // Same keyframe logic as header but starting from scale 0.5
  let scale = 0.5;
  let opacity = 0;

  if (progress <= 0.3) {
    // 0% - 30%: scale 0.5->0.8, opacity 0->1
    const localProgress = progress / 0.3;
    scale = 0.5 + localProgress * 0.3; // 0.5 -> 0.8
    opacity = localProgress;
  } else if (progress <= 0.7) {
    // 30% - 70%: scale 0.8->1.2, opacity stays 1
    const localProgress = (progress - 0.3) / 0.4;
    scale = 0.8 + localProgress * 0.4; // 0.8 -> 1.2
    opacity = 1;
  } else {
    // 70% - 100%: scale 1.2->1.5, opacity 1->0
    const localProgress = (progress - 0.7) / 0.3;
    scale = 1.2 + localProgress * 0.3; // 1.2 -> 1.5
    opacity = 1 - localProgress; // 1 -> 0
  }

  introBody.style.transform = `scale(${scale})`;
  introBody.style.opacity = opacity.toString();
}

export function setupScrollTriggers() {
  // Setup intro animations
  setupIntroAnimations();

  // This will be implemented when GSAP is available
  // For now, we use basic scroll events
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("scroll", handleIntroScroll);
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
    povAnimationActive: false,
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

  // Initialize POV Animation System
  initializePOVAnimation();

  console.log("Animation system initialized");
}

// Export functions for external use
export { moveGhostOnCurve, captureGhostPositions, createBezierCurves };

/*------------------
POV Animation System
------------------*/

// POV Path Points (from backup.js)
const cameraPOVPathPoints = [
  {
    pos: new THREE.Vector3(0.55675, 0.5, 0.45175),
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
}

const povAnimationState: POVAnimationState = {
  isActive: false,
  cameraPOVPath: null,
  ghostPOVPaths: {},
  triggerPositions: {},
  previousCameraPosition: null,
  startRotationPoint: new THREE.Vector3(0.55675, 0.55, 1.306),
  endRotationPoint: new THREE.Vector3(-0.14675, 1, 1.8085),
  targetLookAt: new THREE.Vector3(0.55675, 0.1, 1.306),
  finalLookAt: new THREE.Vector3(-0.14675, 0, 1.8085),
  rotationStarted: false,
  cachedStartYAngle: null,
};

// POV Text Animation Constants
const GHOST_TEXT_START = 0.2;
const CAM_TEXT_START = 0.3;
const FADE_OUT_START = 0.8;
const TRIGGER_DISTANCE = 0.02;

// Initialize POV Animation System
function initializePOVAnimation() {
  console.log("🎭 Initializing POV Animation System...");

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
  const parentElements = document.querySelectorAll(".cmp--pov.cmp");

  povAnimationState.triggerPositions = {
    ghost1: {
      triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
      ghostTextPos: new THREE.Vector3(0.7075, 0.55, 0.8035),
      camTextPos: new THREE.Vector3(0.75775, 0.55, 0.8035),
      endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
      parent: parentElements[0],
      active: false,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
    },
    ghost2: {
      triggerPos: new THREE.Vector3(0.9085, 0.55, 0.8035),
      ghostTextPos: new THREE.Vector3(0.95875, 0.55, 0.85375),
      camTextPos: new THREE.Vector3(0.95875, 0.55, 0.904),
      endPosition: new THREE.Vector3(0.95875, 0.55, 1.0045),
      parent: parentElements[1],
      active: false,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
    },
    ghost3: {
      triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
      ghostTextPos: new THREE.Vector3(0.7075, 0.55, 1.0045),
      camTextPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
      endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
      parent: parentElements[2],
      active: false,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
    },
    ghost4: {
      triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
      ghostTextPos: new THREE.Vector3(0.5065, 0.55, 1.0045),
      camTextPos: new THREE.Vector3(0.45625, 0.55, 1.0045),
      endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
      parent: parentElements[3],
      active: false,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
    },
    ghost5: {
      triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
      ghostTextPos: new THREE.Vector3(0.205, 0.55, 1.2055),
      camTextPos: new THREE.Vector3(0.25525, 0.55, 1.2055),
      endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
      parent: parentElements[4],
      active: false,
      ghostTextOpacity: 0,
      camTextOpacity: 0,
    },
  };

  // Setup POV ScrollTrigger
  setupPOVScrollTrigger();

  console.log("✅ POV Animation System initialized");
}

// Setup POV ScrollTrigger
function setupPOVScrollTrigger() {
  if (!gsap || !ScrollTrigger) {
    console.warn("⚠️ GSAP or ScrollTrigger not available for POV animation");
    return;
  }

  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--pov",
        start: "top bottom",
        end: "bottom top",
        scrub: 0.5,
        onStart: () => {
          console.log("🎭 POV Animation Started");
          povAnimationState.isActive = true;
          onPOVAnimationStart();
        },
        onUpdate: (self: any) => {
          updatePOVAnimation(self.progress);
        },
        onLeave: () => {
          console.log("🎭 POV Animation Ended");
          povAnimationState.isActive = false;
          onPOVAnimationEnd();
        },
        onLeaveBack: () => {
          console.log("🎭 POV Animation Ended (Back)");
          povAnimationState.isActive = false;
          onPOVAnimationEnd();
        },
      },
    })
    .to(
      { progress: 0 },
      {
        progress: 1,
        duration: 1,
        ease: "none",
      }
    );
}

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

  // Make sure pacman is visible
  if (ghosts.pacman) {
    ghosts.pacman.visible = true;
  }

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.povAnimationActive = true;
  }
}

// Update POV Animation
function updatePOVAnimation(progress: number) {
  if (!povAnimationState.cameraPOVPath || !povAnimationState.isActive) return;

  // Update camera position and rotation
  updatePOVCamera(progress);

  // Update ghost positions
  updatePOVGhosts(progress);

  // Update POV texts
  updatePOVTexts(progress);
}

// Update POV Camera
function updatePOVCamera(progress: number) {
  if (!povAnimationState.cameraPOVPath || !camera) return;

  const cameraPosition = povAnimationState.cameraPOVPath.getPointAt(progress);
  camera.position.copy(cameraPosition);

  // Handle camera rotation based on progress
  const rotationStartingPoint = 0.973;

  if (progress >= rotationStartingPoint && !povAnimationState.rotationStarted) {
    povAnimationState.rotationStarted = true;
    const lookAtPoint = getCameraLookAtPoint();
    povAnimationState.cachedStartYAngle = Math.atan2(
      lookAtPoint.x - camera.position.x,
      lookAtPoint.z - camera.position.z
    );
  }

  if (progress < rotationStartingPoint) {
    // Before rotation phase - look along path
    const tangent = povAnimationState.cameraPOVPath
      .getTangentAt(progress)
      .normalize();
    const lookAtPoint = camera.position.clone().add(tangent);
    camera.lookAt(lookAtPoint);
  } else {
    // Rotation phase - interpolate between start and end look-at
    const rotationProgress =
      (progress - rotationStartingPoint) / (1 - rotationStartingPoint);
    const smoothProgress = smoothStep(rotationProgress);

    const currentLookAt = new THREE.Vector3().lerpVectors(
      povAnimationState.targetLookAt,
      povAnimationState.finalLookAt,
      smoothProgress
    );

    camera.lookAt(currentLookAt);
  }

  // Store previous position
  if (povAnimationState.previousCameraPosition) {
    povAnimationState.previousCameraPosition.copy(cameraPosition);
  }
}

// Update POV Ghosts
function updatePOVGhosts(progress: number) {
  Object.entries(povAnimationState.ghostPOVPaths).forEach(
    ([ghostKey, path]) => {
      const ghost = ghosts[ghostKey];
      if (!ghost || !path) return;

      // Get position on ghost's POV path
      const ghostPosition = path.getPointAt(progress);
      ghost.position.copy(ghostPosition);

      // Make ghost look along its path
      const tangent = path.getTangentAt(progress).normalize();
      const lookAtPoint = ghostPosition.clone().add(tangent);
      ghost.lookAt(lookAtPoint);

      // Make sure ghost is visible
      ghost.visible = true;
    }
  );
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
        const ghostTextRange =
          trigger.camTextCameraProgress - trigger.ghostTextCameraProgress;
        const ghostTextProgress = Math.max(
          0,
          Math.min(
            1,
            (currentCameraProgress - trigger.ghostTextCameraProgress) /
              ghostTextRange
          )
        );

        if (ghostTextProgress < FADE_OUT_START) {
          targetGhostOpacity = 1;
        } else {
          targetGhostOpacity =
            1 - (ghostTextProgress - FADE_OUT_START) / (1 - FADE_OUT_START);
        }

        if (currentCameraProgress >= trigger.camTextCameraProgress) {
          const camTextRange =
            trigger.endCameraProgress - trigger.camTextCameraProgress;
          const camTextProgress = Math.max(
            0,
            Math.min(
              1,
              (currentCameraProgress - trigger.camTextCameraProgress) /
                camTextRange
            )
          );

          if (camTextProgress < FADE_OUT_START) {
            targetCamOpacity = 1;
          } else {
            targetCamOpacity =
              1 - (camTextProgress - FADE_OUT_START) / (1 - FADE_OUT_START);
          }
        }
      }

      // Smooth opacity transitions
      const fadeInSpeed = 0.2;
      const fadeOutSpeed = 0.1;

      if (targetGhostOpacity > trigger.ghostTextOpacity) {
        trigger.ghostTextOpacity +=
          (targetGhostOpacity - trigger.ghostTextOpacity) * fadeInSpeed;
      } else {
        trigger.ghostTextOpacity +=
          (targetGhostOpacity - trigger.ghostTextOpacity) * fadeOutSpeed;
      }

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
    const ghostOpacity = Math.max(0, Math.min(1, trigger.ghostTextOpacity));
    if (ghostOpacity > 0.01) {
      ghostText.classList.remove("hidden");
      ghostText.style.opacity = ghostOpacity.toString();
    } else {
      ghostText.classList.add("hidden");
      ghostText.style.opacity = "0";
    }
  }

  if (camText) {
    const camOpacity = Math.max(0, Math.min(1, trigger.camTextOpacity));
    if (camOpacity > 0.01) {
      camText.classList.remove("hidden");
      camText.style.opacity = camOpacity.toString();
    } else {
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
  // Reset to HOME state
  currentAnimationState = "HOME";

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

  // Make sure pacman is visible and animation is running
  if (ghosts.pacman) ghosts.pacman.visible = true;

  // Update debug info
  if (window.animationDebugInfo) {
    window.animationDebugInfo.povAnimationActive = false;
  }
}

// Restore ghosts to home positions
function restoreGhostsToHomePositions() {
  Object.entries(capturedPositions).forEach(
    ([ghostKey, captured]: [string, any]) => {
      const ghost = ghosts[ghostKey];
      if (ghost && captured) {
        ghost.position.copy(captured.position);
        ghost.rotation.copy(captured.rotation);
        ghost.visible = true;

        // Reset material opacity
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
