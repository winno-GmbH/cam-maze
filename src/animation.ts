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
  private animationDuration: number = 3; // 3 seconds for home animation
  private isAnimating: boolean = false;

  // Animation targets
  private cameraStartPosition: THREE.Vector3;
  private cameraEndPosition: THREE.Vector3;
  private cameraStartLookAt: THREE.Vector3;
  private cameraEndLookAt: THREE.Vector3;

  // Object start positions (will be set when animation starts)
  private objectStartPositions: { [key: string]: THREE.Vector3 } = {};

  constructor() {
    console.log("AnimationSystem: Initializing...");
    console.log("AnimationSystem: MAZE_CENTER:", MAZE_CENTER);

    // Initialize camera positions
    this.cameraStartPosition = camera.position.clone();
    this.cameraEndPosition = new THREE.Vector3(
      MAZE_CENTER.x,
      MAZE_CENTER.y + 2,
      MAZE_CENTER.z + 3
    );
    this.cameraStartLookAt = new THREE.Vector3(0, 0, 0); // Will be set from current camera
    this.cameraEndLookAt = MAZE_CENTER.clone();

    console.log(
      "AnimationSystem: Camera start position:",
      this.cameraStartPosition
    );
    console.log(
      "AnimationSystem: Camera end position:",
      this.cameraEndPosition
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

    // Store current camera look-at
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    this.cameraStartLookAt = camera.position
      .clone()
      .add(direction.multiplyScalar(10));

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

    // Animate camera
    this.animateCamera(easedProgress);

    // Animate objects to center
    this.animateObjectsToCenter(easedProgress);

    // Check if animation is complete
    if (progress >= 1) {
      this.completeHomeAnimation();
    }
  }

  private animateCamera(progress: number): void {
    // Interpolate camera position
    camera.position.lerpVectors(
      this.cameraStartPosition,
      this.cameraEndPosition,
      progress
    );

    // Interpolate camera look-at
    const currentLookAt = new THREE.Vector3();
    currentLookAt.lerpVectors(
      this.cameraStartLookAt,
      this.cameraEndLookAt,
      progress
    );

    camera.lookAt(currentLookAt);
    camera.updateProjectionMatrix();
  }

  private animateObjectsToCenter(progress: number): void {
    const centerPosition = MAZE_CENTER.clone();
    centerPosition.y += 0.5; // Slightly above maze center

    // Animate Pacman
    pacman.position.lerpVectors(
      this.objectStartPositions.pacman,
      centerPosition,
      progress
    );

    // Animate ghosts in a circle around the center
    const ghostRadius = 0.8;
    const ghostCount = 5;

    Object.keys(ghosts).forEach((ghostKey, index) => {
      if (ghostKey === "pacman") return; // Skip pacman, already animated

      const ghost = ghosts[ghostKey];
      const angle = (index / ghostCount) * Math.PI * 2;

      const ghostEndPosition = new THREE.Vector3(
        centerPosition.x + Math.cos(angle) * ghostRadius,
        centerPosition.y,
        centerPosition.z + Math.sin(angle) * ghostRadius
      );

      ghost.position.lerpVectors(
        this.objectStartPositions[ghostKey],
        ghostEndPosition,
        progress
      );
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
