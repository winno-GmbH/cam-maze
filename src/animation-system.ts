import * as THREE from "three";
import { ghosts, pacmanMixer, clock } from "./objects";
import { MAZE_CENTER } from "./config";
import { AnimationState, BezierCurve, GhostPosition } from "./types";
import { pathsMap } from "./paths";

// 1. STATE MANAGEMENT
let currentAnimationState: AnimationState = "HOME";
let isFirstScroll = true;

// 2. POSITION & BEZIER SYSTEM
const capturedPositions: { [key: string]: THREE.Vector3 } = {};
const bezierCurves: { [key: string]: BezierCurve } = {};
const originalPositions: { [key: string]: THREE.Vector3 } = {};

// Store original positions for all ghosts
function storeOriginalPositions() {
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghostKey !== "pacman" && ghosts[ghostKey]) {
      originalPositions[ghostKey] = ghosts[ghostKey].position.clone();
    }
  });
}

// 2.1 Capture current ghost positions when first scroll happens
function captureGhostPositions() {
  Object.keys(ghosts).forEach((ghostKey) => {
    if (ghostKey !== "pacman" && ghosts[ghostKey]) {
      capturedPositions[ghostKey] = ghosts[ghostKey].position.clone();
    }
  });
  console.log("Ghost positions captured:", capturedPositions);
}

// 2.2 Create bezier curves from captured positions to maze center and back
function createBezierCurves() {
  Object.keys(capturedPositions).forEach((ghostKey) => {
    const startPos = capturedPositions[ghostKey];
    const midPos = MAZE_CENTER.clone();
    const endPos = startPos.clone(); // Back to original position

    bezierCurves[ghostKey] = {
      startPosition: startPos,
      midPosition: midPos,
      endPosition: endPos,
      curve: new THREE.QuadraticBezierCurve3(startPos, midPos, endPos),
    };
  });
  console.log("Bezier curves created:", bezierCurves);
}

// 2.3 Move ghost on curve based on scroll progress (0-1)
function moveGhostOnCurve(ghostKey: string, scrollProgress: number) {
  if (!bezierCurves[ghostKey] || !ghosts[ghostKey]) return;

  const curve = bezierCurves[ghostKey].curve;
  const position = curve.getPointAt(scrollProgress);

  // Calculate opacity (fade out in last 20%)
  let opacity = 1;
  if (scrollProgress > 0.8) {
    opacity = 1 - (scrollProgress - 0.8) / 0.2;
  }

  ghosts[ghostKey].position.copy(position);

  // Handle material opacity for both Mesh and Group
  const ghost = ghosts[ghostKey];
  if (ghost instanceof THREE.Mesh && ghost.material) {
    if (Array.isArray(ghost.material)) {
      ghost.material.forEach((mat) => {
        if (mat.transparent !== undefined) mat.opacity = opacity;
      });
    } else {
      if (ghost.material.transparent !== undefined)
        ghost.material.opacity = opacity;
    }
  } else if (ghost instanceof THREE.Group) {
    ghost.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat.transparent !== undefined) mat.opacity = opacity;
          });
        } else {
          if (child.material.transparent !== undefined)
            child.material.opacity = opacity;
        }
      }
    });
  }
}

// 3. SCROLL MANAGEMENT
function onFirstScroll() {
  if (isFirstScroll) {
    console.log("First scroll detected - switching to scroll animation");
    captureGhostPositions();
    createBezierCurves();
    currentAnimationState = "SCROLL_ANIMATION";
    isFirstScroll = false;
  }
}

