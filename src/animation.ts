import * as THREE from "three";
import { camera, initCamera } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman } from "./objects";
import { paths, getPathsForSection } from "./paths";
import { MAZE_CENTER } from "./config";

// Animation state
export type AnimationState =
  | "IDLE"
  | "HOME_ANIMATION"
  | "TORN_TO_CENTER"
  | "SCROLL_ANIMATION";

class AnimationSystem {
  private state: AnimationState = "IDLE";
  private animationTime: number = 0;
  private animationDuration: number = 6; // 6 seconds for home animation
  private isAnimating: boolean = false;
  private animationRunning: boolean = true;
  private timeOffset: number = 0;
  private loopCount: number = 0;
  private tornStartTime: number = 0;
  private tornDuration: number = 0.7; // seconds
  private startPositions: { [key: string]: THREE.Vector3 } = {};

  // Object start positions (will be set when animation starts)
  private objectStartPositions: { [key: string]: THREE.Vector3 } = {};

  // Path data for each object
  private homePaths: {
    [key: string]: THREE.CurvePath<THREE.Vector3> | undefined;
  } = {};

  constructor() {
    console.log("AnimationSystem: Initializing...");
    console.log("AnimationSystem: MAZE_CENTER:", MAZE_CENTER);

    // Get home paths for all objects
    const homePathData = getPathsForSection("home");
    this.homePaths = homePathData;

    console.log(
      "AnimationSystem: Home paths loaded:",
      Object.keys(this.homePaths)
    );
  }

  // Start the home animation
  public startHomeAnimation(): void {
    if (this.isAnimating) return;

    console.log("AnimationSystem: Starting home animation...");
    console.log("AnimationSystem: Pacman position:", pacman.position);
    console.log("AnimationSystem: Ghosts:", ghosts);

    this.state = "HOME_ANIMATION";
    this.isAnimating = true;
    this.animationTime = 0;
    this.animationRunning = true;
    this.timeOffset = Date.now();
    this.loopCount = 0;

    // Store current positions of all objects
    this.objectStartPositions = {
      pacman: pacman.position.clone(),
      ghost1: ghosts.ghost1.position.clone(),
      ghost2: ghosts.ghost2.position.clone(),
      ghost3: ghosts.ghost3.position.clone(),
      ghost4: ghosts.ghost4.position.clone(),
      ghost5: ghosts.ghost5.position.clone(),
    };

    console.log("AnimationSystem: Home animation started");
  }

  // Update animation (adapted from backup.js animate function)
  public update(): void {
    if (!this.animationRunning) return;
    const delta = clock.getDelta();
    const currentTime = Date.now();

    if (this.state === "HOME_ANIMATION") {
      // Use a seamless modulo for t
      const elapsed = (currentTime - this.timeOffset) / 1000;
      let t = (elapsed / this.animationDuration) % 1;
      // For seamless loop, blend last 5% back to start
      let tPath = t;
      if (t > 0.95) {
        const blend = (t - 0.95) / 0.05;
        tPath = (1 - blend) * t + blend * 0; // blend to 0
      }
      this.animateHomePaths(tPath);
    } else if (this.state === "TORN_TO_CENTER") {
      const elapsed = (currentTime - this.tornStartTime) / 1000;
      const t = Math.min(elapsed / this.tornDuration, 1);
      this.animateTornToCenter(t);
      if (t >= 1) {
        this.state = "IDLE";
        this.isAnimating = false;
        this.animationRunning = false;
      }
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

  private saveCurrentPositions() {
    this.startPositions = {};
    Object.entries(ghosts).forEach(([key, ghost]) => {
      this.startPositions[key] = ghost.position.clone();
    });
  }

  private startTornToCenter() {
    this.state = "TORN_TO_CENTER";
    this.tornStartTime = Date.now();
  }

  private animateTornToCenter(t: number) {
    // Ease in for drama
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    Object.entries(ghosts).forEach(([key, ghost]) => {
      const start = this.startPositions[key];
      if (!start) return;
      ghost.position.lerpVectors(start, MAZE_CENTER, ease);
      // Optionally scale down/fade out
      const scale = 1 - 0.7 * ease;
      ghost.scale.set(scale, scale, scale);
      // Only apply opacity to Meshes (ghosts), not Groups (Pacman)
      if (
        ghost instanceof THREE.Mesh &&
        ghost.material &&
        "opacity" in ghost.material
      ) {
        (ghost.material as any).opacity = 1 - ease;
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

  // Stop animation (for future use)
  public stopAnimation(): void {
    this.animationRunning = false;
    this.isAnimating = false;
  }

  // Resume animation (for future use)
  public resumeAnimation(): void {
    this.animationRunning = true;
    this.isAnimating = true;
  }

  public triggerTornToCenter(): void {
    if (this.state !== "HOME_ANIMATION") return;
    this.saveCurrentPositions();
    this.startTornToCenter();
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
