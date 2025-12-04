import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { LAY_DOWN_QUAT_1 } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import { updateObjectRotation, getCurrentRotations } from "./object-state";
import {
  setObjectOpacity,
  getObjectOpacity,
  forEachMaterial,
  setMaterialOpacity,
  setMaterialTransparent,
} from "../core/material-utils";
import {
  SCROLL_SELECTORS,
  SCRUB_DURATION,
  STAGGER_AMOUNT,
  OPACITY,
} from "./constants";

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
      const freshRotations = getCurrentRotations();
      const scrollDir = getScrollDirection();

      const freshPositions: Record<string, THREE.Vector3> = {};
      Object.entries(ghosts).forEach(([key, object]) => {
        freshPositions[key] = object.position.clone();
      });

      startPositions = freshPositions;

      applyHomeScrollPreset(true, scrollDir, freshPositions, freshRotations);

      Object.entries(ghosts).forEach(([key, object]) => {
        startPositions[key] = object.position.clone();
      });

      createObjectAnimations();
      createCameraAnimation();
    });
  };

  homeScrollTimeline = gsap.timeline({
    scrollTrigger: {
      id: "homeScroll",
      trigger: SCROLL_SELECTORS.HOME,
      start: "top top",
      end: "bottom top",
      scrub: SCRUB_DURATION,
      onEnter: handleScrollEnter,
      onEnterBack: handleScrollEnter,
      onScrubComplete: () => {
        requestAnimationFrame(() => {
          homeLoopHandler();
        });
      },
    },
  });

  const allObjects = Object.entries(ghosts);
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();
  });

  const createObjectAnimations = () => {
    if (homeScrollTimeline) {
      homeScrollTimeline.clear();
    }

    allObjects.forEach(([key, object]) => {
      gsap.killTweensOf(object);
      gsap.killTweensOf(object.position);
      gsap.killTweensOf(object.rotation);
    });

    const homeScrollPaths = getHomeScrollPaths(startPositions);

    const animPropsArray: any[] = [];
    const animationData: Array<{
      key: string;
      object: THREE.Object3D;
      path: THREE.CurvePath<THREE.Vector3>;
      startEuler: THREE.Euler;
      endEuler: THREE.Euler;
    }> = [];

    allObjects.forEach(([key, object]) => {
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

      const startRot = getCurrentRotations()[key] || object.quaternion.clone();
      const startEuler = new THREE.Euler().setFromQuaternion(startRot);

      const endEuler = new THREE.Euler().setFromQuaternion(LAY_DOWN_QUAT_1);

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
    });

    const totalObjects = animationData.length;

    animationData.forEach((data, index) => {
      const animProps = animPropsArray[index];
      const staggerPosition = index * (STAGGER_AMOUNT / totalObjects);

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
          ease: "power1.out",
          onUpdate: function () {
            const pathPoint = data.path.getPointAt(animProps.progress);
            data.object.position.copy(pathPoint);

            data.object.rotation.set(
              animProps.rotX,
              animProps.rotY,
              animProps.rotZ
            );
            data.object.quaternion.setFromEuler(data.object.rotation);
            updateObjectRotation(data.key, data.object.quaternion);

            setObjectOpacity(data.object, animProps.opacity, {
              preserveTransmission: true,
              skipCurrencySymbols: true,
            });
          },
        },
        staggerPosition
      );
    });
  };

  let cameraProgressWrapper: { value: number } | null = null;

  const createCameraAnimation = () => {
    if (cameraProgressWrapper) {
      gsap.killTweensOf(cameraProgressWrapper);
    }

    cameraProgressWrapper = { value: 0 };

    if (!cameraPath || cameraPath.curves.length === 0) {
      return;
    }

    homeScrollTimeline!.fromTo(
      cameraProgressWrapper,
      { value: 0 },
      {
        value: 1,
        immediateRender: false,
        onUpdate: function () {
          const progress = this.targets()[0].value;
          if (cameraPath && cameraPath.curves.length > 0) {
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
      },
      0
    );
  };

  createObjectAnimations();
  createCameraAnimation();
}
