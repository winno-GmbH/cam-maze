import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import {
  syncStateFromObjects,
  updateObjectPosition,
  updateObjectRotation,
  getCurrentPositions,
  getCurrentRotations,
} from "./object-state";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

const characterSpeeds: Record<string, number> = {
  pacman: 0.9,
  ghost1: 1,
  ghost2: 1.1,
  ghost3: 1.2,
  ghost4: 1.3,
  ghost5: 1.4,
};

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>,
  pausedRotations: Record<string, THREE.Quaternion>
) {
  if (homeScrollTimeline) {
    homeScrollTimeline.kill();
    homeScrollTimeline = null;
  }

  // CRITICAL: Always use current state, not the passed parameters
  // This ensures we always have the latest positions even if loop was running
  syncStateFromObjects();
  const currentPositions = getCurrentPositions();
  const currentRotations = getCurrentRotations();

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

  const scrollPaths = getHomeScrollPaths(currentPositions);
  const cameraPathPoints = getCameraHomeScrollPathPoints();

  homeScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        id: "homeScroll",
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        onEnter: () => {
          // CRITICAL: Always get fresh positions from state before applying preset
          // Use requestAnimationFrame to ensure state is synced after any pending updates
          requestAnimationFrame(() => {
            syncStateFromObjects();
            const freshPositions = getCurrentPositions();
            const freshRotations = getCurrentRotations();
            const scrollDir = getScrollDirection();
            applyHomeScrollPreset(
              true,
              scrollDir,
              freshPositions,
              freshRotations
            );
          });
        },
        onEnterBack: () => {
          // CRITICAL: Always get fresh positions from state before applying preset
          // Use requestAnimationFrame to ensure state is synced after any pending updates
          requestAnimationFrame(() => {
            syncStateFromObjects();
            const freshPositions = getCurrentPositions();
            const freshRotations = getCurrentRotations();
            const scrollDir = getScrollDirection();
            applyHomeScrollPreset(
              true,
              scrollDir,
              freshPositions,
              freshRotations
            );
          });
        },
        onScrubComplete: () => {
          // CRITICAL: Sync state from actual object positions before returning to home-loop
          // This ensures positions are up-to-date when scrolling back
          // Use requestAnimationFrame to ensure this happens after all position updates
          requestAnimationFrame(() => {
            syncStateFromObjects();
            homeLoopHandler();
          });
        },
      },
    })
    .to(
      { progress: 0 },
      {
        progress: 1,
        immediateRender: false,
        onUpdate: function () {
          const progress = this.targets()[0].progress;
          camera.fov = originalFOV;
          camera.updateProjectionMatrix();
          // CRITICAL: Always get fresh rotations from state (they're updated in updateScrollAnimation)
          const currentRotations = getCurrentRotations();
          updateScrollAnimation(
            progress,
            scrollPaths,
            currentRotations,
            cameraPathPoints
          );
        },
        onStart: () => {
          // CRITICAL: When scroll animation starts (progress = 0), ensure opacity is 100%
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
        },
        onReverseComplete: () => {
          // CRITICAL: When scrolling back up (reverse), sync state immediately
          // Use requestAnimationFrame to ensure this happens after all updates
          requestAnimationFrame(() => {
            syncStateFromObjects();
          });
        },
      }
    );
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>>,
  pausedRotations: Record<string, THREE.Quaternion>,
  cameraPathPoints: any[]
) {
  // CRITICAL: Check if intro-scroll is active - if so, don't update objects
  // This prevents conflicts when scrolling between sections
  const introScrollTrigger = gsap.getById("introScroll");
  const isIntroScrollActive = introScrollTrigger && introScrollTrigger.isActive;

  // Camera animation (unchanged)
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
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

  // CRITICAL: Don't update object opacity/position if intro-scroll is active
  if (isIntroScrollActive) {
    return;
  }

  // Opacity calculation: start at 100% (progress 0), fade to 0% (progress 0.85-0.95)
  const fadeStartProgress = 0.85;
  const fadeEndProgress = 0.95;
  // CRITICAL: At progress 0, opacity should be 1.0 (100%)
  // Fade from 1.0 to 0.0 between fadeStartProgress and fadeEndProgress
  const opacity =
    progress < fadeStartProgress
      ? 1.0
      : progress > fadeEndProgress
      ? 0.0
      : 1.0 -
        (progress - fadeStartProgress) / (fadeEndProgress - fadeStartProgress);

  // Apply smooth easing to rotation progress (bidirectional - reverses when scrolling up)
  const rotationProgress = Math.pow(progress, 1.5);

  // Pacman animation
  if (paths.pacman && pacman) {
    const pacmanSpeed = characterSpeeds["pacman"] ?? 1.0;
    const rawPacmanProgress = Math.min(progress * pacmanSpeed, 1);
    const easedPacmanProgress = Math.pow(rawPacmanProgress, 1.25);
    const pacmanPoint = paths.pacman.getPointAt(easedPacmanProgress);

    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);
      updateObjectPosition("pacman", pacmanPoint);

      // Apply bidirectional laying down animation
      slerpToLayDown(pacman, pausedRotations["pacman"], rotationProgress);
      updateObjectRotation("pacman", pacman.quaternion);

      // Animate pacman opacity - traverse all nested meshes
      pacman.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = opacity;
              mat.transparent = true;
            });
          } else {
            (mesh.material as any).opacity = opacity;
            (mesh.material as any).transparent = true;
          }
        }
      });
    }
  }

  // Ghosts animation
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = paths[key];
    if (path) {
      const ghostSpeed = characterSpeeds[key] ?? 1.0;
      const rawGhostProgress = Math.min(progress * ghostSpeed, 1);
      const easedGhostProgress = Math.pow(rawGhostProgress, 1.25);
      const ghostPoint = path.getPointAt(easedGhostProgress);

      if (ghostPoint) {
        ghost.position.copy(ghostPoint);
        updateObjectPosition(key, ghostPoint);

        // Apply bidirectional laying down animation
        slerpToLayDown(ghost, pausedRotations[key], rotationProgress);
        updateObjectRotation(key, ghost.quaternion);

        // Animate ghost opacity - traverse all nested meshes
        ghost.traverse((child) => {
          if ((child as any).isMesh && (child as any).material) {
            const mesh = child as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat: any) => {
                mat.opacity = opacity;
                mat.transparent = true;
              });
            } else {
              (mesh.material as any).opacity = opacity;
              (mesh.material as any).transparent = true;
            }
          }
        });
      }
    }
  });
}
