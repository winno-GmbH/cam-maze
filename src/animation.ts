import * as THREE from "three";
import { camera, initCamera } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman } from "./objects";
import { paths, getPathsForSection } from "./paths";
import { MAZE_CENTER } from "./config";

// Animation state
export type AnimationState = "IDLE" | "HOME_ANIMATION" | "SCROLL_TO_CENTER";

const GHOST_SPEED_MULTIPLIERS: Record<string, number> = {
  ghost1: 1.25,
  ghost2: 1.14,
  ghost3: 1.05,
  ghost4: 0.97,
  ghost5: 0.89,
  pacman: 0.8,
};
const GHOSTS_END_AT = 0.8;
const GHOST_OPACITY_FADE_START = 0.9;
const GHOST_STAGGER_DELAY = 0.15;
const PACMAN_DELAY = 0.3;

class AnimationSystem {
  private state: AnimationState = "IDLE";
  private animationTime: number = 0;
  private animationDuration: number = 6; // 6 seconds for home animation
  private animationRunning: boolean = true;
  private timeOffset: number = 0;
  private bezierCurves: Record<string, THREE.QuadraticBezierCurve3> = {};
  private capturedPositions: Record<string, THREE.Vector3> = {};
  private capturedRotations: Record<string, THREE.Euler> = {};
  private scrollProgress = 0;

  constructor() {
    console.log("AnimationSystem: Initializing...");
    console.log("AnimationSystem: MAZE_CENTER:", MAZE_CENTER);
  }

  // Start the home animation
  public startHomeAnimation(): void {
    this.state = "HOME_ANIMATION";
    this.animationTime = 0;
    this.animationRunning = true;
    this.timeOffset = Date.now();
  }

  public pauseHomeAnimation(): void {
    this.animationRunning = false;
  }

  public resumeHomeAnimation(): void {
    this.state = "HOME_ANIMATION";
    this.animationRunning = true;
    this.timeOffset = Date.now();
  }

  public captureGhostPositions(): void {
    Object.entries(ghosts).forEach(([key, ghost]) => {
      this.capturedPositions[key] = ghost.position.clone();
      this.capturedRotations[key] = ghost.rotation.clone();
    });
  }

  public createBezierCurves(): void {
    this.bezierCurves = {};
    Object.entries(this.capturedPositions).forEach(([key, startPos]) => {
      const endPos = MAZE_CENTER.clone();
      const controlPoint = new THREE.Vector3(
        (startPos.x + endPos.x) / 2,
        2,
        (startPos.z + endPos.z) / 2
      );
      this.bezierCurves[key] = new THREE.QuadraticBezierCurve3(
        startPos,
        controlPoint,
        endPos
      );
    });
  }

  public startScrollToCenter(): void {
    this.pauseHomeAnimation();
    this.captureGhostPositions();
    this.createBezierCurves();
    this.state = "SCROLL_TO_CENTER";
  }

  public setScrollProgress(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
  }

  // Update animation (adapted from backup.js animate function)
  public update(): void {
    if (this.state === "HOME_ANIMATION" && this.animationRunning) {
      const currentTime = Date.now();
      const elapsed = (currentTime - this.timeOffset) / 1000;
      let t = (elapsed / this.animationDuration) % 1;
      let tPath = t;
      if (t > 0.95) {
        const blend = (t - 0.95) / 0.05;
        tPath = (1 - blend) * t + blend * 0;
      }
      this.animateHomePaths(tPath);
    } else if (this.state === "SCROLL_TO_CENTER") {
      this.animateScrollToCenter(this.scrollProgress);
    }
  }

  private animateHomePaths(t: number): void {
    const pathMapping = getPathsForSection("home");
    if (!pacman.visible) {
      pacman.visible = true;
    }

    // Animate all objects along their paths
    Object.entries(ghosts).forEach(([key, ghost]) => {
      const path = pathMapping[key as keyof typeof pathMapping];
      if (path) {
        const position = path.getPointAt(t);
        ghost.position.copy(position);
        const tangent = path.getTangentAt(t).normalize();
        ghost.lookAt(position.clone().add(tangent));

        // Special handling for pacman rotation (from backup.js)
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

  private animateScrollToCenter(scrollProgress: number): void {
    Object.entries(ghosts).forEach(([key, ghost]) => {
      const speed = GHOST_SPEED_MULTIPLIERS[key] || 1.0;
      let ghostProgress = Math.min((scrollProgress * speed) / GHOSTS_END_AT, 1);
      // Stagger for ghosts and pacman
      if (key !== "pacman") {
        ghostProgress = Math.max(
          0,
          Math.min(
            1,
            ((scrollProgress -
              GHOST_STAGGER_DELAY * (parseInt(key.replace("ghost", "")) - 1)) *
              speed) /
              GHOSTS_END_AT
          )
        );
      } else {
        ghostProgress = Math.max(
          0,
          Math.min(1, ((scrollProgress - PACMAN_DELAY) * speed) / GHOSTS_END_AT)
        );
      }
      const curve = this.bezierCurves[key];
      if (!curve) return;
      const position = curve.getPoint(ghostProgress);
      ghost.position.copy(position);
      // Rotation interpolation
      const originalRotation = this.capturedRotations[key];
      const targetRotation = new THREE.Euler(Math.PI / -2, 0, 0);
      const currentRotation = new THREE.Euler(
        originalRotation.x +
          (targetRotation.x - originalRotation.x) * ghostProgress,
        originalRotation.y +
          (targetRotation.y - originalRotation.y) * ghostProgress,
        originalRotation.z +
          (targetRotation.z - originalRotation.z) * ghostProgress
      );
      ghost.rotation.copy(currentRotation);
      // Opacity fade out in last 10%
      let opacity = 1;
      if (ghostProgress >= GHOST_OPACITY_FADE_START) {
        const fadeProgress =
          (ghostProgress - GHOST_OPACITY_FADE_START) /
          (1 - GHOST_OPACITY_FADE_START);
        opacity = 1 - fadeProgress;
        opacity = Math.max(0, opacity);
      }
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
    });
  }

  public resetToHome(): void {
    this.state = "HOME_ANIMATION";
    this.animationRunning = true;
    this.timeOffset = Date.now();
  }

  // Public getters
  public getState(): AnimationState {
    return this.state;
  }

  // Render function
  public render(): void {
    renderer.render(scene, camera);
  }
}

// Create and export the animation system
export const animationSystem = new AnimationSystem();

// Animation loop (adapted from backup.js)
function animate(): void {
  requestAnimationFrame(animate);

  // Update animation system
  animationSystem.update();

  // Render the scene
  animationSystem.render();
}

// Start the animation loop
export function startAnimationLoop(): void {
  console.log("AnimationSystem: Starting animation loop...");
  animate();
}

// Initialize animation system
export function initAnimationSystem(): void {
  console.log("AnimationSystem: Initializing animation system...");

  // Initialize camera
  initCamera();

  // Start animation loop
  startAnimationLoop();

  // Auto-start home animation after a short delay
  setTimeout(() => {
    console.log("AnimationSystem: Auto-starting home animation...");
    animationSystem.startHomeAnimation();
  }, 1000);
}
