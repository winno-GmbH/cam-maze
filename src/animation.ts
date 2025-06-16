import * as THREE from "three";
import { camera, initCamera } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman, pacmanMixer } from "./objects";
import { paths, getPathsForSection } from "./paths";
import { MAZE_CENTER, CAMERA_CONFIG, DOM_ELEMENTS } from "./config";

// Animation state
export type AnimationState = "HOME" | "SCROLL_ANIMATION" | "POV_ANIMATION";

// Constants from old animation-system.ts
const GHOSTS_END_AT = 0.8; // Ghosts finish their animation at 80% scroll
const GHOST_OPACITY_FADE_START = 0.9; // Last 10% of GHOST animation
const HOME_ANIMATION_SPEED = 0.03; // 3x slower than original

// Speed multipliers for different ghosts (higher = faster, reaches center earlier)
const GHOST_SPEED_MULTIPLIERS = {
  ghost1: 1.25, // Fastest - reaches center at 64% scroll
  ghost2: 1.14, // Reaches center at 70% scroll
  ghost3: 1.05, // Reaches center at 76% scroll
  ghost4: 0.97, // Reaches center at 82% scroll
  ghost5: 0.89, // Reaches center at 90% scroll
  pacman: 0.8, // Reaches center at 100% scroll - exactly with camera
};

// Staggered animation timing constants
const GHOST_STAGGER_DELAY = 0.15; // Delay between each ghost
const PACMAN_DELAY = 0.3; // Pacman starts 30% later than the first ghost

// Position tracking
const capturedPositions: { [key: string]: THREE.Vector3 } = {};
const capturedRotations: { [key: string]: THREE.Euler } = {};
const originalHomePositions: { [key: string]: THREE.Vector3 } = {};
const originalHomeRotations: { [key: string]: THREE.Euler } = {};
const originalHomeScales: { [key: string]: THREE.Vector3 } = {};
let homePositionsCaptured = false;
const bezierCurves: { [key: string]: THREE.QuadraticBezierCurve3 } = {};

// Animation timing
let timeOffset = 0;
let pauseTime = 0;
let savedAnimationProgress = 0;
let animationRunning = true;

// Global momentum smoothing for all scroll animations
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

class AnimationSystem {
  private state: AnimationState = "HOME";
  private animationTime: number = 0;
  private animationDuration: number = 6000; // 6 seconds like in backup.js
  private isAnimating: boolean = false;

  constructor() {
    // Capture original home positions once
    this.captureOriginalHomePositions();

    // Setup scroll handling
    this.setupScrollHandling();
  }

  // Capture ORIGINAL home positions (called only once at start)
  private captureOriginalHomePositions() {
    if (homePositionsCaptured) return;

    Object.keys(ghosts).forEach((ghostKey) => {
      if (ghosts[ghostKey]) {
        originalHomePositions[ghostKey] = ghosts[ghostKey].position.clone();
        originalHomeRotations[ghostKey] = ghosts[ghostKey].rotation.clone();
        originalHomeScales[ghostKey] = ghosts[ghostKey].scale.clone();
      }
    });
    homePositionsCaptured = true;
  }

  // Capture current positions for scroll animation
  private captureGhostPositions() {
    Object.keys(ghosts).forEach((ghostKey) => {
      if (ghosts[ghostKey]) {
        capturedPositions[ghostKey] = ghosts[ghostKey].position.clone();
        capturedRotations[ghostKey] = ghosts[ghostKey].rotation.clone();
      }
    });
  }

  // Create bezier curves for smooth movement to center
  private createBezierCurves() {
    Object.keys(capturedPositions).forEach((ghostKey) => {
      const startPos = capturedPositions[ghostKey].clone();
      const endPos = MAZE_CENTER.clone();

      // Control point: midpoint between start and end in x/z, but high up at y=2
      const controlPoint = new THREE.Vector3(
        (startPos.x + endPos.x) / 2,
        2,
        (startPos.z + endPos.z) / 2
      );

      bezierCurves[ghostKey] = new THREE.QuadraticBezierCurve3(
        startPos,
        controlPoint,
        endPos
      );
    });
  }

  // Move ghost along bezier curve
  private moveGhostOnCurve(ghostKey: string, ghostProgress: number) {
    if (
      !bezierCurves[ghostKey] ||
      !ghosts[ghostKey] ||
      !capturedPositions[ghostKey] ||
      !capturedRotations[ghostKey]
    )
      return;

    const ghost = ghosts[ghostKey];

    // Use bezier curve for smooth interpolation
    const position = bezierCurves[ghostKey].getPoint(ghostProgress);
    ghost.position.copy(position);

    // Simple rotation: interpolate from start rotation to (90°, 0°, 0°)
    const originalRotation = capturedRotations[ghostKey];
    const targetRotation = new THREE.Euler(Math.PI / -2, 0, 0);

    // Interpolate between original and target rotation
    const currentRotation = new THREE.Euler(
      originalRotation.x +
        (targetRotation.x - originalRotation.x) * ghostProgress,
      originalRotation.y +
        (targetRotation.y - originalRotation.y) * ghostProgress,
      originalRotation.z +
        (targetRotation.z - originalRotation.z) * ghostProgress
    );

    ghost.rotation.copy(currentRotation);

    // Handle opacity fade for ghosts (not pacman)
    if (ghostKey !== "pacman") {
      if (ghostProgress > GHOST_OPACITY_FADE_START) {
        const fadeProgress =
          (ghostProgress - GHOST_OPACITY_FADE_START) /
          (1 - GHOST_OPACITY_FADE_START);
        if ((ghost as any).material) {
          (ghost as any).material.opacity = 1 - fadeProgress;
        }
      } else {
        if ((ghost as any).material) {
          (ghost as any).material.opacity = 1;
        }
      }
    }
  }

