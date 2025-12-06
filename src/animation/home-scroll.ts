import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { LAY_DOWN_QUAT_1, OBJECT_KEYS } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import {
  getCurrentRotations,
  getCurrentPositions,
  getHomeLoopStartPositions,
  getHomeLoopStartRotations,
} from "./object-state";
import {
  setObjectOpacity,
  getObjectOpacity,
  forEachMaterial,
  setMaterialOpacity,
} from "../core/material-utils";
import { killObjectAnimations } from "./scene-utils";
import {
  SCROLL_SELECTORS,
  SCRUB_DURATION,
  STAGGER_AMOUNT,
  OPACITY,
} from "./constants";
import { vector3PoolTemp, quaternionPoolTemp } from "../core/object-pool";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

let startPositions: Record<string, THREE.Vector3> = {};

export function initHomeScrollAnimation() {
  if (homeScrollTimeline) {
    homeScrollTimeline.kill();
    homeScrollTimeline = null;
  }

  const cameraPathPoints = getCameraHomeScrollPathPoints();

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

  const handleScrollEnter = () => {
    requestAnimationFrame(() => {
      const introScrollTrigger = ScrollTrigger.getById("introScroll");
      if (introScrollTrigger?.isActive) {
        return;
      }

      const homeLoopStartPos = getHomeLoopStartPositions();
      const homeLoopStartRot = getHomeLoopStartRotations();
      const scrollDir = getScrollDirection();

      for (const key of OBJECT_KEYS) {
        const object = ghosts[key];
        if (homeLoopStartPos[key]) {
          object.position.copy(homeLoopStartPos[key]);
          const tempPos = vector3PoolTemp.acquire();
          tempPos.copy(homeLoopStartPos[key]);
          startPositions[key] = tempPos;
        } else {
          const currentPositions = getCurrentPositions();
          const position = currentPositions[key] || object.position;
          object.position.copy(position);
          const tempPos = vector3PoolTemp.acquire();
          tempPos.copy(position);
          startPositions[key] = tempPos;
        }

        if (homeLoopStartRot[key]) {
          object.quaternion.copy(homeLoopStartRot[key]);
        }
      }

      const rotationsToUse =
        Object.keys(homeLoopStartRot).length > 0
          ? homeLoopStartRot
          : getCurrentRotations();

      applyHomeScrollPreset(true, scrollDir, startPositions, rotationsToUse);

      createObjectAnimations();
    });
  };

  homeScrollTimeline = gsap.timeline({
    scrollTrigger: {
      id: "homeScroll",
      trigger: SCROLL_SELECTORS.HOME,
      start: "top top",
      end: "bottom top",
      scrub: SCRUB_DURATION,
      markers: false,
      refreshPriority: 0,
      invalidateOnRefresh: false,
      onEnter: handleScrollEnter,
      onEnterBack: handleScrollEnter,
      onUpdate: (self) => {
        if (cameraPath && cameraPath.curves.length) {
          const progress = self.progress;
          const clampedProgress = Math.min(1, Math.max(0, progress));
          const cameraPoint = cameraPath.getPointAt(clampedProgress);
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
            const lookAtPoint = lookAtCurve.getPoint(clampedProgress);
            camera.lookAt(lookAtPoint);
          }
          camera.fov = originalFOV;
          camera.updateProjectionMatrix();
        }
      },
      onLeave: () => {
        const introScrollTrigger = ScrollTrigger.getById("introScroll");
        if (!introScrollTrigger?.isActive) {
          homeScrollTimeline?.resume();
        }
      },
      onLeaveBack: () => {
        const introScrollTrigger = ScrollTrigger.getById("introScroll");
        if (!introScrollTrigger?.isActive) {
          homeScrollTimeline?.resume();
        }
      },
    },
  });

  for (const key of OBJECT_KEYS) {
    const object = ghosts[key];
    const tempPos = vector3PoolTemp.acquire();
    tempPos.copy(object.position);
    startPositions[key] = tempPos;
  }

  const createObjectAnimations = () => {
    if (homeScrollTimeline) {
      homeScrollTimeline.clear();
    }

    for (const key of OBJECT_KEYS) {
      killObjectAnimations(ghosts[key]);
    }

    const homeScrollPaths = getHomeScrollPaths(startPositions);

    const animPropsArray: any[] = [];
    const animationData: Array<{
      key: string;
      object: THREE.Object3D;
      path: THREE.CurvePath<THREE.Vector3>;
      startEuler: THREE.Euler;
      endEuler: THREE.Euler;
    }> = [];

    for (const key of OBJECT_KEYS) {
      const object = ghosts[key];
      const currentMaterialOpacity = getObjectOpacity(object);

      forEachMaterial(
        object,
        (mat: any, mesh: THREE.Mesh) => {
          const clonedMat = mat.clone();
          setMaterialOpacity(clonedMat, currentMaterialOpacity, true);

          if (Array.isArray(mesh.material)) {
            const index = mesh.material.indexOf(mat);
            if (index !== -1) {
              const clonedMaterials = [...mesh.material];
              clonedMaterials[index] = clonedMat;
              mesh.material = clonedMaterials;
            }
          } else {
            mesh.material = clonedMat;
          }
        },
        { skipCurrencySymbols: false }
      );

      const homeLoopStartRot = getHomeLoopStartRotations();
      const tempQuat = quaternionPoolTemp.acquire();
      if (homeLoopStartRot[key]) {
        tempQuat.copy(homeLoopStartRot[key]);
      } else {
        const currentRots = getCurrentRotations();
        if (currentRots[key]) {
          tempQuat.copy(currentRots[key]);
        } else {
          tempQuat.copy(object.quaternion);
        }
      }
      const startEuler = new THREE.Euler().setFromQuaternion(tempQuat);
      const endEuler = new THREE.Euler().setFromQuaternion(LAY_DOWN_QUAT_1);
      quaternionPoolTemp.release(tempQuat);

      const path = homeScrollPaths[key];
      if (!path) {
        return;
      }

      const animProps = {
        progress: 0,
        rotX: startEuler.x,
        rotY: startEuler.y,
        rotZ: startEuler.z,
        opacity: currentMaterialOpacity,
      };

      animPropsArray.push(animProps);
      animationData.push({
        key,
        object,
        path,
        startEuler,
        endEuler,
      });
    }

    const baseEndTime = 1;

    animationData.forEach((data, index) => {
      const animProps = animPropsArray[index];
      const endTime = baseEndTime + index * STAGGER_AMOUNT;
      const duration = endTime;

      const startPathPoint = data.path.getPointAt(0);
      data.object.position.copy(startPathPoint);

      homeScrollTimeline!.fromTo(
        animProps,
        {
          progress: 0,
          rotX: data.startEuler.x,
          rotY: data.startEuler.y,
          rotZ: data.startEuler.z,
          opacity: animProps.opacity,
        },
        {
          progress: 1,
          rotX: data.endEuler.x,
          rotY: data.endEuler.y,
          rotZ: data.endEuler.z,
          opacity: OPACITY.HIDDEN,
          ease: "power2.out",
          immediateRender: false,
          duration: duration,
          onUpdate: function () {
            const introScrollTrigger = ScrollTrigger.getById("introScroll");
            if (introScrollTrigger?.isActive) {
              return;
            }

            const pathPoint = data.path.getPointAt(animProps.progress);
            data.object.position.copy(pathPoint);

            data.object.rotation.set(
              animProps.rotX,
              animProps.rotY,
              animProps.rotZ
            );
            data.object.quaternion.setFromEuler(data.object.rotation);

            setObjectOpacity(data.object, animProps.opacity, {
              preserveTransmission: true,
              skipCurrencySymbols: true,
            });
          },
        },
        0
      );
    });
  };

  createObjectAnimations();
}
