import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths, getHomePaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown } from "./util";

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

function getTargetRotationForPathPosition(
  key: string,
  pathPosition: THREE.Vector3,
  homePaths: Record<string, THREE.CurvePath<THREE.Vector3>>
): THREE.Quaternion {
  const path = homePaths[key];
  if (!path) return new THREE.Quaternion();

  // Find the t value on the path closest to the current position
  let closestT = 0;
  let closestDistance = Infinity;
  const samples = 100;

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const point = path.getPointAt(t);
    const distance = point.distanceTo(pathPosition);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestT = t;
    }
  }

  // Get the tangent at this point and calculate rotation
  const tangent = path.getTangentAt(closestT).normalize();
  const tempObject = new THREE.Object3D();

  if (key === "pacman") {
    tempObject.rotation.set(
      -(Math.PI / 2),
      Math.PI,
      -(Math.atan2(tangent.x, tangent.z) + Math.PI / 2)
    );
  } else {
    tempObject.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
  }

  return tempObject.quaternion.clone();
}

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
          // on scroll complete, check home loop handler
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
            pausedPositions,
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
  pausedPositions: Record<string, THREE.Vector3>,
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
    const rawPacmanProgress = Math.min(progress * pacmanSpeed, 1);
    const easedPacmanProgress = Math.pow(rawPacmanProgress, 1.25);
    const pacmanPoint = paths.pacman.getPointAt(easedPacmanProgress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);

      // Smooth rotation handling
      const rotationProgress = Math.pow(progress, 2);
      const homePaths = getHomePaths();

      if (rotationProgress < 0.1) {
        // Near start: blend between current laying rotation and target path rotation
        const targetRotation = getTargetRotationForPathPosition(
          "pacman",
          pausedPositions["pacman"],
          homePaths
        );
        const layingRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.PI / 2, 0, 0)
        );

        // Inverse blend: at progress 0 we want target rotation, at 0.1 we want laying rotation
        const blendFactor = rotationProgress / 0.1;
        pacman.quaternion.copy(
          targetRotation.clone().slerp(layingRotation, blendFactor)
        );
      } else {
        // Continue with laying down rotation
        const adjustedProgress = (rotationProgress - 0.1) / 0.9;
        slerpToLayDown(pacman, pausedRotations["pacman"], adjustedProgress);
      }

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
      const rawGhostProgress = Math.min(progress * ghostSpeed, 1);
      const easedGhostProgress = Math.pow(rawGhostProgress, 1.25);
      const ghostPoint = path.getPointAt(easedGhostProgress);
      if (ghostPoint) {
        ghost.position.copy(ghostPoint);

        // Smooth rotation handling
        const rotationProgress = Math.pow(progress, 2);
        const homePaths = getHomePaths();

        if (rotationProgress < 0.1) {
          // Near start: blend between current laying rotation and target path rotation
          const targetRotation = getTargetRotationForPathPosition(
            key,
            pausedPositions[key],
            homePaths
          );
          const layingRotation = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(Math.PI / 2, 0, 0)
          );

          // Inverse blend: at progress 0 we want target rotation, at 0.1 we want laying rotation
          const blendFactor = rotationProgress / 0.1;
          ghost.quaternion.copy(
            targetRotation.clone().slerp(layingRotation, blendFactor)
          );
        } else {
          // Continue with laying down rotation
          const adjustedProgress = (rotationProgress - 0.1) / 0.9;
          slerpToLayDown(ghost, pausedRotations[key], adjustedProgress);
        }

        // Animate ghost opacity
        if ((ghost as any).material) {
          (ghost as any).material.opacity = opacity;
        }
      }
    }
  });
}
