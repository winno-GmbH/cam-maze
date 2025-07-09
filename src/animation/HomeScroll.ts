// src/animation/HomeScroll.ts - Debug version to identify camera jump
import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import gsap from "gsap";
import { slerpToLayDown } from "./util";
import { HomeLoopHandler } from "./HomeLoop";
import { getLookAtPosition } from "../paths/pathpoints";

// Debug variables to track camera state
let lastCameraQuaternion: THREE.Quaternion | null = null;
let frameCount = 0;

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>,
  pausedRotations: Record<string, THREE.Quaternion>
) {
  const scrollPaths = getHomeScrollPaths(pausedPositions);
  const lookAtPosition = getLookAtPosition();

  // Log initial state
  console.log("🎬 HomeScroll Init:", {
    initialCameraPos: camera.position.clone(),
    initialCameraQuat: camera.quaternion.clone(),
    lookAtPosition: lookAtPosition.clone(),
  });

  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 5,
        onScrubComplete: () => {
          console.log("✅ Scroll complete, resetting debug state");
          lastCameraQuaternion = null;
          frameCount = 0;
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
            lookAtPosition
          );
        },
      }
    );
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>>,
  pausedRotations: Record<string, THREE.Quaternion>,
  lookAtPosition: THREE.Vector3
) {
  frameCount++;

  // Update camera position and rotation
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    const oldPosition = camera.position.clone();
    const oldQuaternion = camera.quaternion.clone();

    // Update position
    camera.position.copy(cameraPoint);

    // Calculate what the quaternion should be with lookAt
    const tempCamera = new THREE.PerspectiveCamera();
    tempCamera.position.copy(cameraPoint);
    tempCamera.lookAt(lookAtPosition);
    const targetQuaternion = tempCamera.quaternion;

    // Check for large rotation jumps
    if (lastCameraQuaternion) {
      const angleDiff = oldQuaternion.angleTo(targetQuaternion);
      if (angleDiff > 0.5) {
        // More than ~28 degrees
        console.warn(
          `⚠️ Large rotation detected at progress ${progress.toFixed(3)}:`,
          {
            frame: frameCount,
            angleDiff: ((angleDiff * 180) / Math.PI).toFixed(1) + "°",
            oldQuat: oldQuaternion,
            targetQuat: targetQuaternion,
            positionDelta: oldPosition.distanceTo(cameraPoint),
          }
        );
      }
    }

    // Apply rotation with optional smoothing
    const SMOOTH_ROTATION = true; // Toggle this to test
    if (SMOOTH_ROTATION && lastCameraQuaternion) {
      // Smooth rotation to prevent jumps
      camera.quaternion.slerp(targetQuaternion, 0.15);
    } else {
      // Direct lookAt (may cause jumps)
      camera.lookAt(lookAtPosition);
    }

    // Log significant progress points
    if (
      progress === 0 ||
      Math.abs(progress - 0.5) < 0.01 ||
      Math.abs(progress - 1) < 0.01
    ) {
      console.log(`📍 Progress ${progress.toFixed(2)}:`, {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
      });
    }

    lastCameraQuaternion = camera.quaternion.clone();
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

// Utility function to visualize camera path (optional)
export function debugVisualizeCameraPath(scene: THREE.Scene) {
  const scrollPaths = getHomeScrollPaths({});
  if (!scrollPaths.camera) return;

  // Create line geometry for camera path
  const points = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    points.push(scrollPaths.camera.getPointAt(t));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);

  console.log("🔴 Camera path visualized in red");
}
