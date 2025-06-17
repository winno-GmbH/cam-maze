import * as THREE from "three";
import { camera, initCamera, endQuaternion } from "./camera";
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
const HOME_ANIMATION_SPEED = 0.03; // matches animation-system.ts
const ORIGINAL_FOV = 50;

// Camera home path setup (matches animation-system.ts)
const isMobile = window.innerWidth < 768;
const cameraStartPosition = isMobile
  ? new THREE.Vector3(0.5, 2.5, 2.5)
  : new THREE.Vector3(-2, 2.5, 2);
const cameraSecondPosition = isMobile
  ? new THREE.Vector3(0.5, 2.5, 2)
  : new THREE.Vector3(-1.5, 3, 2);
const cameraHomePath = new THREE.CubicBezierCurve3(
  cameraStartPosition,
  cameraSecondPosition,
  new THREE.Vector3(0.55675, 3, 0.45175),
  new THREE.Vector3(0.55675, 0.5, 0.45175)
);

let initialCameraPosition = camera.position.clone();
let initialCameraQuaternion = camera.quaternion.clone();

// Camera scroll-to-center path
let scrollCameraCurve: THREE.CubicBezierCurve3 | null = null;
let scrollCameraStartQuaternion: THREE.Quaternion | null = null;

class AnimationSystem {
  private state: AnimationState = "IDLE";
  private animationTime: number = 0;
  public animationDuration: number = 33; // 1/0.03 ≈ 33s for a full loop
  private animationRunning: boolean = true;
  private timeOffset: number = 0;
  private bezierCurves: Record<string, THREE.QuadraticBezierCurve3> = {};
  private capturedPositions: Record<string, THREE.Vector3> = {};
  private capturedRotations: Record<string, THREE.Euler> = {};
  private scrollProgress = 0;
  private savedHomeProgress = 0;

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
    // Store initial camera state for slerp
    initialCameraPosition = camera.position.clone();
    initialCameraQuaternion = camera.quaternion.clone();
  }

  public pauseHomeAnimation(): void {
    // Save current progress so we can resume from here
    const currentTime = Date.now();
    const elapsed = (currentTime - this.timeOffset) / 1000;
    this.savedHomeProgress = (elapsed / this.animationDuration) % 1;
    this.animationRunning = false;
  }

  public resumeHomeAnimation(): void {
    this.state = "HOME_ANIMATION";
    this.animationRunning = true;
    this.timeOffset =
      Date.now() - this.savedHomeProgress * this.animationDuration * 1000;
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
    if (this.state === "SCROLL_TO_CENTER") return;
    this.pauseHomeAnimation();
    this.captureGhostPositions();
    this.createBezierCurves();
    // Capture camera position/quaternion and create scroll-to-center path
    scrollCameraCurve = new THREE.CubicBezierCurve3(
      camera.position.clone(),
      new THREE.Vector3(
        (camera.position.x + MAZE_CENTER.x) / 2,
        2,
        (camera.position.z + MAZE_CENTER.z) / 2
      ),
      new THREE.Vector3(0.55675, 3, 0.45175),
      MAZE_CENTER.clone()
    );
    scrollCameraStartQuaternion = camera.quaternion.clone();
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
      // Use savedHomeProgress if paused/resumed
      let t = (this.savedHomeProgress + elapsed * HOME_ANIMATION_SPEED) % 1;
      let tPath = t;
      if (t > 0.95) {
        const blend = (t - 0.95) / 0.05;
        tPath = (1 - blend) * t + blend * 0;
      }
      this.animateHomePaths(tPath);
      this.animateCameraHome(tPath);
    } else if (this.state === "SCROLL_TO_CENTER") {
      this.animateScrollToCenter(this.scrollProgress);
      this.animateCameraScrollToCenter(this.scrollProgress);
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

  private animateCameraHome(t: number): void {
    // Animate camera position along the cubic bezier path
    const position = cameraHomePath.getPointAt(t);
    camera.position.copy(position);
    // Animate camera FOV
    camera.fov = ORIGINAL_FOV;
    camera.updateProjectionMatrix();
    // Animate camera rotation (slerp from initial to endQuaternion)
    if (t === 0) {
      camera.quaternion.copy(initialCameraQuaternion);
    } else {
      const currentQuaternion = new THREE.Quaternion();
      currentQuaternion.slerpQuaternions(
        initialCameraQuaternion,
        endQuaternion,
        t
      );
      camera.quaternion.copy(currentQuaternion);
    }
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

  private animateCameraScrollToCenter(scrollProgress: number): void {
    if (!scrollCameraCurve || !scrollCameraStartQuaternion) return;
    // Camera position
    const position = scrollCameraCurve.getPoint(Math.min(scrollProgress, 1));
    camera.position.copy(position);
    // Camera FOV
    camera.fov = ORIGINAL_FOV;
    camera.updateProjectionMatrix();
    // Camera rotation: slerp from start to endQuaternion
    const q = new THREE.Quaternion();
    q.slerpQuaternions(
      scrollCameraStartQuaternion,
      endQuaternion,
      Math.min(scrollProgress, 1)
    );
    camera.quaternion.copy(q);
  }

  public resetToHome(): void {
    this.state = "HOME_ANIMATION";
    this.animationRunning = true;
    this.timeOffset = Date.now();
    // Resume from saved progress
    this.savedHomeProgress = 0;
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
