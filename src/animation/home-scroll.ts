import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock, onFrame } from "../core/scene";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { LAY_DOWN_QUAT_1 } from "./util";

const PACMAN_ROTATION_OFFSETS = { x: 90, y: 180, z: 0 };
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
import { killObjectAnimations, setObjectScale } from "./scene-utils";
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

const clonedMaterials: THREE.Material[] = [];

let cachedPaths: Record<string, THREE.CurvePath<THREE.Vector3>> | null = null;
let cachedPathsKey: string | null = null;

let cachedLookAtPoints: THREE.Vector3[] | null = null;
let cachedLookAtCurve: THREE.CubicBezierCurve3 | null = null;
const tempEuler = new THREE.Euler();
const DEG_TO_RAD = Math.PI / 180;

const pacmanRotationCache = {
  xAxis: new THREE.Vector3(1, 0, 0),
  yAxis: new THREE.Vector3(0, 1, 0),
  zAxis: new THREE.Vector3(0, 0, 1),
  xRotation: new THREE.Quaternion(),
  yRotation: new THREE.Quaternion(),
  zRotation: new THREE.Quaternion(),
  pacmanLayDown: new THREE.Quaternion(),
  tempEuler: new THREE.Euler(),
  endEuler: new THREE.Euler(),
  offsets: { x: 0, y: 0, z: 0 },
};