  // Apply momentum smoothing to scroll progress
  private applyGlobalMomentumSmoothing(targetProgress: number): number {
    const currentTime = performance.now() / 1000;

    // Initialize on first run
    if (globalSmoothing.lastTime === 0) {
      globalSmoothing.lastTime = currentTime;
      globalSmoothing.lastTargetProgress = targetProgress;
      globalSmoothing.smoothedProgress = targetProgress;
      return targetProgress;
    }

    const deltaTime = Math.max(currentTime - globalSmoothing.lastTime, 0.001);

    // Calculate input velocity
    const inputVelocity =
      (targetProgress - globalSmoothing.lastTargetProgress) / deltaTime;

    // Smooth settings
    const friction = 0.88;
    const responsiveness = 0.2;
    const maxVelocity = 3.0;

    // Apply friction
    globalSmoothing.velocity *= friction;

    // Add input influence
    const progressDiff = targetProgress - globalSmoothing.smoothedProgress;
    const velocityInfluence = inputVelocity * 0.15;

    globalSmoothing.velocity +=
      progressDiff * responsiveness + velocityInfluence;
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

    return globalSmoothing.smoothedProgress;
  }

  // Setup scroll handling
  private setupScrollHandling() {
    let oldTop = 0;
    let isMovingForward = true;

    window.addEventListener("scroll", () => {
      const top = window.scrollY;
      const wasMovingForward = isMovingForward;
      isMovingForward = top > oldTop;
      oldTop = top;

      if (window.scrollY > 0 && animationRunning) {
        pauseTime = Date.now();
        animationRunning = false;
      } else if (window.scrollY === 0 && !animationRunning) {
        if (pauseTime) {
          timeOffset += Date.now() - pauseTime;
        }
        animationRunning = true;
      }
    });
  }

  // Start the home animation
  public startHomeAnimation(): void {
    if (this.isAnimating) return;

    this.state = "HOME";
    this.isAnimating = true;
    this.animationTime = 0;
    timeOffset = Date.now();
  }

  // Update animation
  public update(): void {
    if (!this.isAnimating) return;

    const deltaTime = clock.getDelta();
    this.animationTime += deltaTime;

    if (this.state === "HOME") {
      this.updateHomeAnimation();
    }
  }

  // Update home animation
  private updateHomeAnimation(): void {
    const currentTime = Date.now();
    const adjustedTime = currentTime - timeOffset;

    // Use the same timing logic as backup.js
    const t = ((adjustedTime / this.animationDuration) % 6) / 6;
    const pathMapping = getPathsForSection("home") as {
      [key: string]: THREE.CurvePath<THREE.Vector3>;
    };

    if (!pacman.visible) {
      pacman.visible = true;
    }

    // Update Pacman mixer if available
    if (pacmanMixer) {
      pacmanMixer.update(clock.getDelta());
    }

    // Animate all objects along their paths
    Object.entries(ghosts).forEach(([key, ghost]) => {
      const path = pathMapping[key];

      if (path) {
        const position = path.getPointAt(t);
        ghost.position.copy(position);
        const tangent = path.getTangentAt(t).normalize();
        ghost.lookAt(position.clone().add(tangent));

        if (key === "pacman") {
          const zRotation = Math.atan2(tangent.x, tangent.z);

          if ((ghost as any).previousZRotation === undefined) {
            (ghost as any).previousZRotation = zRotation;
          }

          let rotationDiff = zRotation - (ghost as any).previousZRotation;

          if (rotationDiff > Math.PI) {
            rotationDiff -= 2 * Math.PI;
          } else if (rotationDiff < -Math.PI) {
            rotationDiff += 2 * Math.PI;
          }

          const smoothFactor = 0.1;
          const smoothedRotation =
            (ghost as any).previousZRotation + rotationDiff * smoothFactor;

          (ghost as any).previousZRotation = smoothedRotation;
          ghost.rotation.set(
            Math.PI / 2,
            Math.PI,
            smoothedRotation + Math.PI / 2
          );
        }
      }
    });
  }

  // Public getters
  public getState(): AnimationState {
    return this.state;
  }

  public isAnimationActive(): boolean {
    return this.isAnimating;
  }

  // Render function
  public render(): void {
    renderer.render(scene, camera);
  }
}

// Create and export the animation system
export const animationSystem = new AnimationSystem();

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);

  // Update animation system
  animationSystem.update();

  // Render the scene
  animationSystem.render();
}

// Start the animation loop
export function startAnimationLoop(): void {
  animate();
}

// Initialize animation system
export function initAnimationSystem(): void {
  // Initialize camera
  initCamera();

  // Start animation loop
  startAnimationLoop();

  // Auto-start home animation after a short delay
  setTimeout(() => {
    animationSystem.startHomeAnimation();
  }, 1000);
}
