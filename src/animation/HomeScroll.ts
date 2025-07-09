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

  const initialPosition = camera.position.clone();
  const initialQuaternion = camera.quaternion.clone();

  const finalQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );

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
            finalQuaternion
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
  finalQuaternion: THREE.Quaternion
) {
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);

    camera.quaternion.copy(initialQuaternion).slerp(finalQuaternion, progress);
    camera.updateProjectionMatrix();
  }

  if (paths.pacman && pacman) {
    const pacmanPoint = paths.pacman.getPointAt(progress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);
      slerpToLayDown(pacman, pausedRotations["pacman"], progress);
    }
  }

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
