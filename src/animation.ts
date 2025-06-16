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
  private animationDuration: number = 5; // 5 seconds for home animation
  private isAnimating: boolean = false;

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

  // Update animation
  public update(): void {
    if (!this.isAnimating) return;

    const deltaTime = clock.getDelta();
    this.animationTime += deltaTime;

    if (this.state === "HOME_ANIMATION") {
      this.updateHomeAnimation();
    }
  }

  private updateHomeAnimation(): void {
    const progress = Math.min(this.animationTime / this.animationDuration, 1);

    // Use easing function for smooth animation
    const easedProgress = this.easeInOutCubic(progress);

    // Animate objects along their paths
    this.animateObjectsAlongPaths(easedProgress);

    // Check if animation is complete
    if (progress >= 1) {
      this.completeHomeAnimation();
    }
  }

  private animateObjectsAlongPaths(progress: number): void {
    // Animate Pacman along its home path
    if (this.homePaths.pacman) {
      const pacmanPath = this.homePaths.pacman;
      const pacmanPoint = pacmanPath.getPointAt(progress);
      pacman.position.copy(pacmanPoint);
    }

    // Animate ghosts along their home paths
    Object.keys(ghosts).forEach((ghostKey, index) => {
      if (ghostKey === "pacman") return; // Skip pacman, already animated

      const ghost = ghosts[ghostKey];
      const pathKey = `ghost${index + 1}`;

      if (this.homePaths[pathKey]) {
        const ghostPath = this.homePaths[pathKey];
        const ghostPoint = ghostPath.getPointAt(progress);
        ghost.position.copy(ghostPoint);
      }
    });
  }

  private completeHomeAnimation(): void {
    this.isAnimating = false;
    this.state = "IDLE";
    console.log("AnimationSystem: Home animation completed");
  }

  // Easing function for smooth animation
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
export function animate(): void {
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
