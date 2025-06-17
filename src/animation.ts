import * as THREE from "three";
import { camera } from "./camera";
import { scene, renderer } from "./scene";
import { ghosts, pacman } from "./objects";
import { getPathsForSection } from "./paths";
import { DOM_ELEMENTS } from "./selectors";
import { isPOVActive, updatePOVAnimation } from "./pov-animation";

// Animation state management
export type AnimationState =
  | "HOME"
  | "SCROLL_ANIMATION"
  | "POV_ANIMATION"
  | "TRANSITIONING";

// Centralized animation controller
class AnimationController {
  private state: AnimationState = "HOME";
  private homeProgress = 0;
  private scrollProgress = 0;
  private transitionProgress = 0;
  private isTransitioning = false;

  // Home positions for restoration
  private homePositions: Record<string, THREE.Vector3> = {};
  private homeRotations: Record<string, THREE.Euler> = {};
  private homeScales: Record<string, THREE.Vector3> = {};
  private homePositionsCaptured = false;

  // Scroll animation curves
  private bezierCurves: Record<string, THREE.QuadraticBezierCurve3> = {};
  private cameraScrollCurve: THREE.CubicBezierCurve3 | null = null;
  private cameraScrollStartQuat: THREE.Quaternion | null = null;

  // Transition start positions
  private transitionStartPositions: Record<string, THREE.Vector3> = {};
  private transitionStartRotations: Record<string, THREE.Euler> = {};

  // Animation speeds and constants
  private readonly HOME_ANIMATION_SPEED = 0.3;
  private readonly TRANSITION_DURATION = 0.5;
  private readonly CAMERA_FOV = 75;
  private readonly MAZE_CENTER = new THREE.Vector3(0.55675, 0.45, 0.45175);

  // Ghost speed multipliers for scroll animation
  private readonly GHOST_SPEED_MULTIPLIERS: Record<string, number> = {
    ghost1: 1.2,
    ghost2: 1.0,
    ghost3: 0.8,
    ghost4: 0.6,
    ghost5: 0.4,
    pacman: 0.3, // Pacman arrives last
  };

  constructor() {
    this.setupHomePaths();
  }

  private setupHomePaths() {
    const homePathKeys = [
      "pacman",
      "ghost1",
      "ghost2",
      "ghost3",
      "ghost4",
      "ghost5",
    ] as const;
    const homePaths = getPathsForSection("home") as Record<
      string,
      THREE.CurvePath<THREE.Vector3>
    >;

    // Store home paths for later use
    this.homePaths = homePaths;
    this.homePathKeys = homePathKeys;
  }

