import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import {
  getCameraHomeScrollPathPoints,
  objectHomeScrollEndPathPoint,
} from "../paths/pathpoints";
import { homeLoopHandler } from "./home-loop";
import { LAY_DOWN_QUAT_1, LAY_DOWN_QUAT_2 } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import {
  updateObjectRotation,
  updateObjectOpacity,
  getCurrentRotations,
} from "./object-state";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

let startPositions: Record<string, THREE.Vector3> = {};

const characterSpeeds: Record<string, number> = {
  pacman: 0.9,
  ghost1: 1,
  ghost2: 1.1,
  ghost3: 1.2,
  ghost4: 1.3,
  ghost5: 1.4,
};

export function initHomeScrollAnimation() {
  if (homeScrollTimeline) {
    homeScrollTimeline.kill();
    homeScrollTimeline = null;
  }

  // Camera path points (unchanged - camera still uses bezier curve)
  const cameraPathPoints = getCameraHomeScrollPathPoints();

  // Create camera path
  const cameraPath = new THREE.CurvePath<THREE.Vector3>();
  if (cameraPathPoints.length === 4) {
    const cameraCurve = new THREE.CubicBezierCurve3(
      cameraPathPoints[0].pos,
      cameraPathPoints[1].pos,
      cameraPathPoints[2].pos,
      cameraPathPoints[3].pos
    );
    cameraPath.add(cameraCurve);
  }

  homeScrollTimeline = gsap.timeline({
    scrollTrigger: {
      id: "homeScroll",
      trigger: ".sc--home",
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      onEnter: () => {
        requestAnimationFrame(() => {
          const freshRotations = getCurrentRotations();
          const scrollDir = getScrollDirection();

          // CRITICAL: Store ACTUAL current positions (not t-values)
          // These are the positions where objects are RIGHT NOW when entering home-scroll
          const freshPositions: Record<string, THREE.Vector3> = {};

          Object.entries(ghosts).forEach(([key, object]) => {
            // Use actual object position (from home-loop or wherever it is)
            freshPositions[key] = object.position.clone();
          });

          // Also include pacman
          if (pacman) {
            freshPositions["pacman"] = pacman.position.clone();
          }

          // Store for use in animations
          startPositions = freshPositions;

          // Recreate animations with fresh FROM values (including camera)
          createObjectAnimations();
          createCameraAnimation();

          applyHomeScrollPreset(
            true,
            scrollDir,
            freshPositions,
            freshRotations
          );
        });
      },
      onEnterBack: () => {
        requestAnimationFrame(() => {
          const freshRotations = getCurrentRotations();
          const scrollDir = getScrollDirection();

          // CRITICAL: Store ACTUAL current positions (not t-values)
          // These are the positions where objects are RIGHT NOW when entering back
          const freshPositions: Record<string, THREE.Vector3> = {};

          Object.entries(ghosts).forEach(([key, object]) => {
            // Use actual object position
            freshPositions[key] = object.position.clone();
          });

          // Note: pacman is already in ghosts, so it's included above

          // Store for use in animations
          startPositions = freshPositions;

          // Recreate animations with fresh FROM values (including camera)
          createObjectAnimations();
          createCameraAnimation();

          applyHomeScrollPreset(
            true,
            scrollDir,
            freshPositions,
            freshRotations
          );
        });
      },
      onScrubComplete: () => {
        requestAnimationFrame(() => {
          homeLoopHandler();
        });
      },
    },
  });

  // Initialize startPositions with current positions
  // Note: ghosts already contains pacman, so we don't need to add it separately
  const allObjects = Object.entries(ghosts);
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();
  });

  // Function to create/update animations with current FROM values
  const createObjectAnimations = () => {
    // Kill existing animations first
    allObjects.forEach(([key, object]) => {
      gsap.killTweensOf(object.position);
      gsap.killTweensOf(object.rotation);
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              gsap.killTweensOf(mat);
              gsap.killTweensOf(mat.opacity);
            });
          } else {
            gsap.killTweensOf(mesh.material);
            gsap.killTweensOf((mesh.material as any).opacity);
          }
        }
      });
    });

    // GSAP fromTo for each object - FROM: currentPos, currentRotation, opacity 1
    // TO: endPos, endRotation, opacity 0
    allObjects.forEach(([key, object]) => {
      // Get materials for opacity
      const materials: any[] = [];
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            materials.push(...mesh.material);
          } else {
            materials.push(mesh.material);
          }
        }
      });

      // Get FROM values: currentPos, currentRotation, opacity 1
      const startPos = startPositions[key] || object.position.clone();
      const startRot = getCurrentRotations()[key] || object.quaternion.clone();

      // Convert quaternion to Euler for GSAP (GSAP can't animate quaternions directly)
      const startEuler = new THREE.Euler().setFromQuaternion(startRot);

      // Calculate TO values: endPos, endRotation, opacity 0
      const endPos = objectHomeScrollEndPathPoint;
      const d1 = startRot.angleTo(LAY_DOWN_QUAT_1);
      const d2 = startRot.angleTo(LAY_DOWN_QUAT_2);
      const endRot = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;
      const endEuler = new THREE.Euler().setFromQuaternion(endRot);

      // GSAP fromTo - animates position directly
      homeScrollTimeline!.fromTo(
        object.position,
        {
          // FROM: currentPos
          x: startPos.x,
          y: startPos.y,
          z: startPos.z,
        },
        {
          // TO: endPos
          x: endPos.x,
          y: endPos.y,
          z: endPos.z,
          ease: "power1.25",
        }
      );

      // GSAP fromTo - animates rotation directly (as Euler)
      homeScrollTimeline!.fromTo(
        object.rotation,
        {
          // FROM: currentRotation (as Euler)
          x: startEuler.x,
          y: startEuler.y,
          z: startEuler.z,
        },
        {
          // TO: endRotation (as Euler)
          x: endEuler.x,
          y: endEuler.y,
          z: endEuler.z,
          ease: "power1.5",
          onUpdate: function () {
            // Update quaternion from Euler rotation
            object.quaternion.setFromEuler(object.rotation);
            updateObjectRotation(key, object.quaternion);
          },
        }
      );

      // GSAP fromTo - animates opacity directly
      if (materials.length > 0) {
        homeScrollTimeline!.fromTo(
          materials,
          {
            // FROM: opacity 1.0
            opacity: 1.0,
          },
          {
            // TO: opacity 0.0
            opacity: 0.0,
            keyframes: [
              { opacity: 1.0, duration: 0.85 }, // Stay at 100% until 85%
              { opacity: 0.0, duration: 0.15 }, // Fade to 0% from 85-100%
            ],
            onUpdate: function () {
              materials.forEach((mat) => {
                mat.transparent = mat.opacity < 1.0;
              });
              updateObjectOpacity(key, materials[0]?.opacity ?? 1.0);
            },
          }
        );
      }
    });
  };

  // Store camera progress wrapper for killing
  let cameraProgressWrapper: { value: number } | null = null;

  // Function to create camera animation
  const createCameraAnimation = () => {
    // Kill existing camera animation
    if (cameraProgressWrapper) {
      gsap.killTweensOf(cameraProgressWrapper);
    }

    cameraProgressWrapper = { value: 0 };
    homeScrollTimeline!.fromTo(
      cameraProgressWrapper,
      { value: 0 },
      {
        value: 1,
        immediateRender: false,
        onUpdate: function () {
          const progress = this.targets()[0].value;
          if (cameraPath) {
            const cameraPoint = cameraPath.getPointAt(progress);
            camera.position.copy(cameraPoint);

            const lookAtPoints: THREE.Vector3[] = [];
            cameraPathPoints.forEach((point) => {
              if ("lookAt" in point && point.lookAt) {
                lookAtPoints.push(point.lookAt);
              }
            });

            if (lookAtPoints.length >= 4) {
              const lookAtCurve = new THREE.CubicBezierCurve3(
                lookAtPoints[0],
                lookAtPoints[1],
                lookAtPoints[2],
                lookAtPoints[3]
              );
              const lookAtPoint = lookAtCurve.getPoint(progress);
              camera.lookAt(lookAtPoint);
            }
            camera.fov = originalFOV;
            camera.updateProjectionMatrix();
          }
        },
      }
    );
  };

  // Create animations initially
  createObjectAnimations();
  createCameraAnimation();
}
