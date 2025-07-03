import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import { stopHomeLoop } from "./HomeLoop";
import gsap from "gsap";

export function initHomeScrollAnimation() {
  const scrollPaths = getHomeScrollPaths(pacman, ghosts);

  stopHomeLoop();

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
    pacman.position.copy(pacmanPoint);

    const tangent = paths.pacman.getTangentAt(progress);
    if (tangent && tangent.length() > 0) {
      pacman.lookAt(pacmanPoint.clone().add(tangent.normalize()));
    }
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = `ghost${key.replace("ghost", "")}Scroll`;
    const path = paths[pathKey];

    if (path) {
      const ghostPoint = path.getPointAt(progress);
      ghost.position.copy(ghostPoint);

      const tangent = path.getTangentAt(progress);
      if (tangent && tangent.length() > 0) {
        ghost.lookAt(ghostPoint.clone().add(tangent.normalize()));
      }
    }
  });
}
