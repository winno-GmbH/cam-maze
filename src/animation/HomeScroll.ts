import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import gsap from "gsap";
import { slerpToLayDown } from "./util";
import { HomeLoopHandler } from "./HomeLoop";

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>,
  pausedRotations: Record<string, THREE.Quaternion>
) {
  const scrollPaths = getHomeScrollPaths(pausedPositions);

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
          updateScrollAnimation(progress, scrollPaths, pausedRotations);
        },
      }
    );
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>> & {
    cameraLookAt: THREE.CurvePath<THREE.Vector3>;
  },
  pausedRotations: Record<string, THREE.Quaternion>
) {
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);

    // Update camera lookAt target
    if (paths.cameraLookAt) {
      const lookAtPoint = paths.cameraLookAt.getPointAt(progress);
      camera.lookAt(lookAtPoint);
      console.log(
        `Camera: pos=${camera.position
          .toArray()
          .map((v) => v.toFixed(2))
          .join(",")}, lookAt=${lookAtPoint
          .toArray()
          .map((v) => v.toFixed(2))
          .join(",")}, progress=${progress.toFixed(2)}`
      );
    }

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
