import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { pathsMap } from "./paths";
import { renderer, scene } from "./scene";
import { camera } from "./camera";
import { MAZE_CENTER } from "./config";
import { smoothStep } from "./utils";

// Types
type AnimationState = "HOME" | "SCROLL_ANIMATION";

// Global interface for animation system communication
declare global {
  interface Window {
    updateAnimationTimeOffset?: (delta: number) => void;
  }
}

// State management
export let currentAnimationState: AnimationState = "HOME";
export let isFirstScroll = true;

// Constants
const GHOSTS_END_AT = 0.8; // Ghosts finish their animation at 80% scroll
const GHOST_OPACITY_FADE_START = 0.8; // Last 20% of GHOST animation
const CAMERA_DELAY = 0.15; // Camera starts 15% later than ghosts

// Position & Bezier system
export const capturedPositions: { [key: string]: THREE.Vector3 } = {};
export const capturedRotations: { [key: string]: THREE.Euler } = {};
export const bezierCurves: { [key: string]: THREE.QuadraticBezierCurve3 } = {};
let timeOffset = 0;
let pauseTime = 0;

// Camera path variables
let initialCameraPosition = new THREE.Vector3();
let initialCameraTarget = new THREE.Vector3();
let initialCameraQuaternion = new THREE.Quaternion();
let cameraHomePath: THREE.CubicBezierCurve3;

export function captureGhostPositions() {
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

export function createBezierCurves() {
  Object.keys(capturedPositions).forEach((ghostKey) => {
    const startPos = capturedPositions[ghostKey].clone();
    const endPos = MAZE_CENTER.clone();

    // Control point: Mittelpunkt zwischen Start und Ende in x/z, aber hoch oben bei y=2
    const controlPoint = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      2, // High arc point
      (startPos.z + endPos.z) / 2
    );

    bezierCurves[ghostKey] = new THREE.QuadraticBezierCurve3(
      startPos,
      controlPoint,
      endPos
    );

    console.log(`Created bezier curve for ${ghostKey}:`, {
      start: startPos,
      control: controlPoint,
      end: endPos,
    });
  });
}