  private homePaths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};
  private homePathKeys: readonly string[] = [];

  public getState(): AnimationState {
    return this.state;
  }

  public update(dt: number) {
    // Check POV state first
    if (isPOVActive()) {
      this.handlePOVState();
      return;
    }

    // Handle different states
    switch (this.state) {
      case "HOME":
        this.animateHome(dt);
        break;
      case "SCROLL_ANIMATION":
        this.animateScrollToCenter();
        break;
      case "TRANSITIONING":
        this.animateTransition(dt);
        break;
    }

    this.render();
  }

  private handlePOVState() {
    this.state = "POV_ANIMATION";

    // Capture home positions when POV starts
    if (!this.homePositionsCaptured) {
      this.captureHomePositions();
    }

    // Make sure ghosts are visible during POV
    Object.values(ghosts).forEach((ghost) => {
      ghost.visible = true;
    });

    this.render();
  }

  public setScrollProgress(progress: number) {
    const newProgress = Math.max(0, Math.min(1, progress));

    if (Math.abs(newProgress - this.scrollProgress) < 0.001) return;

    this.scrollProgress = newProgress;

    if (newProgress > 0.01) {
      // Start scroll animation
      if (this.state === "HOME") {
        this.startScrollAnimation();
      }
    } else {
      // Return to home
      if (this.state === "SCROLL_ANIMATION") {
        this.startTransitionToHome();
      }
    }
  }

  private startScrollAnimation() {
    this.state = "SCROLL_ANIMATION";

    if (!this.homePositionsCaptured) {
      this.captureHomePositions();
      this.createScrollCurves();
    }
  }

  private startTransitionToHome() {
    this.state = "TRANSITIONING";
    this.isTransitioning = true;
    this.transitionProgress = 0;

    // Capture current positions as transition start points
    this.transitionStartPositions = {};
    this.transitionStartRotations = {};

    Object.entries(ghosts).forEach(([key, ghost]) => {
      this.transitionStartPositions[key] = ghost.position.clone();
      this.transitionStartRotations[key] = ghost.rotation.clone();
    });
  }

  private captureHomePositions() {
    if (this.homePositionsCaptured) return;

    Object.entries(ghosts).forEach(([key, ghost]) => {
      this.homePositions[key] = ghost.position.clone();
      this.homeRotations[key] = ghost.rotation.clone();
      this.homeScales[key] = ghost.scale.clone();
    });

    this.homePositionsCaptured = true;
  }

  private createScrollCurves() {
    // Create bezier curves for each ghost
    this.bezierCurves = {};
    Object.entries(this.homePositions).forEach(([key, startPos]) => {
      const endPos = this.MAZE_CENTER.clone();
      const midPoint = new THREE.Vector3(
        (startPos.x + endPos.x) / 2,
        (startPos.y + endPos.y) / 2,
        (startPos.z + endPos.z) / 2
      );

      const control = new THREE.Vector3(
        midPoint.x + (midPoint.x - (startPos.x + endPos.x) / 2) * 0.3,
        midPoint.y + 1.5,
        midPoint.z + (midPoint.z - (startPos.z + endPos.z) / 2) * 0.3
      );

      this.bezierCurves[key] = new THREE.QuadraticBezierCurve3(
        startPos,
        control,
        endPos
      );
    });

    // Create camera curve
    this.cameraScrollCurve = new THREE.CubicBezierCurve3(
      camera.position.clone(),
      new THREE.Vector3(
        (camera.position.x + this.MAZE_CENTER.x) / 2,
        2,
        (camera.position.z + this.MAZE_CENTER.z) / 2
      ),
      new THREE.Vector3(0.55675, 3, 0.45175),
      this.MAZE_CENTER.clone()
    );
    this.cameraScrollStartQuat = camera.quaternion.clone();
  }

  private animateHome(dt: number) {
    this.homeProgress =
      (this.homeProgress + dt * this.HOME_ANIMATION_SPEED) % 1;

    Object.entries(ghosts).forEach(([key, ghost]) => {
      if (this.homePathKeys.includes(key)) {
        const path = this.homePaths[key];
        if (path) {
          const t = this.homeProgress;
          const pos = path.getPointAt(t);
          ghost.position.copy(pos);

          const tangent = path.getTangentAt(t).normalize();
          ghost.lookAt(pos.clone().add(tangent));

          // Pacman rotation smoothing
          if (key === "pacman") {
            const zRot = Math.atan2(tangent.x, tangent.z);
            ghost.rotation.set(Math.PI / 2, Math.PI, zRot + Math.PI / 2);
          }

          this.setGhostOpacity(ghost, 1);
        }
      }
    });
  }

  private animateScrollToCenter() {
    Object.entries(ghosts).forEach(([key, ghost]) => {
      const speed = this.GHOST_SPEED_MULTIPLIERS[key] || 1.0;
      let ghostProgress = Math.min(this.scrollProgress * speed, 1);

      const curve = this.bezierCurves[key];
      if (!curve) return;

      const pos = curve.getPointAt(ghostProgress);
      ghost.position.copy(pos);

      // Interpolate rotation
      const origRot = this.homeRotations[key];
      const targetRot = new THREE.Euler(-Math.PI / 2, 0, 0);

      const startQuat = new THREE.Quaternion().setFromEuler(origRot);
      const endQuat = new THREE.Quaternion().setFromEuler(targetRot);
      const interpolatedQuat = new THREE.Quaternion();

      const easedProgress = this.easeInOutCubic(ghostProgress);
      interpolatedQuat.slerpQuaternions(startQuat, endQuat, easedProgress);
      ghost.quaternion.copy(interpolatedQuat);

      // Fade out starting at 90% of overall scroll progress
      let opacity = 1;
      if (this.scrollProgress >= 0.9) {
        const fadeProgress = (this.scrollProgress - 0.9) / 0.1;
        opacity = 1 - fadeProgress;
        opacity = Math.max(0, opacity);
      }

      this.setGhostOpacity(ghost, opacity);
    });

    // Animate camera
    this.animateCameraScroll();
  }

  private animateCameraScroll() {
    if (!this.cameraScrollCurve || !this.cameraScrollStartQuat) return;

    const pos = this.cameraScrollCurve.getPoint(this.scrollProgress);
    camera.position.copy(pos);
    camera.fov = this.CAMERA_FOV;
    camera.updateProjectionMatrix();

    const endQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0, 0)
    );
    const q = new THREE.Quaternion();
    q.slerpQuaternions(
      this.cameraScrollStartQuat,
      endQuaternion,
      this.scrollProgress
    );
    camera.quaternion.copy(q);
  }

  private animateTransition(dt: number) {
    this.transitionProgress += dt / this.TRANSITION_DURATION;
    const easedProgress = this.easeInOutCubic(
      Math.min(this.transitionProgress, 1)
    );

    Object.entries(ghosts).forEach(([key, ghost]) => {
      if (this.homePathKeys.includes(key)) {
        const path = this.homePaths[key];
        if (path) {
          const targetPos = path.getPointAt(this.homeProgress);
          const startPos = this.transitionStartPositions[key];

          ghost.position.lerpVectors(startPos, targetPos, easedProgress);

          const startRot = this.transitionStartRotations[key];
          const tangent = path.getTangentAt(this.homeProgress).normalize();
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

          const startQuat = new THREE.Quaternion().setFromEuler(startRot);
          const endQuat = new THREE.Quaternion().setFromEuler(targetRot);
          const interpolatedQuat = new THREE.Quaternion();
          interpolatedQuat.slerpQuaternions(startQuat, endQuat, easedProgress);
          ghost.quaternion.copy(interpolatedQuat);

          this.setGhostOpacity(ghost, 1);
        }
      }
    });

    if (this.transitionProgress >= 1) {
      this.state = "HOME";
      this.isTransitioning = false;
      this.homePositionsCaptured = false;
    }
  }

  public restoreGhostsToHome() {
    Object.entries(ghosts).forEach(([key, ghost]) => {
      if (this.homePositions[key]) {
        ghost.position.copy(this.homePositions[key]);
        ghost.rotation.copy(this.homeRotations[key]);
        ghost.scale.copy(this.homeScales[key]);
        ghost.visible = true;
        this.setGhostOpacity(ghost, 1);
      }
    });

    this.state = "HOME";
    this.homePositionsCaptured = false;
  }

  private setGhostOpacity(ghost: THREE.Object3D, opacity: number) {
    function applyOpacity(mesh: THREE.Mesh) {
      if (mesh.material) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach((material: any) => {
          if (material) {
            if (
              material.isMeshBasicMaterial ||
              material.isMeshStandardMaterial ||
              material.isMeshPhysicalMaterial ||
              material.isMeshMatcapMaterial
            ) {
              material.opacity = opacity;
              material.transparent = opacity < 1;
              material.depthWrite = opacity === 1;
              material.needsUpdate = true;
            } else if (
              material.isShaderMaterial &&
              material.uniforms &&
              material.uniforms.opacity
            ) {
              material.uniforms.opacity.value = opacity;
              material.needsUpdate = true;
            } else if ("opacity" in material) {
              material.opacity = opacity;
              material.transparent = opacity < 1;
              material.depthWrite = opacity === 1;
              material.needsUpdate = true;
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

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private render() {
    renderer.render(scene, camera);
  }
}

// Create global animation controller instance
const animationController = new AnimationController();

// Animation loop
function animationLoop() {
  requestAnimationFrame(animationLoop);
  const dt = clock.getDelta();

  if (pacmanMixer) pacmanMixer.update(dt);
  animationController.update(dt);
}

// Clock for animation timing
const clock = new THREE.Clock();
let pacmanMixer: THREE.AnimationMixer | null = null;

// GSAP ScrollTrigger setup
async function setupScrollTrigger() {
  try {
    const gsapModule = await import("gsap");
    const scrollTriggerModule = await import("gsap/ScrollTrigger");

    const gsap = gsapModule.gsap || gsapModule.default;
    const ScrollTrigger =
      scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;

    if (!gsap || !ScrollTrigger) {
      throw new Error("GSAP modules not loaded properly");
    }

    gsap.registerPlugin(ScrollTrigger);

    const homeSection = document.querySelector(".sc--home.sc") as HTMLElement;
    if (!homeSection) {
      console.warn("Home section not found, scroll animation disabled");
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: homeSection,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });

    tl.to(
      {},
      {
        duration: 1,
        onUpdate: function () {
          const progress = this.progress();
          animationController.setScrollProgress(progress);
        },
      }
    );
  } catch (error) {
    console.error("❌ GSAP ScrollTrigger setup failed:", error);
    setupManualScrollListener();
  }
}

function setupManualScrollListener() {
  window.addEventListener("scroll", () => {
    const homeSection = document.querySelector(".sc--home.sc") as HTMLElement;
    if (homeSection) {
      const rect = homeSection.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, 1 - rect.bottom / window.innerHeight)
      );
      animationController.setScrollProgress(progress);
    }
  });
}

export function initAnimationSystem() {
  animationController.restoreGhostsToHome();
  animationLoop();
  setupScrollTrigger();
}

// Export controller methods for POV animation
export function restoreGhostsToHome() {
  animationController.restoreGhostsToHome();
}

export function getAnimationState(): AnimationState {
  return animationController.getState();
}
