// src/animation/HomeScroll.ts - Fixed version
import * as THREE from "three";
import { camera } from "../core/camera";
import { getHomeScrollPaths } from "../paths/paths";
import { pacman, ghosts } from "../core/objects";
import gsap from "gsap";
import { slerpToLayDown } from "./util";
import { HomeLoopHandler } from "./HomeLoop";
import { getLookAtPosition } from "../paths/pathpoints";

// Store camera state to prevent jumps
let cameraStartQuaternion: THREE.Quaternion | null = null;
let cameraTargetQuaternion: THREE.Quaternion | null = null;

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>,
  pausedRotations: Record<string, THREE.Quaternion>
) {
  const scrollPaths = getHomeScrollPaths(pausedPositions);
  const lookAtPosition = getLookAtPosition();

  // Capture initial camera quaternion
  cameraStartQuaternion = camera.quaternion.clone();

  // Calculate target quaternion for the end position
  const tempCamera = camera.clone();
  const endCameraPos = scrollPaths.camera.getPointAt(1);
  tempCamera.position.copy(endCameraPos);
  tempCamera.lookAt(lookAtPosition);
  cameraTargetQuaternion = tempCamera.quaternion.clone();

  gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 5,
        onStart: () => {
          // Ensure we have the current camera state
          if (!cameraStartQuaternion) {
            cameraStartQuaternion = camera.quaternion.clone();
          }
        },
        onScrubComplete: () => {
          // Reset camera state
          cameraStartQuaternion = null;
          cameraTargetQuaternion = null;
          HomeLoopHandler();
        },
        onReverseComplete: () => {
          // Handle reverse scroll completion
          cameraStartQuaternion = null;
          cameraTargetQuaternion = null;
          HomeLoopHandler();
        },
      },
    })
    .to(
      { progress: 0 },
      {
        progress: 1,
        immediateRender: false,
        ease: "none", // Linear interpolation for smooth scroll
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
  // Update camera with smooth quaternion interpolation
  if (paths.camera && cameraStartQuaternion && cameraTargetQuaternion) {
    // Update position along path
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);

    // Smoothly interpolate rotation using quaternion slerp
    // This prevents the jump by maintaining continuous rotation
    camera.quaternion.copy(
      cameraStartQuaternion.clone().slerp(cameraTargetQuaternion, progress)
    );

    // Alternative approach: Use dynamic quaternion calculation with damping
    // This provides even smoother transitions
    /*
    const dynamicTarget = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(cameraPoint, lookAtPosition, camera.up);
    dynamicTarget.setFromRotationMatrix(tempMatrix);
    
    // Apply damping for smoother transition
    const dampingFactor = 0.95; // Adjust for smoothness
    camera.quaternion.slerp(dynamicTarget, 1 - Math.pow(dampingFactor, progress));
    */

    camera.updateProjectionMatrix();
  }

  // Update pacman with smooth rotation
  if (paths.pacman && pacman) {
    const pacmanPoint = paths.pacman.getPointAt(progress);
    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);
      slerpToLayDown(pacman, pausedRotations["pacman"], progress);
    }
  }

  // Update ghosts with smooth rotation
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

// Helper function to smoothly transition camera between states
export function smoothCameraTransition(
  fromPos: THREE.Vector3,
  toPos: THREE.Vector3,
  fromQuat: THREE.Quaternion,
  toQuat: THREE.Quaternion,
  progress: number
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const position = new THREE.Vector3().lerpVectors(fromPos, toPos, progress);
  const quaternion = new THREE.Quaternion()
    .copy(fromQuat)
    .slerp(toQuat, progress);

  return { position, quaternion };
}

// Optional: Add easing functions for smoother animations
export const easingFunctions = {
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  easeOutQuart: (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  },
  smoothStep: (t: number): number => {
    return t * t * (3 - 2 * t);
  },
};