export function moveGhostOnCurve(ghostKey: string, ghostProgress: number) {
  if (
    !bezierCurves[ghostKey] ||
    !ghosts[ghostKey] ||
    !capturedPositions[ghostKey] ||
    !capturedRotations[ghostKey]
  )
    return;

  const ghost = ghosts[ghostKey];

  // Position along bezier curve
  const position = bezierCurves[ghostKey].getPoint(ghostProgress);
  ghost.position.copy(position);

  // Only log first few movements to avoid spam
  if (ghostProgress < 0.1) {
    console.log(
      `👻 ${ghostKey} at progress ${ghostProgress.toFixed(
        3
      )} moved to (${position.x.toFixed(2)}, ${position.y.toFixed(
        2
      )}, ${position.z.toFixed(2)})`
    );
  }

  // Rotation interpolation
  const originalRotation = capturedRotations[ghostKey];
  const targetRotation = new THREE.Euler(Math.PI / -2, 0, 0);

  const currentRotation = new THREE.Euler(
    originalRotation.x +
      (targetRotation.x - originalRotation.x) * ghostProgress,
    originalRotation.y +
      (targetRotation.y - originalRotation.y) * ghostProgress,
    originalRotation.z + (targetRotation.z - originalRotation.z) * ghostProgress
  );

  ghost.rotation.copy(currentRotation);

  // Opacity fade in last 20% of animation
  let opacity = 1;
  if (ghostProgress >= GHOST_OPACITY_FADE_START) {
    const fadeProgress =
      (ghostProgress - GHOST_OPACITY_FADE_START) /
      (1 - GHOST_OPACITY_FADE_START);
    opacity = 1 - fadeProgress;
    opacity = Math.max(0, opacity);
  }

  // Apply opacity
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

// Create camera path
function createCameraPath() {
  const startPosition = initialCameraPosition.clone();

  const isMobile = window.innerWidth < 768;
  const targetSecondPositionMobile = new THREE.Vector3(0.5, 2.5, 2);
  const targetSecondPositionDesktop = new THREE.Vector3(-1.5, 3, 2);
  const targetSecondPosition = isMobile
    ? targetSecondPositionMobile
    : targetSecondPositionDesktop;

  const secondPosition = new THREE.Vector3().lerpVectors(
    startPosition,
    targetSecondPosition,
    0.3
  );

  cameraHomePath = new THREE.CubicBezierCurve3(
    startPosition,
    secondPosition,
    new THREE.Vector3(0.55675, 3, 0.45175),
    new THREE.Vector3(0.55675, 0.5, 0.45175)
  );

  console.log(
    `Camera path created starting from current position:`,
    `${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(
      2
    )}, ${startPosition.z.toFixed(2)}`,
    "to maze center (0.55675, 0.5, 0.45175)"
  );
}

function onFirstScroll() {
  if (!isFirstScroll) return;

  console.log("🛑 onFirstScroll called - stopping all animations immediately");
  console.log("📊 Current ghost positions before capture:");
  Object.keys(ghosts).forEach((key) => {
    if (ghosts[key]) {
      console.log(
        `  ${key}: (${ghosts[key].position.x.toFixed(2)}, ${ghosts[
          key
        ].position.y.toFixed(2)}, ${ghosts[key].position.z.toFixed(2)})`
      );
    }
  });

  isFirstScroll = false;
  pauseTime = Date.now();
  currentAnimationState = "SCROLL_ANIMATION";

  console.log("🔄 State changed to SCROLL_ANIMATION");
  console.log("🔄 Current state is now:", currentAnimationState);

  // Verify state change worked
  setTimeout(() => {
    console.log("🔄 State check after 100ms:", currentAnimationState);
  }, 100);

  const currentCameraPosition = camera.position.clone();
  const currentCameraQuaternion = camera.quaternion.clone();
  const currentDirection = new THREE.Vector3(0, 0, -1);
  currentDirection.applyQuaternion(camera.quaternion);
  const currentCameraTarget = camera.position
    .clone()
    .add(currentDirection.multiplyScalar(5));

  initialCameraPosition.copy(currentCameraPosition);
  initialCameraTarget.copy(currentCameraTarget);
  initialCameraQuaternion.copy(currentCameraQuaternion);

  captureGhostPositions();
  createBezierCurves();
  createCameraPath();

  console.log(
    "First scroll detected - animation STOPPED immediately, bezier curves created"
  );
}

function animateCamera(progress: number) {
  if (!cameraHomePath) return;

  const position = cameraHomePath.getPointAt(progress);
  camera.position.copy(position);

  const mazeCenter = new THREE.Vector3(0.55675, 0.5, 0.45175);
  const endQuaternionLookingDown = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );

  if (progress === 0) {
    camera.quaternion.copy(initialCameraQuaternion);
  } else {
    const currentQuaternion = new THREE.Quaternion();
    currentQuaternion.slerpQuaternions(
      initialCameraQuaternion,
      endQuaternionLookingDown,
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

export function resetToHomeState() {
  currentAnimationState = "HOME";
  isFirstScroll = true;

  if (pauseTime) {
    // Pass timeOffset update to animation system
    const timeOffsetDelta = Date.now() - pauseTime;
    if (window.updateAnimationTimeOffset) {
      window.updateAnimationTimeOffset(timeOffsetDelta);
    }
    pauseTime = 0;
  }

  camera.position.copy(initialCameraPosition);
  camera.quaternion.copy(initialCameraQuaternion);

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

  console.log("State reset to HOME - all ghosts back to original positions");
}

// Scroll handling for home section
export function handleScroll() {
  const homeSection = document.querySelector(".sc--home") as HTMLElement;
  if (!homeSection) {
    console.warn(".sc--home element not found");
    return;
  }

  const rect = homeSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const isInHomeSection = rect.top < windowHeight && rect.bottom > 0;

  if (!isInHomeSection) {
    if (currentAnimationState === "SCROLL_ANIMATION") {
      resetToHomeState();
      console.log("Left home section - resuming home animation");
    }
    return;
  }

  const sectionHeight = homeSection.offsetHeight;
  const scrolledIntoSection = Math.max(0, -rect.top);
  const scrollProgress = Math.min(scrolledIntoSection / sectionHeight, 1);

  console.log(
    `Scroll Debug: rect.top=${rect.top}, windowHeight=${windowHeight}, scrolledIntoSection=${scrolledIntoSection}, sectionHeight=${sectionHeight}, scrollProgress=${scrollProgress}, currentState=${currentAnimationState}`
  );

  if (scrollProgress > 0 && currentAnimationState === "HOME") {
    console.log("🚀 TRIGGERING FIRST SCROLL - Starting scroll animation...");
    onFirstScroll();
  }

  if (currentAnimationState === "SCROLL_ANIMATION") {
    if (scrollProgress === 0) {
      console.log("Scroll progress at 0, resetting to home state");
      resetToHomeState();
      return;
    }

    console.log(`Animating with scrollProgress: ${scrollProgress}`);

    Object.keys(ghosts).forEach((ghostKey) => {
      if (bezierCurves[ghostKey]) {
        const ghostProgress = Math.min(scrollProgress / GHOSTS_END_AT, 1);
        moveGhostOnCurve(ghostKey, ghostProgress);
      }
    });

    animateCamera(scrollProgress);
  }
}

// Initialize scroll system
export function initScrollSystem() {
  // Capture initial camera state
  initialCameraPosition = camera.position.clone();
  initialCameraQuaternion = camera.quaternion.clone();
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  initialCameraTarget = camera.position
    .clone()
    .add(direction.multiplyScalar(5));

  console.log("Captured initial camera position:", initialCameraPosition);
  console.log("Captured initial camera quaternion:", initialCameraQuaternion);

  window.addEventListener("scroll", handleScroll);

  // Debug: Add manual test function to window
  (window as any).testScrollAnimation = () => {
    console.log("🧪 Manual test trigger - forcing scroll animation");
    onFirstScroll();
    setTimeout(() => {
      console.log("🧪 Testing animation at 0.5 progress");
      Object.keys(ghosts).forEach((ghostKey) => {
        if (bezierCurves[ghostKey]) {
          moveGhostOnCurve(ghostKey, 0.5);
        }
      });
      animateCamera(0.5);
    }, 100);
  };

  console.log(
    "Scroll system initialized - you can test with window.testScrollAnimation()"
  );
}
