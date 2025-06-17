import * as THREE from "three";
import { camera, endQuaternion } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman, pacmanMixer } from "./objects";
import { getPathsForSection, cameraHomePath } from "./paths";
import { MAZE_CENTER, DOM_ELEMENTS, SELECTORS } from "./config";
import { isPOVActive } from "./pov-animation";

// Animation state
export type AnimationState =
  | "HOME"
  | "SCROLL_ANIMATION"
  | "POV_ANIMATION"
  | "TRANSITION";

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
        // Only set opacity to 1 when not in scroll animation to avoid overriding GSAP fade-out
        if (scrollProgress <= 0.01) {
          const timestamp = new Date()
            .toISOString()
            .split("T")[1]
            .split(".")[0];
          console.log(
            `[${timestamp}] Home Animation: Setting opacity=1 for ghost=${key}, scrollProgress=${scrollProgress.toFixed(
              3
            )}`
          );
          setGhostOpacity(ghost, 1);
        }
      }
    }
  });
}

function setGhostOpacity(ghost: THREE.Object3D, opacity: number) {
  let opacitySet = false;

  function applyOpacity(mesh: THREE.Mesh) {
    if (mesh.material) {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      materials.forEach((material: any) => {
        if (material) {
          // Handle different material types
          if (
            material.isMeshBasicMaterial ||
            material.isMeshStandardMaterial ||
            material.isMeshPhysicalMaterial ||
            material.isMeshMatcapMaterial
          ) {
            const oldOpacity = material.opacity;
            material.opacity = opacity;
            material.transparent = opacity < 1;
            material.depthWrite = opacity === 1;
            material.needsUpdate = true;
            opacitySet = true;

            // Debug: Log when opacity is set with more details
            if (opacity < 1 || oldOpacity !== opacity) {
              const timestamp = new Date()
                .toISOString()
                .split("T")[1]
                .split(".")[0];
              const caller =
                new Error().stack?.split("\n")[2]?.trim() || "unknown";
              console.log(
                `[${timestamp}] Set opacity ${opacity.toFixed(
                  3
                )} on material: ${
                  material.type || material.constructor.name
                }, oldOpacity: ${oldOpacity.toFixed(3)}, caller: ${caller}`
              );
            }
          } else if (material.isShaderMaterial) {
            // For shader materials, try to set opacity uniform if it exists
            if (material.uniforms && material.uniforms.opacity) {
              material.uniforms.opacity.value = opacity;
              material.needsUpdate = true;
              opacitySet = true;
            }
          } else {
            // Fallback for any material with opacity property
            if ("opacity" in material) {
              const oldOpacity = material.opacity;
              material.opacity = opacity;
              material.transparent = opacity < 1;
              material.depthWrite = opacity === 1;
              material.needsUpdate = true;
              opacitySet = true;

              // Debug: Log when opacity is set with more details
              if (opacity < 1 || oldOpacity !== opacity) {
                const timestamp = new Date()
                  .toISOString()
                  .split("T")[1]
                  .split(".")[0];
                const caller =
                  new Error().stack?.split("\n")[2]?.trim() || "unknown";
                console.log(
                  `[${timestamp}] Set opacity ${opacity.toFixed(
                    3
                  )} on fallback material, oldOpacity: ${oldOpacity.toFixed(
                    3
                  )}, caller: ${caller}`
                );
              }
            }
          }
        }
      });
    }
  }

  if (ghost instanceof THREE.Mesh) {
    applyOpacity(ghost);
  } else if (ghost instanceof THREE.Group) {
    ghost.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        applyOpacity(child);
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

        // Interpolate rotation using quaternions for shortest path
        const startRot = transitionStartRotations[key];
        const tangent = path.getTangentAt(homeProgress).normalize();
        const targetRot = new THREE.Euler();

        if (key === "pacman") {
          const zRot = Math.atan2(tangent.x, tangent.z);
          targetRot.set(Math.PI / 2, Math.PI, zRot + Math.PI / 2);
        } else {
          targetRot.setFromQuaternion(
            new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              tangent
            )
          );
        }

        // Convert to quaternions for smooth shortest-path interpolation
        const startQuat = new THREE.Quaternion().setFromEuler(startRot);
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);
        const interpolatedQuat = new THREE.Quaternion();

        // Slerp for shortest path rotation
        interpolatedQuat.slerpQuaternions(startQuat, targetQuat, easedProgress);

        // Apply the interpolated rotation
        ghost.quaternion.copy(interpolatedQuat);

        // Only set opacity to 1 when not in scroll animation to avoid overriding GSAP fade-out
        if (scrollProgress <= 0.01) {
          const timestamp = new Date()
            .toISOString()
            .split("T")[1]
            .split(".")[0];
          console.log(
            `[${timestamp}] Transition: Setting opacity=1 for ghost=${key}, scrollProgress=${scrollProgress.toFixed(
              3
            )}, transitionProgress=${transitionProgress.toFixed(3)}`
          );
          setGhostOpacity(ghost, 1);
        }
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

    // Interpolate rotation more smoothly using quaternions
    const origRot = capturedRotations[key];
    const targetRot = new THREE.Euler(-Math.PI / 2, 0, 0);

    // Use quaternions for shortest path rotation
    const startQuat = new THREE.Quaternion().setFromEuler(origRot);
    const endQuat = new THREE.Quaternion().setFromEuler(targetRot);
    const interpolatedQuat = new THREE.Quaternion();

    // Use easing for smoother rotation transition
    const easedProgress = easeInOutCubic(ghostProgress);
    interpolatedQuat.slerpQuaternions(startQuat, endQuat, easedProgress);

    // Apply the interpolated rotation
    ghost.quaternion.copy(interpolatedQuat);
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

  // Check if POV animation is active - if so, handle POV state
  if (isPOVActive()) {
    const oldState = animationState;
    animationState = "POV_ANIMATION";
    if (oldState !== animationState) {
      console.log(`Animation state changed: ${oldState} -> ${animationState}`);
    }
    // POV animation is controlling camera and ghosts, just render
    // Make sure ghosts are visible during POV animation
    Object.values(ghosts).forEach((ghost) => {
      ghost.visible = true;
    });
    render();
    return;
  }

  // Handle different animation states
  if (isTransitioningToHome) {
    const oldState = animationState;
    animationState = "TRANSITION";
    if (oldState !== animationState) {
      console.log(`Animation state changed: ${oldState} -> ${animationState}`);
    }
    animateTransitionToHome(dt);
  } else if (scrollProgress > 0.01) {
    // Scroll animation
    const oldState = animationState;
    animationState = "SCROLL_ANIMATION";
    if (oldState !== animationState) {
      console.log(
        `Animation state changed: ${oldState} -> ${animationState}, scrollProgress=${scrollProgress.toFixed(
          3
        )}`
      );
    }
    if (!homePositionsCaptured) {
      captureGhostPositions();
      pausedHomeProgress = homeProgress;
    }
    animateScrollToCenter(scrollProgress);
    animateCameraScroll(scrollProgress);
  } else {
    // Home animation - start transition if we were in scroll animation
    const oldState = animationState;
    animationState = "HOME";
    if (oldState !== animationState) {
      console.log(
        `Animation state changed: ${oldState} -> ${animationState}, scrollProgress=${scrollProgress.toFixed(
          3
        )}`
      );
    }
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

    // Add fade-out animation for all ghosts and Pacman
    tl.to(
      {},
      {
        duration: 1,
        onUpdate: function () {
          const progress = this.progress();
          setScrollProgress(progress);

          // Fade out all ghosts and Pacman from opacity 1 to 0
          // Start fade at 50% progress and complete at 100%
          let fadeOpacity = 1;
          if (progress >= 0.5) {
            const fadeProgress = (progress - 0.5) / 0.5; // 0 to 1 over last 50% (50% to 100%)
            fadeOpacity = 1 - fadeProgress;
            fadeOpacity = Math.max(0, fadeOpacity);
          }

          // Debug: Log fade opacity values with more details
          if (progress >= 0.45) {
            const timestamp = new Date()
              .toISOString()
              .split("T")[1]
              .split(".")[0];
            console.log(
              `[${timestamp}] GSAP Fade: progress=${progress.toFixed(
                3
              )}, fadeOpacity=${fadeOpacity.toFixed(
                3
              )}, scrollProgress=${scrollProgress.toFixed(3)}`
            );
          }

          // Apply fade to all ghosts and Pacman
          Object.values(ghosts).forEach((ghost) => {
            setGhostOpacity(ghost, fadeOpacity);
          });
        },
      }
    );

    scrollTriggerInitialized = true;
  } catch (error) {
    console.error("❌ GSAP ScrollTrigger setup failed:", error);
    setupManualScrollListener();
  }
}

function setupManualScrollListener() {
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
