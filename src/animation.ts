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
    const curve = bezierCurves[key];
    if (!curve) return;
    const pos = curve.getPoint(progress);
    ghost.position.copy(pos);
    // Interpolate rotation
    const origRot = capturedRotations[key];
    const targetRot = new THREE.Euler(-Math.PI / 2, 0, 0);
    ghost.rotation.set(
      origRot.x + (targetRot.x - origRot.x) * progress,
      origRot.y + (targetRot.y - origRot.y) * progress,
      origRot.z + (targetRot.z - origRot.z) * progress
    );
    // Fade out in last 10%
    let opacity = 1;
    if (progress > 0.9) opacity = 1 - (progress - 0.9) / 0.1;
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
    animateScrollToCenter(scrollProgress);
    animateCameraScroll(scrollProgress);
  }
  render();
}

export function setScrollProgress(progress: number) {
  scrollProgress = Math.max(0, Math.min(1, progress));

  // Trigger scroll animation when progress starts
  if (animationState === "HOME" && progress > 0 && !animationPaused) {
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
  }

  if (animationState === "SCROLL_ANIMATION" && progress === 0) {
    animationState = "HOME";
    animationPaused = false;
    homeProgress = pausedHomeProgress;
    scrollProgress = 0;

    bezierCurves = {};
    capturedPositions = {};
    capturedRotations = {};
    cameraScrollCurve = null;
    cameraScrollStartQuat = null;
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

    // Get home section element
    const homeSection = document.querySelector(
      SELECTORS.homeSection
    ) as HTMLElement;
    if (!homeSection) {
      console.warn("Home section not found, scroll animation disabled");
      return;
    }

    // Create ScrollTrigger for home section bottom to top animation
    ScrollTrigger.create({
      trigger: homeSection,
      start: "top top", // Start when top of home section hits top of viewport
      end: "bottom top", // End when bottom of home section hits top of viewport
      onUpdate: (self) => {
        setScrollProgress(self.progress);
      },
    });

    scrollTriggerInitialized = true;
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
