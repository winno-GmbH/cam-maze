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

  // Initialize startPositions with current positions
  const allObjects = [...Object.entries(ghosts)];
  if (pacman) {
    allObjects.push(["pacman", pacman]);
  }
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();
  });

  // Simple fromTo animations for all objects
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

    // Wrapper object for animation progress
    const animProgress = { value: 0 };

    // FROM: currentPos, currentRotation, opacity 1
    // TO: endPos, endRotation, opacity 0
    homeScrollTimeline!.fromTo(
      animProgress,
      { value: 0 },
      {
        value: 1,
        onUpdate: function () {
          const progress = this.targets()[0].value;

          // FROM: Get start position and rotation (stored when entering)
          const startPos = startPositions[key];
          if (!startPos) return;

          const startRot = getCurrentRotations()[key];
          if (!startRot) return;

          // TO: End position and rotation
          const endPos = objectHomeScrollEndPathPoint;
          const d1 = startRot.angleTo(LAY_DOWN_QUAT_1);
          const d2 = startRot.angleTo(LAY_DOWN_QUAT_2);
          const endRot = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;

          // Interpolate position (FROM startPos TO endPos)
          const speed = characterSpeeds[key] ?? 1.0;
          const easedProgress = Math.pow(Math.min(progress * speed, 1), 1.25);
          object.position.copy(startPos.clone().lerp(endPos, easedProgress));

          // Interpolate rotation (FROM startRot TO endRot)
          object.quaternion.copy(
            startRot.clone().slerp(endRot, Math.pow(progress, 1.5))
          );
          updateObjectRotation(key, object.quaternion);

          // Interpolate opacity (FROM 1.0 TO 0.0)
          let opacity = 1.0;
          if (progress > 0.85) {
            opacity = 1.0 - (progress - 0.85) / 0.15; // Fade from 85-100%
          }
          opacity = Math.max(0, Math.min(1, opacity));

          materials.forEach((mat) => {
            mat.opacity = opacity;
            mat.transparent = opacity < 1.0;
          });
          updateObjectOpacity(key, opacity);
        },
      }
    );
  });
}
