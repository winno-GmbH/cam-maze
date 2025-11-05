import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";

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

  const scrollPaths = getHomeScrollPaths(pausedPositions);
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
          console.log("🎬 Home scroll section ENTERED!");
          const scrollDir = getScrollDirection();
          applyHomeScrollPreset(true, scrollDir, pausedPositions, pausedRotations);
        },
        onEnterBack: () => {
          console.log("🎬 Home scroll section ENTERED BACK!");
          const scrollDir = getScrollDirection();
          applyHomeScrollPreset(true, scrollDir, pausedPositions, pausedRotations);
        },
        onScrubComplete: () => {
          homeLoopHandler();
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
          updateScrollAnimation(
            progress,
            scrollPaths,
            pausedRotations,
            cameraPathPoints
          );
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
    console.log("🔄 Camera rotation changed in home-scroll (via lookAt):", {
      rotationY: camera.rotation.y,
      rotationYDegrees: (camera.rotation.y * 180) / Math.PI,
    });
    camera.updateProjectionMatrix();
  }

  // CRITICAL: Don't update object opacity/position if intro-scroll is active
  if (isIntroScrollActive) {
    return;
  }

  // Opacity calculation (unchanged)
  const fadeStartProgress = 0.85;
  const fadeEndProgress = 0.95;
  const opacity =
    progress < fadeStartProgress
      ? 1
      : progress > fadeEndProgress
      ? 0
      : 1 -
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

      // Apply bidirectional laying down animation
      slerpToLayDown(pacman, pausedRotations["pacman"], rotationProgress);

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

        // Apply bidirectional laying down animation
        slerpToLayDown(ghost, pausedRotations[key], rotationProgress);

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
