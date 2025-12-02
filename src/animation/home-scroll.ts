import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import {
  getCameraHomeScrollPathPoints,
  objectHomeScrollEndPathPoint,
} from "../paths/pathpoints";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown, LAY_DOWN_QUAT_1, LAY_DOWN_QUAT_2 } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import {
  updateObjectRotation,
  updateObjectOpacity,
  getCurrentRotations,
  getHomeLoopT,
  getHomeLoopPausedT,
  getIsHomeLoopActive,
} from "./object-state";
import { getHomePaths } from "../paths/paths";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

// Store t-value when entering home-scroll to prevent disalignment
let frozenT: number | null = null;

const characterSpeeds: Record<string, number> = {
  pacman: 0.9,
  ghost1: 1,
  ghost2: 1.1,
  ghost3: 1.2,
  ghost4: 1.3,
  ghost5: 1.4,
};

export function initHomeScrollAnimation() {
  if (homeScrollTimeline) {
    homeScrollTimeline.kill();
    homeScrollTimeline = null;
  }

  // CRITICAL: Ensure opacity starts at 100% when entering home-scroll
  // Kill any opacity tweens and set to 1.0
  Object.entries(ghosts).forEach(([key, object]) => {
    gsap.killTweensOf(object);
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            gsap.killTweensOf(mat);
            gsap.killTweensOf(mat.opacity);
            mat.opacity = 1.0;
            mat.transparent = true;
          });
        } else {
          gsap.killTweensOf(mesh.material);
          gsap.killTweensOf((mesh.material as any).opacity);
          (mesh.material as any).opacity = 1.0;
          (mesh.material as any).transparent = true;
        }
      }
    });
  });

  // Camera path points (unchanged - camera still uses bezier curve)
  const cameraPathPoints = getCameraHomeScrollPathPoints();

  // Create camera path
  const cameraPath = new THREE.CurvePath<THREE.Vector3>();
  if (cameraPathPoints.length === 4) {
    const cameraCurve = new THREE.CubicBezierCurve3(
      cameraPathPoints[0].pos,
      cameraPathPoints[1].pos,
      cameraPathPoints[2].pos,
      cameraPathPoints[3].pos
    );
    cameraPath.add(cameraCurve);
  }

  homeScrollTimeline = gsap.timeline({
    scrollTrigger: {
      id: "homeScroll",
      trigger: ".sc--home",
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      onEnter: () => {
        // CRITICAL: Freeze t-value when entering to prevent disalignment
        // This MUST happen first, before any position calculations
        const isLoopActive = getIsHomeLoopActive();
        frozenT = isLoopActive ? getHomeLoopT() : getHomeLoopPausedT();

        // CRITICAL: Use requestAnimationFrame to ensure home-loop has updated positions
        requestAnimationFrame(() => {
          const freshRotations = getCurrentRotations();
          const scrollDir = getScrollDirection();

          // Calculate current positions from frozen t-value
          const homePaths = getHomePaths();
          const freshPositions: Record<string, THREE.Vector3> = {};
          Object.entries(ghosts).forEach(([key, _]) => {
            const path = homePaths[key];
            if (path && frozenT !== null) {
              const position = path.getPointAt(frozenT);
              if (position) {
                freshPositions[key] = position;
              }
            }
          });

          // Also include pacman
          if (pacman) {
            const pacmanPath = homePaths["pacman"];
            if (pacmanPath && frozenT !== null) {
              const position = pacmanPath.getPointAt(frozenT);
              if (position) {
                freshPositions["pacman"] = position;
              }
            }
          }

          applyHomeScrollPreset(
            true,
            scrollDir,
            freshPositions,
            freshRotations
          );

          // CRITICAL: Re-setup animations with fresh rotations when entering
          if (homeScrollTimeline) {
            setupScrollAnimations();
          }
        });
      },
      onEnterBack: () => {
        // CRITICAL: Freeze t-value when entering back to prevent disalignment
        // This MUST happen first, before any position calculations
        const isLoopActive = getIsHomeLoopActive();
        frozenT = isLoopActive ? getHomeLoopT() : getHomeLoopPausedT();

        // CRITICAL: Use requestAnimationFrame to ensure home-loop has updated positions
        requestAnimationFrame(() => {
          const freshRotations = getCurrentRotations();
          const scrollDir = getScrollDirection();

          // Calculate current positions from frozen t-value
          const homePaths = getHomePaths();
          const freshPositions: Record<string, THREE.Vector3> = {};
          Object.entries(ghosts).forEach(([key, _]) => {
            const path = homePaths[key];
            if (path && frozenT !== null) {
              const position = path.getPointAt(frozenT);
              if (position) {
                freshPositions[key] = position;
              }
            }
          });

          // Also include pacman
          if (pacman) {
            const pacmanPath = homePaths["pacman"];
            if (pacmanPath && frozenT !== null) {
              const position = pacmanPath.getPointAt(frozenT);
              if (position) {
                freshPositions["pacman"] = position;
              }
            }
          }

          applyHomeScrollPreset(
            true,
            scrollDir,
            freshPositions,
            freshRotations
          );

          // CRITICAL: Re-setup animations with fresh rotations when entering back
          if (homeScrollTimeline) {
            setupScrollAnimations();
          }
        });
      },
      onScrubComplete: () => {
        // CRITICAL: When returning to home-loop, it will sync state itself
        // We don't sync here because only home-loop should update positions
        requestAnimationFrame(() => {
          homeLoopHandler();
        });
      },
    },
  });

  // Store animation references to kill them when re-setting up
  let rotationAnimations: (gsap.core.Tween | gsap.core.Timeline)[] = [];
  let opacityAnimations: (gsap.core.Tween | gsap.core.Timeline)[] = [];

  // Function to setup GSAP animations (called on enter to get fresh rotations)
  const setupScrollAnimations = () => {
    // Kill existing animations first
    rotationAnimations.forEach((anim) => anim.kill());
    opacityAnimations.forEach((anim) => anim.kill());
    rotationAnimations.length = 0;
    opacityAnimations.length = 0;

    const allObjects = [...Object.entries(ghosts)];
    if (pacman) {
      allObjects.push(["pacman", pacman]);
    }

    // Animate rotation for all objects (from currentRotation to laying down)
    // CRITICAL: startRotation is fetched dynamically in onUpdate, not frozen
    allObjects.forEach(([key, object]) => {
      // Kill any existing rotation animations
      gsap.killTweensOf(object.quaternion);

      // Create wrapper object for quaternion animation (GSAP can't animate quaternions directly)
      const rotationWrapper = { progress: 0 };
      const rotationAnim = homeScrollTimeline!.fromTo(
        rotationWrapper,
        { progress: 0 },
        {
          progress: 1,
          ease: "power1.5",
          onUpdate: function () {
            // CRITICAL: Get fresh rotation from state every update (not frozen)
            // This ensures rotation always starts from current home-loop rotation
            const currentRotations = getCurrentRotations();
            const startRotation = currentRotations[key];
            if (!startRotation) return;

            // Calculate target laying down rotation
            const d1 = startRotation.angleTo(LAY_DOWN_QUAT_1);
            const d2 = startRotation.angleTo(LAY_DOWN_QUAT_2);
            const targetQuat = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;

            const rotationProgress = this.targets()[0].progress;
            object.quaternion.copy(
              startRotation.clone().slerp(targetQuat, rotationProgress)
            );
            updateObjectRotation(key, object.quaternion);
          },
        }
      );
      rotationAnimations.push(rotationAnim);
    });

    // Animate opacity for all objects (from 1.0 to 0.0, fade at 85-95%)
    allObjects.forEach(([key, object]) => {
      // Get all materials for this object
      const materials: any[] = [];
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            materials.push(...mesh.material);
          } else {
            materials.push(mesh.material);
          }
        }
      });

      if (materials.length === 0) return;

      // Kill any existing opacity animations
      materials.forEach((mat) => {
        gsap.killTweensOf(mat);
        gsap.killTweensOf(mat.opacity);
      });

      // GSAP fromTo with keyframes for opacity
      const opacityAnim = homeScrollTimeline!.fromTo(
        materials,
        { opacity: 1.0 },
        {
          opacity: 1.0,
          keyframes: [
            { opacity: 1.0, duration: 0.85 }, // Stay at 100% until 85%
            { opacity: 0.0, duration: 0.1 }, // Fade to 0% between 85-95%
            { opacity: 0.0, duration: 0.05 }, // Stay at 0% from 95-100%
          ],
          onUpdate: function () {
            // Update state for consistency
            const opacity = materials[0]?.opacity ?? 1.0;
            materials.forEach((mat) => {
              mat.transparent = opacity < 1.0;
            });
            updateObjectOpacity(key, opacity);
          },
        }
      );
      opacityAnimations.push(opacityAnim);
    });
  };

  // Setup animations initially
  setupScrollAnimations();

  // Position animation still uses manual calculation (complex bezier interpolation)
  homeScrollTimeline!.to(
    { progress: 0 },
    {
      progress: 1,
      immediateRender: false,
      onUpdate: function () {
        const progress = this.targets()[0].progress;
        camera.fov = originalFOV;
        camera.updateProjectionMatrix();
        updateScrollAnimation(progress, cameraPath, cameraPathPoints);
      },
    }
  );
}

