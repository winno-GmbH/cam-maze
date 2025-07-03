import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import { stopHomeLoop } from "./HomeLoop";
import gsap from "gsap";

export function initHomeScrollAnimation() {
  // Wait for the scene to be fully loaded
  const checkSceneReady = () => {
    // Check if objects are loaded and have valid positions
    if (!pacman || !ghosts || Object.keys(ghosts).length === 0) {
      console.log("Scene not ready, retrying in 100ms...");
      setTimeout(checkSceneReady, 100);
      return;
    }

    // Check if objects have been positioned (not at origin)
    const objectsReady = Object.values(ghosts).every(
      (ghost) => ghost.position.length() > 0 || ghost.children.length > 0
    );

    if (!objectsReady) {
      console.log("Objects not positioned yet, retrying in 100ms...");
      setTimeout(checkSceneReady, 100);
      return;
    }

    console.log("Scene is ready, initializing scroll animation...");
    setupScrollAnimation();
  };

  checkSceneReady();
}

function setupScrollAnimation() {
  const scrollPaths = getHomeScrollPaths(pacman, ghosts);

  console.log("Scroll paths created:", Object.keys(scrollPaths));
  console.log("Pacman position:", pacman.position);
  console.log(
    "Ghost positions:",
    Object.entries(ghosts).map(([key, ghost]) => ({
      key,
      position: ghost.position,
    }))
  );

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

    // Debug: Log pacman position updates
    if (progress === 0 || progress === 0.5 || progress === 1) {
      console.log(`Pacman at progress ${progress}:`, pacmanPoint);
    }

    const tangent = paths.pacman.getTangentAt(progress);
    if (tangent && tangent.length() > 0) {
      pacman.lookAt(pacmanPoint.clone().add(tangent.normalize()));
    }
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    // The paths are named with the same keys as the ghosts object
    const path = paths[key];

    if (path) {
      const ghostPoint = path.getPointAt(progress);
      ghost.position.copy(ghostPoint);

      // Debug: Log ghost position updates
      if (progress === 0 || progress === 0.5 || progress === 1) {
        console.log(`Ghost ${key} at progress ${progress}:`, ghostPoint);
      }

      const tangent = path.getTangentAt(progress);
      if (tangent && tangent.length() > 0) {
        ghost.lookAt(ghostPoint.clone().add(tangent.normalize()));
      }
    }
  });
}