// 4. ANIMATION LOOP
let animationTime = 0;
function animationLoop() {
  const deltaTime = clock.getDelta();
  animationTime += deltaTime;

  // Only run path animation when in HOME state
  if (currentAnimationState === "HOME") {
    // Update pacman animation mixer
    if (pacmanMixer) {
      pacmanMixer.update(deltaTime);
    }

    // Move ghosts along their paths
    Object.keys(ghosts).forEach((ghostKey) => {
      if (ghostKey === "pacman") return;

      const path = pathsMap[ghostKey];
      if (path) {
        const t = (animationTime * 0.1) % 1; // Speed control
        const position = path.getPointAt(t);
        if (position && ghosts[ghostKey]) {
          ghosts[ghostKey].position.copy(position);

          // Set opacity to 1 for both Mesh and Group
          const ghost = ghosts[ghostKey];
          if (ghost instanceof THREE.Mesh && ghost.material) {
            if (Array.isArray(ghost.material)) {
              ghost.material.forEach((mat) => {
                if (mat.transparent !== undefined) mat.opacity = 1;
              });
            } else {
              if (ghost.material.transparent !== undefined)
                ghost.material.opacity = 1;
            }
          } else if (ghost instanceof THREE.Group) {
            ghost.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat) => {
                    if (mat.transparent !== undefined) mat.opacity = 1;
                  });
                } else {
                  if (child.material.transparent !== undefined)
                    child.material.opacity = 1;
                }
              }
            });
          }
        }
      }
    });
  }

  requestAnimationFrame(animationLoop);
}

// 5. GSAP INTEGRATION
function setupScrollTriggers() {
  // Import GSAP dynamically to avoid build issues
  if (typeof window !== "undefined" && (window as any).gsap) {
    const gsap = (window as any).gsap;
    const ScrollTrigger = gsap.ScrollTrigger;

    // Intro ScrollTrigger - moves ghosts to center
    ScrollTrigger.create({
      trigger: ".sc--intro",
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self: any) => {
        onFirstScroll();
        if (currentAnimationState === "SCROLL_ANIMATION") {
          const progress = self.progress;
          Object.keys(bezierCurves).forEach((ghostKey) => {
            moveGhostOnCurve(ghostKey, progress);
          });
        }
      },
    });

    // Home ScrollTrigger - moves ghosts back from center
    ScrollTrigger.create({
      trigger: ".sc--home",
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self: any) => {
        if (currentAnimationState === "SCROLL_ANIMATION") {
          const progress = 1 - self.progress; // Reverse direction
          Object.keys(bezierCurves).forEach((ghostKey) => {
            moveGhostOnCurve(ghostKey, progress);
          });
        }
      },
      onLeave: () => {
        // Back to top - reset to HOME state
        if (window.scrollY === 0) {
          console.log("Back to top - resetting to HOME state");
          currentAnimationState = "HOME";
          isFirstScroll = true;
        }
      },
    });

    // POV ScrollTrigger - position ghosts for POV section
    ScrollTrigger.create({
      trigger: ".sc--pov",
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        // Position ghosts at maze center for POV animations
        Object.keys(ghosts).forEach((ghostKey) => {
          if (ghostKey !== "pacman" && ghosts[ghostKey]) {
            ghosts[ghostKey].position.copy(MAZE_CENTER);

            // Set opacity to 1 for both Mesh and Group
            const ghost = ghosts[ghostKey];
            if (ghost instanceof THREE.Mesh && ghost.material) {
              if (Array.isArray(ghost.material)) {
                ghost.material.forEach((mat) => {
                  if (mat.transparent !== undefined) mat.opacity = 1;
                });
              } else {
                if (ghost.material.transparent !== undefined)
                  ghost.material.opacity = 1;
              }
            } else if (ghost instanceof THREE.Group) {
              ghost.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                      if (mat.transparent !== undefined) mat.opacity = 1;
                    });
                  } else {
                    if (child.material.transparent !== undefined)
                      child.material.opacity = 1;
                  }
                }
              });
            }
          }
        });
      },
    });
  }
}

// Initialize the animation system
export function initAnimationSystem() {
  console.log("Initializing animation system...");

  // Store original positions
  storeOriginalPositions();

  // Setup GSAP ScrollTriggers
  setupScrollTriggers();

  // Start animation loop
  animationLoop();

  console.log("Animation system initialized");
}