function updatePacmanRotationCache(offsets: {
  x: number;
  y: number;
  z: number;
}) {
  if (
    pacmanRotationCache.offsets.x === offsets.x &&
    pacmanRotationCache.offsets.y === offsets.y &&
    pacmanRotationCache.offsets.z === offsets.z
  ) {
    return;
  }

  pacmanRotationCache.offsets = { ...offsets };

  pacmanRotationCache.xRotation.setFromAxisAngle(
    pacmanRotationCache.xAxis,
    offsets.x * DEG_TO_RAD
  );
  pacmanRotationCache.yRotation.setFromAxisAngle(
    pacmanRotationCache.yAxis,
    offsets.y * DEG_TO_RAD
  );
  pacmanRotationCache.zRotation.setFromAxisAngle(
    pacmanRotationCache.zAxis,
    offsets.z * DEG_TO_RAD
  );

  pacmanRotationCache.pacmanLayDown
    .copy(LAY_DOWN_QUAT_1)
    .multiply(pacmanRotationCache.yRotation)
    .multiply(pacmanRotationCache.xRotation)
    .multiply(pacmanRotationCache.zRotation);

  pacmanRotationCache.endEuler.setFromQuaternion(
    pacmanRotationCache.pacmanLayDown
  );
}

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

  const disposeClonedMaterials = () => {
    clonedMaterials.forEach((mat) => {
      mat.dispose();
    });
    clonedMaterials.length = 0;
  };

  const handleScrollLeave = () => {
    const introScrollTrigger = ScrollTrigger.getById("introScroll");

    allObjects.forEach(([key, object]) => {
      killObjectAnimations(object);
      setObjectOpacity(object, 1.0, {
        preserveTransmission: true,
        skipCurrencySymbols: true,
      });

      // Reset object scales to intro when leaving home-scroll (going to intro)
      if (introScrollTrigger?.isActive) {
        setObjectScale(object, key, "intro");
      }
    });

    disposeClonedMaterials();

    cachedLookAtPoints = null;
    cachedLookAtCurve = null;

    if (pacmanMixer) {
      pacmanMixer.timeScale = 1.0;
    }
  };

  const handleScrollEnter = () => {
    requestAnimationFrame(() => {
      const introScrollTrigger = ScrollTrigger.getById("introScroll");
      if (introScrollTrigger?.isActive) {
        return;
      }

      if (pacmanMixer) {
        pacmanMixer.timeScale = 2.0;
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

          const cameraProgress = 1 - Math.pow(1 - clampedProgress, 1.5);

          const cameraPoint = cameraPath.getPointAt(cameraProgress);
          camera.position.copy(cameraPoint);

          if (!cachedLookAtPoints) {
            cachedLookAtPoints = [];
            cameraPathPoints.forEach((point) => {
              if ("lookAt" in point && point.lookAt) {
                cachedLookAtPoints!.push(point.lookAt);
              }
            });

            if (cachedLookAtPoints.length >= 4) {
              cachedLookAtCurve = new THREE.CubicBezierCurve3(
                cachedLookAtPoints[0],
                cachedLookAtPoints[1],
                cachedLookAtPoints[2],
                cachedLookAtPoints[3]
              );
            }
          }

          if (cachedLookAtCurve) {
            const lookAtPoint = cachedLookAtCurve.getPointAt(cameraProgress);
            camera.lookAt(lookAtPoint);

            const targetZRotation = -17 + cameraProgress * 17;

            tempEuler.setFromQuaternion(camera.quaternion);
            tempEuler.z = targetZRotation * DEG_TO_RAD;
            camera.quaternion.setFromEuler(tempEuler);
          }
          camera.fov = originalFOV;
          camera.updateProjectionMatrix();
        }
      },
      onLeave: handleScrollLeave,
      onLeaveBack: handleScrollLeave,
    },
  });

  allObjects = Object.entries(ghosts);
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();
  });

  const createObjectAnimations = () => {
    if (homeScrollTimeline) {
      homeScrollTimeline.clear();
    }

    allObjects.forEach(([key, object]) => {
      killObjectAnimations(object);
    });

    disposeClonedMaterials();

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

      let endEuler: THREE.Euler;
      if (key === "pacman") {
        updatePacmanRotationCache(PACMAN_ROTATION_OFFSETS);
        endEuler = pacmanRotationCache.endEuler.clone();
      } else {
        endEuler = new THREE.Euler().setFromQuaternion(LAY_DOWN_QUAT_1);
      }

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

    const objectTimings = [
      [0.0, 0.7],
      [0.05, 0.75],
      [0.1, 0.8],
      [0.15, 0.85],
      [0.2, 0.9],
      [0.25, 0.95],
    ];

    const baseDuration = 1.0;
    const staggerOffset = STAGGER_AMOUNT;

    animationData.forEach((data, index) => {
      const animProps = animPropsArray[index];
      const timing = objectTimings[index] || [0, 1];
      const [startPercent, endPercent] = timing;

      const startTime = startPercent;
      const duration = endPercent - startPercent;

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

            if (introScrollTrigger?.isActive || !homeScrollTrigger?.isActive) {
              return;
            }

            const rawProgress = animProps.progress;
            const easedProgress = rawProgress * rawProgress * rawProgress;

            const pathPoint = data.path.getPointAt(easedProgress);
            data.object.position.copy(pathPoint);

            let startEuler = data.startEuler;
            let endEuler = data.endEuler;

            let finalRotX: number;
            let finalRotY: number;
            let finalRotZ: number;

            if (data.key === "pacman") {
              updatePacmanRotationCache(PACMAN_ROTATION_OFFSETS);
              const cachedEndEuler = pacmanRotationCache.endEuler;

              finalRotX =
                startEuler.x +
                (cachedEndEuler.x - startEuler.x) * easedProgress;
              finalRotY =
                startEuler.y +
                (cachedEndEuler.y - startEuler.y) * easedProgress;
              finalRotZ =
                startEuler.z +
                (cachedEndEuler.z - startEuler.z) * easedProgress;

              if (pacmanMixer) {
                pacmanMixer.update(clock.getDelta());
              }
            } else {
              finalRotX =
                startEuler.x + (endEuler.x - startEuler.x) * easedProgress;
              finalRotY =
                startEuler.y + (endEuler.y - startEuler.y) * easedProgress;
              finalRotZ =
                startEuler.z + (endEuler.z - startEuler.z) * easedProgress;
            }

            data.object.rotation.set(finalRotX, finalRotY, finalRotZ);
            data.object.quaternion.setFromEuler(data.object.rotation);
            data.object.updateMatrixWorld(false);

            if (data.key === "pacman") {
              requestAnimationFrame(() => {
                const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
                if (homeScrollTrigger?.isActive && data.object) {
                  data.object.rotation.set(finalRotX, finalRotY, finalRotZ);
                  data.object.quaternion.setFromEuler(data.object.rotation);
                  data.object.updateMatrixWorld(false);
                }
              });
            }

            const opacityFadeStart = 0.8;
            let finalOpacity: number;
            if (rawProgress < opacityFadeStart) {
              finalOpacity = OPACITY.FULL;
            } else {
              const fadeProgress =
                (rawProgress - opacityFadeStart) / (1.0 - opacityFadeStart);
              finalOpacity = OPACITY.FULL * (1 - fadeProgress);
            }

            setObjectOpacity(data.object, finalOpacity, {
              preserveTransmission: true,
              skipCurrencySymbols: true,
            });
          },
        },
        startTime
      );
    });
  };

  createObjectAnimations();
}
