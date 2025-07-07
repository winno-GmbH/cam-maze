import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import { stopHomeLoop, startHomeLoop } from "./HomeLoop";
import gsap from "gsap";

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>
) {
  const scrollPaths = getHomeScrollPaths(pausedPositions);

  console.log("Scroll paths created:", Object.keys(scrollPaths));
  console.log("Pacman position before:", pacman.position);
  console.log(
    "Ghosts positions before:",
    Object.fromEntries(
      Object.entries(ghosts).map(([key, ghost]) => [
        key,
        ghost.position.clone(),
      ])
    )
  );

  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        onEnter: () => {
          console.log("Home scroll animation started");
        },
        onLeave: () => {
          console.log("Home scroll animation ended");
          startHomeLoop();
        },
        onEnterBack: () => {
          console.log("Home scroll animation entered back");
          stopHomeLoop();
        },
        onLeaveBack: () => {
          console.log("Home scroll animation left back");
          startHomeLoop();
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
          updateScrollAnimation(progress, scrollPaths);
        },
      }
    );
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>>
) {
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);
    camera.updateProjectionMatrix();
  }

  if (paths.pacman && pacman) {
    const pacmanPoint = paths.pacman.getPointAt(progress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);

      const tangent = paths.pacman.getTangentAt(progress);
      if (tangent && tangent.length() > 0) {
        pacman.lookAt(pacmanPoint.clone().add(tangent.normalize()));
      }
    }
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = paths[key];

    if (path) {
      const ghostPoint = path.getPointAt(progress);
      if (ghostPoint) {
        ghost.position.copy(ghostPoint);

        const tangent = path.getTangentAt(progress);
        if (tangent && tangent.length() > 0) {
          ghost.lookAt(ghostPoint.clone().add(tangent.normalize()));
        }
      }
    }
  });
}
