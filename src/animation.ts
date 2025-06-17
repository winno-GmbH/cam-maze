import * as THREE from "three";
import { camera, endQuaternion } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman, pacmanMixer } from "./objects";
import { getPathsForSection, cameraHomePath } from "./paths";
import { MAZE_CENTER, DOM_ELEMENTS, SELECTORS } from "./config";

// Animation state
export type AnimationState = "HOME" | "SCROLL_ANIMATION";

const HOME_ANIMATION_SPEED = 0.03; // loop speed - doubled for smoother movement
const CAMERA_FOV = 50;
const TRANSITION_DURATION = 0.5; // seconds for smooth transition back to home

// Speed multipliers for scroll animation - higher = faster
const GHOST_SPEED_MULTIPLIERS: Record<string, number> = {
  ghost1: 1.4, // Fastest - arrives first
  ghost2: 1.3,
  ghost3: 1.2,
  ghost4: 1.1,
  ghost5: 1,
  pacman: 0.9, // Slowest - arrives last, synchronized with camera
};

// When ghosts should finish their animation (0.8 = 80% of scroll progress)
const GHOSTS_END_AT = 0.8;
const GHOST_OPACITY_FADE_START = 0.9;

let animationState: AnimationState = "HOME";
let homeProgress = 0;
let scrollProgress = 0;
let bezierCurves: Record<string, THREE.QuadraticBezierCurve3> = {};
let capturedPositions: Record<string, THREE.Vector3> = {};
let capturedRotations: Record<string, THREE.Euler> = {};
let cameraScrollCurve: THREE.CubicBezierCurve3 | null = null;
let cameraScrollStartQuat: THREE.Quaternion | null = null;
let scrollTriggerInitialized = false;
let homePositionsCaptured = false;
let pausedHomeProgress = 0;

// Simple transition variables
let isTransitioningToHome = false;
let transitionProgress = 0;
let transitionStartPositions: Record<string, THREE.Vector3> = {};
let transitionStartRotations: Record<string, THREE.Euler> = {};

const homePathKeys = [
  "pacman",
  "ghost1",
  "ghost2",
  "ghost3",
  "ghost4",
  "ghost5",
] as const;
type HomePathKey = (typeof homePathKeys)[number];
const homePaths = getPathsForSection("home") as Record<
  HomePathKey,
  THREE.CurvePath<THREE.Vector3>
>;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateHomeLoop(dt: number) {
  homeProgress = (homeProgress + dt * HOME_ANIMATION_SPEED) % 1;
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if ((homePathKeys as readonly string[]).includes(key)) {
      const path = homePaths[key as HomePathKey];
      if (path) {
        const t = homeProgress;
        const pos = path.getPointAt(t);
        ghost.position.copy(pos);
        const tangent = path.getTangentAt(t).normalize();
        ghost.lookAt(pos.clone().add(tangent));
        // Pacman rotation smoothing
        if (key === "pacman") {
          const zRot = Math.atan2(tangent.x, tangent.z);
          ghost.rotation.set(Math.PI / 2, Math.PI, zRot + Math.PI / 2);
        }
        setGhostOpacity(ghost, 1);
      }
    }
  });
}

function setGhostOpacity(ghost: THREE.Object3D, opacity: number) {
  if (
    ghost instanceof THREE.Mesh &&
    ghost.material &&
    "opacity" in ghost.material
  ) {
    (ghost.material as any).opacity = opacity;
  } else if (ghost instanceof THREE.Group) {
    ghost.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material &&
        "opacity" in child.material
      ) {
        (child.material as any).opacity = opacity;
      }
    });
  }
}

