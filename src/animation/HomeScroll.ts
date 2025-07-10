import * as THREE from "three";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import gsap from "gsap";
import { slerpToLayDown } from "./util";
import { HomeLoopHandler } from "./HomeLoop";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { camera } from "../core/camera";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let homeScrollTimeline: gsap.core.Timeline | null = null;
let hasAnimatedFirstScroll = false;

const characterSpeeds: Record<string, number> = {
  pacman: 1.0,
  ghost1: 1.125,
  ghost2: 1.25,
  ghost3: 1.375,
  ghost4: 1.5,
  ghost5: 1.625,
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
        onScrubComplete: () => {
          HomeLoopHandler();
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
          updateScrollAnimation(
            progress,
            scrollPaths,
            pausedRotations,
            cameraPathPoints
          );
        },
      }
    );

  // Sync timeline progress to current scroll position, with ease-in on first scroll
  const trigger = ScrollTrigger.getById("homeScroll");
  if (trigger && homeScrollTimeline) {
    if (!hasAnimatedFirstScroll) {
      hasAnimatedFirstScroll = true;
      gsap.to(homeScrollTimeline, {
        progress: trigger.progress,
        duration: 0.5, // Adjust duration as needed
        ease: "power2.out",
      });
    } else {
      homeScrollTimeline.progress(trigger.progress);
    }
  }
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>>,
  pausedRotations: Record<string, THREE.Quaternion>,
  cameraPathPoints: any[]
) {
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
    console.log("Camera lookAt:", lookAtPoint.clone());
  }

  const fadeStartProgress = 0.85;
  const fadeEndProgress = 0.95;
  const opacity =
    progress < fadeStartProgress
      ? 1
      : progress > fadeEndProgress
      ? 0
      : 1 -
        (progress - fadeStartProgress) / (fadeEndProgress - fadeStartProgress);

  // Pacman (slowest)
  if (paths.pacman && pacman) {
    const pacmanSpeed = characterSpeeds["pacman"] ?? 1.0;
    const pacmanProgress = Math.min(progress * pacmanSpeed, 1);
    const pacmanPoint = paths.pacman.getPointAt(pacmanProgress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);
      slerpToLayDown(pacman, pausedRotations["pacman"], pacmanProgress);

      // Animate pacman opacity
      pacman.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          (child as any).material.opacity = opacity;
        }
      });
    }
  }

  // Ghosts (each with their own speed)
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = paths[key];
    if (path) {
      const ghostSpeed = characterSpeeds[key] ?? 1.0;
      const ghostProgress = Math.min(progress * ghostSpeed, 1);
      const ghostPoint = path.getPointAt(ghostProgress);
      if (ghostPoint) {
        ghost.position.copy(ghostPoint);
        slerpToLayDown(ghost, pausedRotations[key], ghostProgress);

        // Animate ghost opacity
        if ((ghost as any).material) {
          (ghost as any).material.opacity = opacity;
        }
      }
    }
  });
}
