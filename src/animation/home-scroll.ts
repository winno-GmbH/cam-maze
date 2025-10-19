import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown } from "./util";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;
let isScrollAnimationActive = false;

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

  // Clone rotations to prevent any external modifications
  const clonedPausedRotations: Record<string, THREE.Quaternion> = {};
  Object.entries(pausedRotations).forEach(([key, quat]) => {
    clonedPausedRotations[key] = quat.clone();
  });

  isScrollAnimationActive = true;

  homeScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        id: "homeScroll",
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        onScrubComplete: () => {
          // Delay slightly to ensure smooth transition
          setTimeout(() => {
            isScrollAnimationActive = false;
            homeLoopHandler();
          }, 50);
        },
        onUpdate: (self) => {
          // If we're at the very start, prepare to hand off to home loop
          if (self.progress < 0.01) {
            isScrollAnimationActive = false;
          } else {
            isScrollAnimationActive = true;
          }
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
            clonedPausedRotations,
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
  // Don't update if we're transitioning to home loop
  if (!isScrollAnimationActive && progress < 0.01) {
    return;
  }

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

  // Define the "laying down" quaternions once
  const layDownQuat1 = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0)
  );
  const layDownQuat2 = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );

  // Pacman animation
  if (paths.pacman && pacman) {
    const pacmanSpeed = characterSpeeds["pacman"] ?? 1.0;
    const rawPacmanProgress = Math.min(progress * pacmanSpeed, 1);
    const easedPacmanProgress = Math.pow(rawPacmanProgress, 1.25);
    const pacmanPoint = paths.pacman.getPointAt(easedPacmanProgress);

    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);

      // Determine which laying down rotation is closer
      const startQuat = pausedRotations["pacman"];
      const d1 = startQuat.angleTo(layDownQuat1);
      const d2 = startQuat.angleTo(layDownQuat2);
      const targetLayDownQuat = d1 < d2 ? layDownQuat1 : layDownQuat2;

      // Use a smooth easing function for rotation
      const rotationProgress = Math.pow(progress, 1.5); // Smoother easing

      // Direct interpolation between start and end rotation
      pacman.quaternion.copy(
        startQuat.clone().slerp(targetLayDownQuat, rotationProgress)
      );

      // Animate pacman opacity
      pacman.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          (child as any).material.opacity = opacity;
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

        // Determine which laying down rotation is closer
        const startQuat = pausedRotations[key];
        const d1 = startQuat.angleTo(layDownQuat1);
        const d2 = startQuat.angleTo(layDownQuat2);
        const targetLayDownQuat = d1 < d2 ? layDownQuat1 : layDownQuat2;

        // Use a smooth easing function for rotation
        const rotationProgress = Math.pow(progress, 1.5); // Smoother easing

        // Direct interpolation between start and end rotation
        ghost.quaternion.copy(
          startQuat.clone().slerp(targetLayDownQuat, rotationProgress)
        );

        // Animate ghost opacity
        if ((ghost as any).material) {
          (ghost as any).material.opacity = opacity;
        }
      }
    }
  });
}
