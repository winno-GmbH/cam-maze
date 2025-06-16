import * as THREE from "three";
import { camera, initCamera } from "./camera";
import { scene, renderer, clock } from "./scene";
import { ghosts, pacman } from "./objects";
import { paths, getPathsForSection } from "./paths";
import { MAZE_CENTER } from "./config";

// Animation state
export type AnimationState = "IDLE" | "HOME_ANIMATION" | "SCROLL_ANIMATION";

class AnimationSystem {
  private state: AnimationState = "IDLE";
  private animationTime: number = 0;
  private animationDuration: number = 6; // 6 seconds for home animation (like backup)
  private isAnimating: boolean = false;
  private animationRunning: boolean = true;
  private timeOffset: number = 0;

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

    const currentTime = Date.now();
    const adjustedTime = currentTime - this.timeOffset;

    // Calculate time-based progress (6 second loop like in backup)
    const t = ((adjustedTime / 6000) % 6) / 6;

    // Get home path mapping
    const pathMapping = getPathsForSection("home");

    // Make sure pacman is visible
    if (!pacman.visible) {
      pacman.visible = true;
    }

    // Update pacman mixer if available
    const delta = clock.getDelta();
    // Note: pacmanMixer would be imported from objects.ts if needed
    // if (pacmanMixer) {
    //   pacmanMixer.update(delta);
    // }

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
