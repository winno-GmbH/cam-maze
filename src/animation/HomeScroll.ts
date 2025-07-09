import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import gsap from "gsap";
import { slerpToLayDown } from "./util";
import { HomeLoopHandler } from "./HomeLoop";
import { getLookAtPosition } from "../paths/pathpoints";

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>,
  pausedRotations: Record<string, THREE.Quaternion>
) {
  const scrollPaths = getHomeScrollPaths(pausedPositions);
  const lookAtPosition = getLookAtPosition();

  // Store initial camera state when scroll animation starts
  const initialPosition = camera.position.clone();
  const initialQuaternion = camera.quaternion.clone();

  // Calculate the final camera position (maze center)
  const mazeCenterPathPoint = new THREE.Vector3(0.45175, 0.5, 0.55675);

  // Calculate the final quaternion for looking down at the maze center
  const tempCamera = new THREE.PerspectiveCamera();
  tempCamera.position.copy(mazeCenterPathPoint);
  tempCamera.lookAt(
    mazeCenterPathPoint.x,
    mazeCenterPathPoint.y - 1,
    mazeCenterPathPoint.z
  );
  const finalQuaternion = tempCamera.quaternion.clone();

  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 5,
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
            initialPosition,
            initialQuaternion,
            finalQuaternion,
            lookAtPosition,
            mazeCenterPathPoint
          );
        },
      }
    );
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>>,
  pausedRotations: Record<string, THREE.Quaternion>,
  initialPosition: THREE.Vector3,
  initialQuaternion: THREE.Quaternion,
  finalQuaternion: THREE.Quaternion,
  lookAtPosition: THREE.Vector3,
  mazeCenterPathPoint: THREE.Vector3
) {
  // Update camera position and rotation
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);

    // Create a smooth transition from looking at the initial lookAt position
    // to looking down at the maze center
    if (progress < 0.7) {
      // For the first 70% of the scroll, maintain the lookAt behavior
      const currentLookAt = lookAtPosition
        .clone()
        .lerp(mazeCenterPathPoint, progress / 0.7);
      camera.lookAt(currentLookAt);
    } else {
      // For the final 30%, transition to looking straight down
      const rotationProgress = (progress - 0.7) / 0.3; // Normalize to 0-1
      const currentQuat = camera.quaternion.clone();
      camera.quaternion
        .copy(currentQuat)
        .slerp(finalQuaternion, rotationProgress);
    }

    camera.updateProjectionMatrix();
  }

  // Update pacman
  if (paths.pacman && pacman) {
    const pacmanPoint = paths.pacman.getPointAt(progress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);
      slerpToLayDown(pacman, pausedRotations["pacman"], progress);
    }
  }

  // Update ghosts
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = paths[key];
    if (path) {
      const ghostPoint = path.getPointAt(progress);
      if (ghostPoint) {
        ghost.position.copy(ghostPoint);
        slerpToLayDown(ghost, pausedRotations[key], progress);
      }
    }
  });
}
