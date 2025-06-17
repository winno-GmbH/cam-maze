import * as THREE from "three";
import { camera, endQuaternion } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman, pacmanMixer } from "./objects";
import { getPathsForSection, cameraHomePath } from "./paths";
import { MAZE_CENTER, DOM_ELEMENTS, SELECTORS } from "./config";

// Animation state
export type AnimationState = "HOME" | "SCROLL_ANIMATION";

const HOME_ANIMATION_SPEED = 0.03; // loop speed
const CAMERA_FOV = 50;

// Speed multipliers for scroll animation - higher = faster
const GHOST_SPEED_MULTIPLIERS: Record<string, number> = {
  ghost1: 1.25, // Fastest - arrives first
  ghost2: 1.14,
  ghost3: 1.05,
  ghost4: 0.97,
  ghost5: 0.89,
  pacman: 0.8, // Slowest - arrives last
};

// When ghosts should finish their animation (0.8 = 80% of scroll progress)
const GHOSTS_END_AT = 0.8;
const GHOST_OPACITY_FADE_START = 0.9;
const GHOST_STAGGER_DELAY = 0.15; // Delay between each ghost
const PACMAN_DELAY = 0.3; // Additional delay for pacman

let animationState: AnimationState = "HOME";
let homeProgress = 0;
let animationPaused = false;
let pausedHomeProgress = 0; // Store the progress when paused
let bezierCurves: Record<string, THREE.QuadraticBezierCurve3> = {};
let capturedPositions: Record<string, THREE.Vector3> = {};
let capturedRotations: Record<string, THREE.Euler> = {};
let scrollProgress = 0;
let cameraScrollCurve: THREE.CubicBezierCurve3 | null = null;
let cameraScrollStartQuat: THREE.Quaternion | null = null;
let scrollTriggerInitialized = false;
let lastScrollProgress = 0; // Track last progress to prevent rapid switching
let stateTransitionThreshold = 0.01; // Minimum progress change to trigger state switch

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

function animateHomeLoop(dt: number) {
  if (animationPaused) return;
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
  Object.entries(ghosts).forEach(([key, ghost]) => {
    capturedPositions[key] = ghost.position.clone();
    capturedRotations[key] = ghost.rotation.clone();
  });
}

function createBezierCurves() {
  bezierCurves = {};
  Object.entries(capturedPositions).forEach(([key, startPos]) => {
    const endPos = MAZE_CENTER.clone();
    const control = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      2,
      (startPos.z + endPos.z) / 2
    );
    bezierCurves[key] = new THREE.QuadraticBezierCurve3(
      startPos,
      control,
      endPos
    );
  });
}

function animateScrollToCenter(progress: number) {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const speed = GHOST_SPEED_MULTIPLIERS[key] || 1.0;

    // All ghosts start immediately, but travel at different speeds
    // This creates the staggered arrival effect
    let ghostProgress = Math.min(progress * speed, 1);

    const curve = bezierCurves[key];
    if (!curve) return;

    const pos = curve.getPoint(ghostProgress);
    ghost.position.copy(pos);

    // Interpolate rotation
    const origRot = capturedRotations[key];
    const targetRot = new THREE.Euler(-Math.PI / 2, 0, 0);
    ghost.rotation.set(
      origRot.x + (targetRot.x - origRot.x) * ghostProgress,
      origRot.y + (targetRot.y - origRot.y) * ghostProgress,
      origRot.z + (targetRot.z - origRot.z) * ghostProgress
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
  if (animationState === "HOME") {
    animateHomeLoop(dt);
  } else if (animationState === "SCROLL_ANIMATION") {
    // Only animate if we have valid curves and positions
    if (
      Object.keys(bezierCurves).length > 0 &&
      Object.keys(capturedPositions).length > 0
    ) {
      animateScrollToCenter(scrollProgress);
      animateCameraScroll(scrollProgress);
    }
  }
  render();
}

export function setScrollProgress(progress: number) {
  // Prevent rapid progress changes that cause flickering
  const progressChange = Math.abs(progress - lastScrollProgress);
  if (progressChange < 0.001) return; // Ignore tiny changes

  scrollProgress = Math.max(0, Math.min(1, progress));
  lastScrollProgress = progress;

  // Trigger scroll animation when progress starts (with threshold)
  if (
    animationState === "HOME" &&
    progress > stateTransitionThreshold &&
    !animationPaused
  ) {
    animationPaused = true;
    pausedHomeProgress = homeProgress; // Store current progress
    captureGhostPositions();
    createBezierCurves();
    // Camera bezier
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
    animationState = "SCROLL_ANIMATION";
    console.log("Switched to SCROLL_ANIMATION at progress:", progress);
  }

  // Resume home animation when scrolling back to top (with threshold)
  if (
    animationState === "SCROLL_ANIMATION" &&
    progress <= stateTransitionThreshold
  ) {
    animationState = "HOME";
    animationPaused = false;
    homeProgress = pausedHomeProgress; // Resume from where we paused
    scrollProgress = 0;
    lastScrollProgress = 0;

    // Reset scroll animation state
    bezierCurves = {};
    capturedPositions = {};
    capturedRotations = {};
    cameraScrollCurve = null;
    cameraScrollStartQuat = null;

    console.log("Resuming home animation from progress:", pausedHomeProgress);
  }
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

    // Configure GSAP for smooth performance
    gsap.config({
      nullTargetWarn: false,
    });

    // Optimize ScrollTrigger for smooth performance
    ScrollTrigger.config({
      ignoreMobileResize: true,
      syncInterval: 60,
    });

    // Get home section element
    const homeSection = document.querySelector(
      SELECTORS.homeSection
    ) as HTMLElement;
    if (!homeSection) {
      console.warn("Home section not found, scroll animation disabled");
      return;
    }

    // Create a timeline for smooth scrubbing
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: homeSection,
        start: "top top",
        end: "bottom top",
        scrub: 1, // Smooth scrubbing with 1 second delay
        onUpdate: (self) => {
          // Throttle updates to prevent flickering
          requestAnimationFrame(() => {
            setScrollProgress(self.progress);
          });
        },
        onEnter: () => {
          console.log("ScrollTrigger: Entered home section");
        },
        onLeave: () => {
          console.log("ScrollTrigger: Left home section");
        },
        onEnterBack: () => {
          console.log("ScrollTrigger: Entered back home section");
        },
        onLeaveBack: () => {
          console.log("ScrollTrigger: Left back home section");
        },
      },
    });

    // Add a dummy animation to the timeline (required for scrub to work)
    tl.to(
      {},
      {
        duration: 1,
        onUpdate: function () {
          // This will be called with smooth interpolation
          const progress = this.progress();
          requestAnimationFrame(() => {
            setScrollProgress(progress);
          });
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
  animationPaused = false;
  homeProgress = 0;
  animationLoop();

  // Setup GSAP ScrollTrigger
  setupScrollTrigger();
}
