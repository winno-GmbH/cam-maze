import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock } from "../core/scene";
import {
  getCameraHomeScrollPathPoints,
  objectHomeScrollEndPathPoint,
} from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { LAY_DOWN_QUAT_1 } from "./util";
// Pacman rotation offsets (X=90°, Y=180°, Z=0° for correct end position)
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
import { killObjectAnimations } from "./scene-utils";
import { SCROLL_SELECTORS, SCRUB_DURATION, OPACITY } from "./constants";
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
// Cache start rotation quaternion
let startRotationQuaternion: THREE.Quaternion | null = null;
// Cache start Z rotation
let startRotZ: number | null = null;
// Cache maze center lookAt rotation (reached at 50% progress)
let mazeCenterLookAtQuaternion: THREE.Quaternion | null = null;

export function initHomeScrollAnimation() {
  if (homeScrollTimeline) {
    homeScrollTimeline.kill();
    homeScrollTimeline = null;
  }

  // Reset rotation caches
  startRotationQuaternion = null;
  startRotZ = null;
  mazeCenterLookAtQuaternion = null;

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

  // Calculate maze center lookAt rotation (reached at 50% progress)
  // This will be calculated at the middle camera position
  const lookAtTarget = new THREE.Vector3(0.55675, 0.2, 0.45175);
  const startCameraPos = cameraPathPoints[0].pos;
  const endCameraPos = cameraPathPoints[cameraPathPoints.length - 1].pos;
  const middleCameraPos = startCameraPos.clone().lerp(endCameraPos, 0.5);

  // Calculate rotation at middle position looking at maze center
  const tempCamera = new THREE.PerspectiveCamera();
  tempCamera.position.copy(middleCameraPos);
  tempCamera.lookAt(lookAtTarget);
  mazeCenterLookAtQuaternion = tempCamera.quaternion.clone();

  const mazeCenterEuler = new THREE.Euler().setFromQuaternion(
    mazeCenterLookAtQuaternion
  );
  console.log("Maze center lookAt rotation (reached at 50%):", {
    x: (mazeCenterEuler.x * 180) / Math.PI,
    y: (mazeCenterEuler.y * 180) / Math.PI,
    z: (mazeCenterEuler.z * 180) / Math.PI,
    middleCameraPos: middleCameraPos,
    lookAtTarget: lookAtTarget,
  });

  const disposeClonedMaterials = () => {
    clonedMaterials.forEach((mat) => {
      mat.dispose();
    });
    clonedMaterials.length = 0;
  };

  const handleScrollLeave = () => {
    const introScrollTrigger = ScrollTrigger.getById("introScroll");
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
  };

  const handleScrollEnter = () => {
    requestAnimationFrame(() => {
      const introScrollTrigger = ScrollTrigger.getById("introScroll");
      if (introScrollTrigger?.isActive) {
        return;
      }

      // Store start rotation quaternion
      startRotationQuaternion = camera.quaternion.clone();

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
        if (!cameraPath?.curves.length) return;

        const clampedProgress = Math.min(1, Math.max(0, self.progress));
        const cameraProgress = 1 - Math.pow(1 - clampedProgress, 1.5);

        // Set start rotation quaternion and Z rotation if not set yet (at the very beginning)
        if (!startRotationQuaternion) {
          startRotationQuaternion = camera.quaternion.clone();
          startRotZ = camera.rotation.z;
          const startEuler = new THREE.Euler().setFromQuaternion(
            startRotationQuaternion
          );
          console.log("Start rotation:", {
            x: (startEuler.x * 180) / Math.PI,
            y: (startEuler.y * 180) / Math.PI,
            z: (startRotZ * 180) / Math.PI,
          });
        }

        // Update camera position
        camera.position.copy(cameraPath.getPointAt(cameraProgress));

        // Rotation: 0-50% interpolate to maze center lookAt, 50-100% maintain lookAt
        const lookAtTarget = new THREE.Vector3(0.55675, 0.2, 0.45175);

        if (startRotationQuaternion && mazeCenterLookAtQuaternion) {
          if (clampedProgress < 0.5) {
            // 0-50%: Interpolate from start rotation to maze center lookAt
            const rotationProgress = clampedProgress * 2; // Map 0-0.5 to 0-1
            const easedProgress =
              rotationProgress * rotationProgress * rotationProgress; // Cubic ease-in

            camera.quaternion
              .copy(startRotationQuaternion)
              .slerp(mazeCenterLookAtQuaternion, easedProgress);

            // Z rotation: linear from start to 0 (scaled to 50%)
            if (startRotZ !== null) {
              camera.rotation.z = startRotZ * (1 - easedProgress);
            }
          } else {
            // 50-100%: Maintain lookAt maze center (direct lookAt)
            camera.lookAt(lookAtTarget);

            // Z rotation: continue to 0
            if (startRotZ !== null) {
              const remainingProgress = (clampedProgress - 0.5) * 2; // Map 0.5-1.0 to 0-1
              camera.rotation.z = startRotZ * (1 - remainingProgress);
            }
          }

          // Log rotation every 10% progress
          if (
            Math.floor(clampedProgress * 10) !==
            Math.floor((clampedProgress - 0.001) * 10)
          ) {
            const currentEuler = new THREE.Euler().setFromQuaternion(
              camera.quaternion
            );
            console.log(`Progress ${(clampedProgress * 100).toFixed(0)}%:`, {
              x: (currentEuler.x * 180) / Math.PI,
              y: (currentEuler.y * 180) / Math.PI,
              z: (camera.rotation.z * 180) / Math.PI,
              cameraPos: camera.position,
            });
          }
        } else {
          // Fallback: directly look at target
          camera.lookAt(lookAtTarget);
        }

        camera.fov = originalFOV;
        camera.updateProjectionMatrix();
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

      // Calculate end rotation
      let endEuler: THREE.Euler;
      if (key === "pacman") {
        // Apply rotation offsets for correct end position
        const offsets = PACMAN_ROTATION_OFFSETS;
        const xRotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          (offsets.x * Math.PI) / 180
        );
        const yRotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (offsets.y * Math.PI) / 180
        );
        const zRotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          (offsets.z * Math.PI) / 180
        );
        const pacmanLayDown = LAY_DOWN_QUAT_1.clone()
          .multiply(yRotation)
          .multiply(xRotation)
          .multiply(zRotation);
        endEuler = new THREE.Euler().setFromQuaternion(pacmanLayDown);
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

    // Define start and end scroll percentages for each object
    // Format: [start%, end%]
    const objectTimings = [
      [0.0, 0.7], // Pacman: start 0%, end 70%
      [0.05, 0.75], // Ghost1: start 5%, end 75%
      [0.1, 0.8], // Ghost2: start 10%, end 80%
      [0.15, 0.85], // Ghost3: start 15%, end 85%
      [0.2, 0.9], // Ghost4: start 20%, end 90%
      [0.25, 0.95], // Ghost5: start 25%, end 95%
    ];

    animationData.forEach((data, index) => {
      const animProps = animPropsArray[index];
      const timing = objectTimings[index] || [0, 1];
      const [startPercent, endPercent] = timing;

      // Calculate start time and duration based on percentages
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
            // Don't update if intro scroll is active or home scroll is not active
            if (introScrollTrigger?.isActive || !homeScrollTrigger?.isActive) {
              return;
            }

            // Map scroll progress to object animation progress
            // animProps.progress is 0-1 within the object's animation window
            // Apply same easing to both position and rotation
            const rawProgress = animProps.progress;
            const easedProgress = rawProgress * rawProgress * rawProgress; // Cubic ease-in

            // Position uses eased progress
            const pathPoint = data.path.getPointAt(easedProgress);
            data.object.position.copy(pathPoint);

            // Rotation uses full scroll progress (0-100%) instead of object animation progress
            // This stretches the rotation over the entire home-scroll duration
            const fullScrollProgress = Math.min(
              1,
              Math.max(0, homeScrollTrigger.progress)
            );
            const rotationProgress =
              fullScrollProgress * fullScrollProgress * fullScrollProgress; // Cubic ease-in

            // Apply same rotation logic for all objects (Pacman and Ghosts)
            let startEuler = data.startEuler;
            let endEuler = data.endEuler;

            // Calculate eased rotation
            let finalRotX: number;
            let finalRotY: number;
            let finalRotZ: number;

            if (data.key === "pacman") {
              // Update pacmanMixer to keep mouth animation running
              if (pacmanMixer) {
                pacmanMixer.update(clock.getDelta());
              }
            }

            // Calculate eased rotation using full scroll progress (stretched over entire home-scroll)
            finalRotX =
              startEuler.x + (endEuler.x - startEuler.x) * rotationProgress;
            finalRotY =
              startEuler.y + (endEuler.y - startEuler.y) * rotationProgress;
            finalRotZ =
              startEuler.z + (endEuler.z - startEuler.z) * rotationProgress;

            // Set rotation for all objects
            data.object.rotation.set(finalRotX, finalRotY, finalRotZ);
            data.object.quaternion.setFromEuler(data.object.rotation);
            data.object.updateMatrixWorld(false);

            // Opacity animation: starts fading at 80% of the animation progress
            // From 0% to 80%: opacity stays at 1.0
            // From 80% to 100%: opacity fades from 1.0 to 0.0
            const opacityFadeStart = 0.8;
            let finalOpacity: number;
            if (rawProgress < opacityFadeStart) {
              // Before fade start: full opacity
              finalOpacity = OPACITY.FULL;
            } else {
              // During fade: map progress from [0.8, 1.0] to opacity [1.0, 0.0]
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
        startTime // Start time offset for stagger
      );
    });
  };

  createObjectAnimations();
}