function captureGhostPositions() {
  if (homePositionsCaptured) return;

  Object.entries(ghosts).forEach(([key, ghost]) => {
    capturedPositions[key] = ghost.position.clone();
    capturedRotations[key] = ghost.rotation.clone();
  });

  // Create bezier curves once with more linear paths
  bezierCurves = {};
  Object.entries(capturedPositions).forEach(([key, startPos]) => {
    const endPos = MAZE_CENTER.clone();

    // Create a more linear path by placing control points closer to the line
    // This reduces the extreme acceleration/deceleration at the ends
    const midPoint = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      (startPos.y + endPos.y) / 2,
      (startPos.z + endPos.z) / 2
    );

    // Move control point closer to the midpoint for more linear movement
    const control = new THREE.Vector3(
      midPoint.x + (midPoint.x - (startPos.x + endPos.x) / 2) * 0.3,
      midPoint.y + 1.5, // Higher elevation for more dramatic arc
      midPoint.z + (midPoint.z - (startPos.z + endPos.z) / 2) * 0.3
    );

    bezierCurves[key] = new THREE.QuadraticBezierCurve3(
      startPos,
      control,
      endPos
    );
  });

  // Create camera curve once
  cameraScrollCurve = new THREE.CubicBezierCurve3(
    camera.position.clone(),
    new THREE.Vector3(
      (camera.position.x + MAZE_CENTER.x) / 2,
      2,
      (camera.position.z + MAZE_CENTER.z) / 2
    ),
    new THREE.Vector3(0.55675, 3, 0.45175),
    MAZE_CENTER.clone()
  );
  cameraScrollStartQuat = camera.quaternion.clone();

  homePositionsCaptured = true;
}

function startSmoothTransitionToHome() {
  isTransitioningToHome = true;
  transitionProgress = 0;

  // Capture current positions as transition start points
  transitionStartPositions = {};
  transitionStartRotations = {};
  Object.entries(ghosts).forEach(([key, ghost]) => {
    transitionStartPositions[key] = ghost.position.clone();
    transitionStartRotations[key] = ghost.rotation.clone();
  });
}

function animateTransitionToHome(dt: number) {
  transitionProgress += dt / TRANSITION_DURATION;
  const easedProgress = easeInOutCubic(Math.min(transitionProgress, 1));

  // Interpolate ghosts from their current positions to home path positions
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if ((homePathKeys as readonly string[]).includes(key)) {
      const path = homePaths[key as HomePathKey];
      if (path) {
        // Calculate target position on home path
        const targetPos = path.getPointAt(homeProgress);
        const startPos = transitionStartPositions[key];

        // Interpolate position
        ghost.position.lerpVectors(startPos, targetPos, easedProgress);

        // Interpolate rotation
        const startRot = transitionStartRotations[key];
        const tangent = path.getTangentAt(homeProgress).normalize();
        const targetRot = new THREE.Euler();

        if (key === "pacman") {
          const zRot = Math.atan2(tangent.x, tangent.z);
          targetRot.set(Math.PI / 2, Math.PI, zRot + Math.PI / 2);
        } else {
          // For ghosts, look at the tangent direction
          const lookAtPos = targetPos.clone().add(tangent);
          const tempObj = new THREE.Object3D();
          tempObj.position.copy(targetPos);
          tempObj.lookAt(lookAtPos);
          targetRot.copy(tempObj.rotation);
        }

        // Interpolate rotation
        ghost.rotation.set(
          startRot.x + (targetRot.x - startRot.x) * easedProgress,
          startRot.y + (targetRot.y - startRot.y) * easedProgress,
          startRot.z + (targetRot.z - startRot.z) * easedProgress
        );

        // Keep opacity at 1 during transition
        setGhostOpacity(ghost, 1);
      }
    }
  });

  // Check if transition is complete
  if (transitionProgress >= 1) {
    isTransitioningToHome = false;
    homePositionsCaptured = false;
  }
}

// Add a small threshold to prevent rapid state switching
let lastScrollProgress = 0;
const PROGRESS_THRESHOLD = 0.001; // Reduced for smoother movement

export function setScrollProgress(progress: number) {
  // Prevent rapid progress changes that cause flickering
  const progressChange = Math.abs(progress - lastScrollProgress);
  if (progressChange < PROGRESS_THRESHOLD) return;

  scrollProgress = Math.max(0, Math.min(1, progress));
  lastScrollProgress = progress;
}