function updateScrollAnimation(
  progress: number,
  cameraPath: THREE.CurvePath<THREE.Vector3>,
  cameraPathPoints: any[]
) {
  // CRITICAL: Check if intro-scroll is active - if so, don't update objects
  const introScrollTrigger = gsap.getById("introScroll");
  const isIntroScrollActive = introScrollTrigger && introScrollTrigger.isActive;

  // Camera animation (unchanged - still uses bezier curve)
  if (cameraPath) {
    const cameraPoint = cameraPath.getPointAt(progress);
    camera.position.copy(cameraPoint);

    const lookAtCurve = new THREE.CubicBezierCurve3(
      cameraPathPoints[0].lookAt,
      cameraPathPoints[1].lookAt,
      cameraPathPoints[2].lookAt,
      cameraPathPoints[3].lookAt
    );
    const lookAtPoint = lookAtCurve.getPoint(progress);
    camera.lookAt(lookAtPoint);
    camera.updateProjectionMatrix();
  }

  // CRITICAL: Don't update object position if intro-scroll is active
  if (isIntroScrollActive) {
    return;
  }

  // UNFAILABLE APPROACH: Use frozen t-value to prevent disalignment
  // This ensures positions stay consistent during scroll
  // Rotation and Opacity are now handled by GSAP fromTo animations above
  const homePaths = getHomePaths();
  const t =
    frozenT !== null
      ? frozenT
      : getIsHomeLoopActive()
      ? getHomeLoopT()
      : getHomeLoopPausedT();

  // UNFAILABLE: Calculate start position from home-loop t-value (always fresh)
  // Interpolate directly to end position - no separate paths needed
  Object.entries(ghosts).forEach(([key, object]) => {
    const homePath = homePaths[key];
    if (!homePath) return;

    // Get current position from home-loop (always fresh, always correct)
    const startPosition = homePath.getPointAt(t);
    if (!startPosition) return;

    // Calculate end position with arc (same as before, but simpler)
    const arcPoint = new THREE.Vector3(
      startPosition.x * (1 / 4) + objectHomeScrollEndPathPoint.x * (3 / 4),
      1.5,
      startPosition.z * (1 / 4) + objectHomeScrollEndPathPoint.z * (3 / 4)
    );

    // Apply character speed
    const speed = characterSpeeds[key] ?? 1.0;
    const rawProgress = Math.min(progress * speed, 1);
    const easedProgress = Math.pow(rawProgress, 1.25);

    // Direct interpolation: start -> arc -> end (quadratic bezier)
    // This is equivalent to the old path approach, but calculated on-the-fly
    const t1 = easedProgress;
    const t2 = 1 - t1;
    const intermediate = new THREE.Vector3()
      .addScaledVector(startPosition, t2 * t2)
      .addScaledVector(arcPoint, 2 * t1 * t2)
      .addScaledVector(objectHomeScrollEndPathPoint, t1 * t1);

    object.position.copy(intermediate);
    // Rotation and Opacity are handled by GSAP fromTo animations above
  });

  // Pacman (same approach)
  if (pacman) {
    const homePath = homePaths["pacman"];
    if (homePath) {
      const startPosition = homePath.getPointAt(t);
      if (startPosition) {
        const arcPoint = new THREE.Vector3(
          startPosition.x * (1 / 4) + objectHomeScrollEndPathPoint.x * (3 / 4),
          1.5,
          startPosition.z * (1 / 4) + objectHomeScrollEndPathPoint.z * (3 / 4)
        );

        const speed = characterSpeeds["pacman"] ?? 1.0;
        const rawProgress = Math.min(progress * speed, 1);
        const easedProgress = Math.pow(rawProgress, 1.25);

        const t1 = easedProgress;
        const t2 = 1 - t1;
        const intermediate = new THREE.Vector3()
          .addScaledVector(startPosition, t2 * t2)
          .addScaledVector(arcPoint, 2 * t1 * t2)
          .addScaledVector(objectHomeScrollEndPathPoint, t1 * t1);

        pacman.position.copy(intermediate);
        // Rotation and Opacity are handled by GSAP fromTo animations above
      }
    }
  }
}
