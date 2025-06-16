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
  private animationDuration: number = 6000; // 6 seconds like in backup.js
  private isAnimating: boolean = false;
  private timeOffset: number = 0;
  private animationRunning: boolean = true;

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
    this.timeOffset = Date.now();

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
    const currentTime = Date.now();
    const adjustedTime = currentTime - this.timeOffset;

    // Use the same timing logic as backup.js
    const t = ((adjustedTime / this.animationDuration) % 6) / 6;
    const pathMapping = getPathsForSection("home") as { [key: string]: string };

    if (!pacman.visible) {
      pacman.visible = true;
    }

    // Update Pacman mixer if available
    // Note: You'll need to import pacmanMixer from objects.ts if you want this
    // if (pacmanMixer) {
    //   pacmanMixer.update(deltaTime);
    // }

    // Animate all objects along their paths (same logic as backup.js)
    Object.entries(ghosts).forEach(([key, ghost]) => {
      const pathKey = pathMapping[key];
      if (pathKey && paths[pathKey as keyof typeof paths]) {
        const path = paths[pathKey as keyof typeof paths];
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

// Animation loop (same as backup.js)
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