function animateScrollToCenter(progress: number) {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const speed = GHOST_SPEED_MULTIPLIERS[key] || 1.0;

    // All ghosts start immediately, but travel at different speeds
    let ghostProgress = Math.min(progress * speed, 1);

    const curve = bezierCurves[key];
    if (!curve) return;

    // Use getPointAt for smoother interpolation along the curve
    const pos = curve.getPointAt(ghostProgress);
    ghost.position.copy(pos);

    // Interpolate rotation more smoothly
    const origRot = capturedRotations[key];
    const targetRot = new THREE.Euler(-Math.PI / 2, 0, 0);

    // Use easing for smoother rotation transition
    const easedProgress = easeInOutCubic(ghostProgress);
    ghost.rotation.set(
      origRot.x + (targetRot.x - origRot.x) * easedProgress,
      origRot.y + (targetRot.y - origRot.y) * easedProgress,
      origRot.z + (targetRot.z - origRot.z) * easedProgress
    );

    // Fade out in last 10%
    let opacity = 1;
    if (ghostProgress >= GHOST_OPACITY_FADE_START) {
      const fadeProgress =
        (ghostProgress - GHOST_OPACITY_FADE_START) /
        (1 - GHOST_OPACITY_FADE_START);
      opacity = 1 - fadeProgress;
      opacity = Math.max(0, opacity);
    }
    setGhostOpacity(ghost, opacity);
  });
}

function animateCameraScroll(progress: number) {
  if (!cameraScrollCurve || !cameraScrollStartQuat) return;
  const pos = cameraScrollCurve.getPoint(progress);
  camera.position.copy(pos);
  camera.fov = CAMERA_FOV;
  camera.updateProjectionMatrix();
  // Slerp rotation
  const q = new THREE.Quaternion();
  q.slerpQuaternions(cameraScrollStartQuat, endQuaternion, progress);
  camera.quaternion.copy(q);
}

function render() {
  renderer.render(scene, camera);
}

function animationLoop() {
  requestAnimationFrame(animationLoop);
  const dt = clock.getDelta();

  if (pacmanMixer) pacmanMixer.update(dt);

  // Handle different animation states
  if (isTransitioningToHome) {
    animateTransitionToHome(dt);
  } else if (scrollProgress > 0.01) {
    // Scroll animation
    if (!homePositionsCaptured) {
      captureGhostPositions();
      pausedHomeProgress = homeProgress;
    }
    animateScrollToCenter(scrollProgress);
    animateCameraScroll(scrollProgress);
  } else {
    // Home animation - start transition if we were in scroll animation
    if (homePositionsCaptured && !isTransitioningToHome) {
      startSmoothTransitionToHome();
    } else if (!isTransitioningToHome) {
      animateHomeLoop(dt);
    }
  }

  render();
}

async function setupScrollTrigger() {
  try {
    // Dynamic import GSAP and ScrollTrigger
    const gsapModule = await import("gsap");
    const scrollTriggerModule = await import("gsap/ScrollTrigger");

    const gsap = gsapModule.gsap || gsapModule.default;
    const ScrollTrigger =
      scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;

    if (!gsap || !ScrollTrigger) {
      throw new Error("GSAP modules not loaded properly");
    }

    gsap.registerPlugin(ScrollTrigger);

    // Get home section element
    const homeSection = document.querySelector(
      SELECTORS.homeSection
    ) as HTMLElement;
    if (!homeSection) {
      console.warn("Home section not found, scroll animation disabled");
      return;
    }

    // Create a timeline for proper scrub functionality
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: homeSection,
        start: "top top",
        end: "bottom top",
        scrub: 1, // 1 second scrub delay
        // Remove onUpdate from ScrollTrigger to prevent dual updates
      },
    });

    // Add a dummy animation to the timeline (required for scrub to work)
    tl.to(
      {},
      {
        duration: 1,
        onUpdate: function () {
          const progress = this.progress();
          setScrollProgress(progress);
        },
      }
    );

    scrollTriggerInitialized = true;
    console.log("✅ GSAP ScrollTrigger with scrub setup complete");
  } catch (error) {
    console.error("❌ GSAP ScrollTrigger setup failed:", error);
    setupManualScrollListener();
  }
}

function setupManualScrollListener() {
  console.log("Using manual scroll listener as fallback");
  window.addEventListener("scroll", () => {
    const homeSection = document.querySelector(
      SELECTORS.homeSection
    ) as HTMLElement;
    if (homeSection) {
      const rect = homeSection.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, 1 - rect.bottom / window.innerHeight)
      );
      setScrollProgress(progress);
    }
  });
}

export function initAnimationSystem() {
  // Start home animation loop
  animationState = "HOME";
  homeProgress = 0;
  scrollProgress = 0;
  animationLoop();

  // Setup GSAP ScrollTrigger
  setupScrollTrigger();
}
