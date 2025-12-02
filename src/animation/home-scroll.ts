import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import {
  getCameraHomeScrollPathPoints,
  objectHomeScrollEndPathPoint,
} from "../paths/pathpoints";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown, LAY_DOWN_QUAT_1, LAY_DOWN_QUAT_2 } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import {
  updateObjectRotation,
  updateObjectOpacity,
  getCurrentRotations,
  getHomeLoopT,
  getHomeLoopPausedT,
  getIsHomeLoopActive,
} from "./object-state";
import { getHomePaths } from "../paths/paths";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

// Store actual positions when entering home-scroll (not t-values)
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

  // CRITICAL: Ensure opacity starts at 100% when entering home-scroll
  // Kill any opacity tweens and set to 1.0
  Object.entries(ghosts).forEach(([key, object]) => {
    gsap.killTweensOf(object);
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            gsap.killTweensOf(mat);
            gsap.killTweensOf(mat.opacity);
            mat.opacity = 1.0;
            mat.transparent = true;
          });
        } else {
          gsap.killTweensOf(mesh.material);
          gsap.killTweensOf((mesh.material as any).opacity);
          (mesh.material as any).opacity = 1.0;
          (mesh.material as any).transparent = true;
        }
      }
    });
  });

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

          // Also include pacman
          if (pacman) {
            freshPositions["pacman"] = pacman.position.clone();
          }

          // Store for use in animations
          startPositions = freshPositions;

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

  // Camera animation (separate, uses bezier curve)
  const cameraProgress = { value: 0 };
  homeScrollTimeline!.fromTo(
    cameraProgress,
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

  // Get current rotations for object animations
  const currentRotations = getCurrentRotations();

  // Animate all objects with GSAP fromTo
  const allObjects = [...Object.entries(ghosts)];
  if (pacman) {
    allObjects.push(["pacman", pacman]);
  }

  allObjects.forEach(([key, object]) => {
    // Get start position from stored positions (actual position when entering)
    const startPosition = startPositions[key];
    if (!startPosition) return;

    const startRotation = currentRotations[key];
    if (!startRotation) return;

    // Calculate target laying down rotation
    const d1 = startRotation.angleTo(LAY_DOWN_QUAT_1);
    const d2 = startRotation.angleTo(LAY_DOWN_QUAT_2);
    const targetQuat = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;

    // Calculate end position (with arc)
    const arcPoint = new THREE.Vector3(
      startPosition.x * (1 / 4) + objectHomeScrollEndPathPoint.x * (3 / 4),
      1.5,
      startPosition.z * (1 / 4) + objectHomeScrollEndPathPoint.z * (3 / 4)
    );

    // Wrapper objects for GSAP animation (GSAP can't animate Quaternion/Vector3 directly)
    const rotationProgress = { value: 0 };
    const positionProgress = { value: 0 };

    // FROM: currentRotation TO: layingDown rotation
    homeScrollTimeline!.fromTo(
      rotationProgress,
      { value: 0 },
      {
        value: 1,
        ease: "power1.5",
        onUpdate: function () {
          const progress = this.targets()[0].value;
          // Get fresh rotation in case home-loop updated it
          const freshRotation = getCurrentRotations()[key];
          if (freshRotation) {
            const d1 = freshRotation.angleTo(LAY_DOWN_QUAT_1);
            const d2 = freshRotation.angleTo(LAY_DOWN_QUAT_2);
            const targetQuat = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;
            object.quaternion.copy(
              freshRotation.clone().slerp(targetQuat, progress)
            );
            updateObjectRotation(key, object.quaternion);
          }
        },
      }
    );

    // FROM: currentPosition TO: endPosition (with bezier arc)
    homeScrollTimeline!.fromTo(
      positionProgress,
      { value: 0 },
      {
        value: 1,
        ease: "power1.25",
        onUpdate: function () {
          const progress = this.targets()[0].value;
          const speed = characterSpeeds[key] ?? 1.0;
          const rawProgress = Math.min(progress * speed, 1);
          const easedProgress = Math.pow(rawProgress, 1.25);

          // Use stored start position (actual position when entering home-scroll)
          const freshStartPosition = startPositions[key];
          if (!freshStartPosition) return;

          const t1 = easedProgress;
          const t2 = 1 - t1;
          const endPosition = new THREE.Vector3()
            .addScaledVector(freshStartPosition, t2 * t2)
            .addScaledVector(arcPoint, 2 * t1 * t2)
            .addScaledVector(objectHomeScrollEndPathPoint, t1 * t1);

          object.position.copy(endPosition);
        },
      }
    );

    // FROM: opacity 1.0 TO: opacity 0.0 (with keyframes for timing)
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

    if (materials.length > 0) {
      homeScrollTimeline!.fromTo(
        materials,
        { opacity: 1.0 },
        {
          opacity: 1.0,
          keyframes: [
            { opacity: 1.0, duration: 0.85 }, // Stay at 100% until 85%
            { opacity: 0.0, duration: 0.1 }, // Fade to 0% between 85-95%
            { opacity: 0.0, duration: 0.05 }, // Stay at 0% from 95-100%
          ],
          onUpdate: function () {
            const opacity = materials[0]?.opacity ?? 1.0;
            materials.forEach((mat) => {
              mat.transparent = opacity < 1.0;
            });
            updateObjectOpacity(key, opacity);
          },
        }
      );
    }
  });
}
