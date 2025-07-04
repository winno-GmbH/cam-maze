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
  if (progress % 0.1 < 0.01) {
    console.log("Scroll progress:", progress);
  }

  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);
    camera.updateProjectionMatrix();
  }

  if (paths.pacman && pacman) {
    const pacmanPoint = paths.pacman.getPointAt(progress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);
      console.log("Pacman moved to:", pacmanPoint);

      const tangent = paths.pacman.getTangentAt(progress);
      if (tangent && tangent.length() > 0) {
        pacman.lookAt(pacmanPoint.clone().add(tangent.normalize()));
      }
    } else {
      console.warn("No pacman point at progress:", progress);
    }
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = `ghost${key.replace("ghost", "")}Scroll`;
    const path = paths[pathKey];

    if (path) {
      const ghostPoint = path.getPointAt(progress);
      if (ghostPoint) {
        ghost.position.copy(ghostPoint);
        console.log(`Ghost ${key} moved to:`, ghostPoint);

        const tangent = path.getTangentAt(progress);
        if (tangent && tangent.length() > 0) {
          ghost.lookAt(ghostPoint.clone().add(tangent.normalize()));
        }
      } else {
        console.warn(`No ghost point for ${key} at progress:`, progress);
      }
    } else {
      console.warn(`No path found for ghost ${key}, pathKey: ${pathKey}`);
    }
  });
}
