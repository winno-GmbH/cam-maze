import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { LAY_DOWN_QUAT_1 } from "./util";
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
import { ghostMaterial, materialMap, pillMaterialMap } from "../core/materials";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

let startPositions: Record<string, THREE.Vector3> = {};
let allObjects: Array<[string, THREE.Object3D]> = [];
// Track cloned materials for disposal
const clonedMaterials: THREE.Material[] = [];
// Cache for paths to avoid recalculation
let cachedPaths: Record<string, THREE.CurvePath<THREE.Vector3>> | null = null;
let cachedPathsKey: string | null = null;

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

  // Camera animation props for GSAP
  const cameraAnimProps = {
    progress: 0,
  };

  const disposeClonedMaterials = () => {
    clonedMaterials.forEach((mat) => {
      mat.dispose();
    });
    clonedMaterials.length = 0;
  };

  const handleScrollLeave = () => {
    const introScrollTrigger = ScrollTrigger.getById("introScroll");
    // Pause timeline to prevent reverse animation when scrolling back
    if (homeScrollTimeline) {
      homeScrollTimeline.pause();
    }
    // Kill all object animations and reset opacity when leaving home-scroll
    allObjects.forEach(([key, object]) => {
      killObjectAnimations(object);
      setObjectOpacity(object, 1.0, {
        preserveTransmission: true,
        skipCurrencySymbols: true,
      });
    });
    // Dispose cloned materials to prevent memory leaks
    disposeClonedMaterials();

    // Smooth camera fade/transition when leaving home-scroll
    // This helps mask the transition to home-loop
    requestAnimationFrame(() => {
      const homeLoopTrigger = ScrollTrigger.getById("homeLoop");
      if (!homeLoopTrigger || !homeLoopTrigger.isActive) {
        // Only fade if not immediately going to home-loop
        // Camera will be handled by startHomeLoop if transitioning there
      }
    });
  };

  const handleScrollEnter = () => {
    requestAnimationFrame(() => {
      const introScrollTrigger = ScrollTrigger.getById("introScroll");
      if (introScrollTrigger?.isActive) {
        return;
      }

      const homeLoopStartPos = getHomeLoopStartPositions();
      const homeLoopStartRot = getHomeLoopStartRotations();
      const scrollDir = getScrollDirection();

      Object.entries(ghosts).forEach(([key, object]) => {
        if (homeLoopStartPos[key]) {
          object.position.copy(homeLoopStartPos[key]);
          startPositions[key] = homeLoopStartPos[key].clone();
        } else {
          const currentPositions = getCurrentPositions();
          const position = currentPositions[key] || object.position;
          object.position.copy(position);
          startPositions[key] = position.clone();
        }

        if (homeLoopStartRot[key]) {
          object.quaternion.copy(homeLoopStartRot[key]);
        }
      });

      const rotationsToUse =
        Object.keys(homeLoopStartRot).length > 0
          ? homeLoopStartRot
          : getCurrentRotations();

      applyHomeScrollPreset(true, scrollDir, startPositions, rotationsToUse);

      createObjectAnimations();
      createCameraAnimation(); // Recreate camera animation when entering
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
      onLeave: handleScrollLeave,
      onLeaveBack: handleScrollLeave,
    },
  });

  allObjects = Object.entries(ghosts);
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();
  });

  // Create camera animation with GSAP for smooth easing
  const createCameraAnimation = () => {
    if (!cameraPath || !cameraPath.curves.length || !homeScrollTimeline) return;

    // Kill any existing camera animation tweens
    gsap.killTweensOf(cameraAnimProps);

    const lookAtPoints: THREE.Vector3[] = [];
    cameraPathPoints.forEach((point) => {
      if ("lookAt" in point && point.lookAt) {
        lookAtPoints.push(point.lookAt);
      }
    });

    const lookAtCurve =
      lookAtPoints.length >= 4
        ? new THREE.CubicBezierCurve3(
            lookAtPoints[0],
            lookAtPoints[1],
            lookAtPoints[2],
            lookAtPoints[3]
          )
        : null;

    // Start camera at initial position
    const startCameraPoint = cameraPath.getPointAt(0);
    camera.position.copy(startCameraPoint);
    if (lookAtCurve) {
      const startLookAt = lookAtCurve.getPoint(0);
      camera.lookAt(startLookAt);
    }
    camera.fov = originalFOV;
    camera.updateProjectionMatrix();

    // Reset camera progress
    cameraAnimProps.progress = 0;

    // Animate camera progress with GSAP (same easing as objects)
    homeScrollTimeline.fromTo(
      cameraAnimProps,
      {
        progress: 0,
      },
      {
        progress: 1,
        ease: "power2.out", // Same easing as objects
        immediateRender: false,
        duration: 1.0, // Same duration as objects to sync
        onUpdate: function () {
          const introScrollTrigger = ScrollTrigger.getById("introScroll");
          const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
          // Don't update if intro scroll is active or home scroll is not active
          if (introScrollTrigger?.isActive || !homeScrollTrigger?.isActive) {
            return;
          }

          // Accelerate camera progress so it reaches the end faster
          // Apply easing on top of GSAP easing for faster arrival
          const easedProgress = Math.pow(cameraAnimProps.progress, 0.4);

          const cameraPoint = cameraPath.getPointAt(easedProgress);
          camera.position.copy(cameraPoint);

          if (lookAtCurve) {
            const lookAtPoint = lookAtCurve.getPoint(easedProgress);
            camera.lookAt(lookAtPoint);
          }
          camera.fov = originalFOV;
          camera.updateProjectionMatrix();
        },
      },
      0 // Start at timeline position 0 (same as objects)
    );
  };

  const createObjectAnimations = () => {
    if (homeScrollTimeline) {
      homeScrollTimeline.clear();
    }

    allObjects.forEach(([key, object]) => {
      killObjectAnimations(object);
    });

    // Dispose old cloned materials before creating new ones
    disposeClonedMaterials();

    // Check if paths need to be recalculated
    const pathsKey = JSON.stringify(startPositions);
    let homeScrollPaths: Record<string, THREE.CurvePath<THREE.Vector3>>;
    if (cachedPaths && cachedPathsKey === pathsKey) {
      homeScrollPaths = cachedPaths;
    } else {
      homeScrollPaths = getHomeScrollPaths(startPositions);
      cachedPaths = homeScrollPaths;
      cachedPathsKey = pathsKey;
    }

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
          // Only clone if material is shared (not already cloned)
          const isSharedMaterial =
            mat === ghostMaterial ||
            Object.values(materialMap).includes(mat) ||
            Object.values(pillMaterialMap).includes(mat);

          let clonedMat: THREE.Material;
          if (
            isSharedMaterial ||
            !mesh.material ||
            Array.isArray(mesh.material)
          ) {
            clonedMat = mat.clone();
            clonedMaterials.push(clonedMat);
            setMaterialOpacity(clonedMat, currentMaterialOpacity, true);

            if (Array.isArray(mesh.material)) {
              const index = mesh.material.indexOf(mat);
              if (index !== -1) {
                const newMaterials = [...mesh.material];
                newMaterials[index] = clonedMat;
                mesh.material = newMaterials;
              }
            } else {
              mesh.material = clonedMat;
            }
          } else {
            // Material already cloned, just update opacity
            setMaterialOpacity(mat, currentMaterialOpacity, true);
          }
        },
        { skipCurrencySymbols: false }
      );

      const homeLoopStartRot = getHomeLoopStartRotations();
      const startRot =
        homeLoopStartRot[key] ||
        getCurrentRotations()[key] ||
        object.quaternion.clone();
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

    // All animations should have the same duration (1.0) to sync with scroll progress
    // The stagger effect is achieved by offsetting the start time instead
    const baseDuration = 1.0;
    const staggerOffset = STAGGER_AMOUNT;

    animationData.forEach((data, index) => {
      const animProps = animPropsArray[index];
      // Start time offset for stagger effect
      const startTime = index * staggerOffset;
      // All animations have the same duration to sync with scroll progress
      const duration = baseDuration;

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
            const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
            // Don't update if intro scroll is active or home scroll is not active
            if (introScrollTrigger?.isActive || !homeScrollTrigger?.isActive) {
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
        startTime // Start time offset for stagger
      );
    });
  };

  createObjectAnimations();
  createCameraAnimation(); // Create camera animation with GSAP easing
}
