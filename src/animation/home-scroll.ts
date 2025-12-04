import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import {
  getCameraHomeScrollPathPoints,
  objectHomeScrollEndPathPoint,
} from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { LAY_DOWN_QUAT_1, LAY_DOWN_QUAT_2 } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";
import { updateObjectRotation, getCurrentRotations } from "./object-state";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

let startPositions: Record<string, THREE.Vector3> = {};

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

          // Store for use in animations
          startPositions = freshPositions;

          // Apply preset FIRST to set positions and opacity correctly
          applyHomeScrollPreset(
            true,
            scrollDir,
            freshPositions,
            freshRotations
          );

          // Update startPositions with the positions set by applyHomeScrollPreset
          Object.entries(ghosts).forEach(([key, object]) => {
            startPositions[key] = object.position.clone();
          });

          // Recreate animations with fresh FROM values (including camera)
          // Create object animations FIRST (this clears the timeline)
          createObjectAnimations();
          // Then create camera animation (after timeline is cleared, so it's not removed)
          createCameraAnimation();
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

          // Store for use in animations
          startPositions = freshPositions;

          // Apply preset FIRST to set positions and opacity correctly
          applyHomeScrollPreset(
            true,
            scrollDir,
            freshPositions,
            freshRotations
          );

          // Update startPositions with the positions set by applyHomeScrollPreset
          Object.entries(ghosts).forEach(([key, object]) => {
            startPositions[key] = object.position.clone();
          });

          // Recreate animations with fresh FROM values (including camera)
          // Create object animations FIRST (this clears the timeline)
          createObjectAnimations();
          // Then create camera animation (after timeline is cleared, so it's not removed)
          createCameraAnimation();
        });
      },
      onScrubComplete: () => {
        requestAnimationFrame(() => {
          homeLoopHandler();
        });
      },
    },
  });

  // Initialize startPositions with current values
  // Note: ghosts already contains pacman, so we don't need to add it separately
  const allObjects = Object.entries(ghosts);
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();
  });

  // Function to create/update animations with current FROM values
  const createObjectAnimations = () => {
    // Clear timeline to remove all existing animations
    // Note: This will also clear camera animation, so it must be re-added after
    if (homeScrollTimeline) {
      homeScrollTimeline.clear();
    }

    // Kill existing animations
    allObjects.forEach(([key, object]) => {
      gsap.killTweensOf(object);
      gsap.killTweensOf(object.position);
      gsap.killTweensOf(object.rotation);
    });

    // Create paths for each object based on their start positions
    const homeScrollPaths = getHomeScrollPaths(startPositions);

    // Collect all animation data in arrays for stagger
    const animPropsArray: any[] = [];
    const animationData: Array<{
      key: string;
      object: THREE.Object3D;
      materials: any[];
      path: THREE.CurvePath<THREE.Vector3>;
      startEuler: THREE.Euler;
      endEuler: THREE.Euler;
    }> = [];

    allObjects.forEach(([key, object]) => {
      // Get current opacity from original materials BEFORE cloning
      let currentMaterialOpacity = 1.0;
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            if (mesh.material.length > 0) {
              currentMaterialOpacity = (mesh.material[0] as any).opacity ?? 1.0;
            }
          } else {
            currentMaterialOpacity = (mesh.material as any).opacity ?? 1.0;
          }
          return; // Only need first material
        }
      });

      // Get materials for opacity and CLONE them to avoid shared material issues
      // Materials are shared between objects (e.g., ghostMaterial), so we need to clone them
      // This ensures each object has its own material instance and opacity can be animated independently
      const materials: any[] = [];

      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            // Clone each material in the array
            const clonedMaterials = mesh.material.map((originalMat: any) => {
              const clonedMat = originalMat.clone();
              // Preserve current opacity on cloned material
              clonedMat.opacity = currentMaterialOpacity;
              clonedMat.transparent = true; // Always allow transparency
              materials.push(clonedMat);
              return clonedMat;
            });
            mesh.material = clonedMaterials;
          } else {
            // Clone single material
            const clonedMat = (mesh.material as any).clone();
            // Preserve current opacity on cloned material
            clonedMat.opacity = currentMaterialOpacity;
            clonedMat.transparent = true; // Always allow transparency
            materials.push(clonedMat);
            mesh.material = clonedMat;
          }
        }
      });

      // Get FROM values: current rotation
      const startRot = getCurrentRotations()[key] || object.quaternion.clone();
      const startEuler = new THREE.Euler().setFromQuaternion(startRot);

      // Get TO values: laydown rotation
      // CRITICAL: Use the SAME end rotation for ALL objects to ensure consistent orientation
      // Use LAY_DOWN_QUAT_1 (which has been adjusted by 180° in util.ts)
      const endRot = LAY_DOWN_QUAT_1;
      const endEuler = new THREE.Euler().setFromQuaternion(endRot);

      // Get path for this object
      const path = homeScrollPaths[key];
      if (!path) {
        console.warn(`No path found for object: ${key}`);
        return;
      }

      // Get current opacity from materials (after cloning)
      const startOpacity = materials.length > 0 ? materials[0].opacity : 1.0;

      // Create animation props object - use progress for path animation
      const animProps = {
        progress: 0, // Progress along path (0 to 1)
        rotX: startEuler.x,
        rotY: startEuler.y,
        rotZ: startEuler.z,
        opacity: startOpacity, // Start from current opacity
      };

      animPropsArray.push(animProps);
      animationData.push({
        key,
        object,
        materials,
        path,
        startEuler,
        endEuler,
      });
    });

    // Create individual animations for each object with manual stagger positioning
    // This ensures each object's opacity animates correctly
    const totalObjects = animationData.length;
    const staggerAmount = 0.15; // Stagger amount as fraction of timeline (15%)

    animationData.forEach((data, index) => {
      const animProps = animPropsArray[index];
      const staggerPosition = index * (staggerAmount / totalObjects);

      // Create individual fromTo animation for each object
      homeScrollTimeline!.fromTo(
        animProps,
        {
          // FROM: progress 0 (start of path), current rotation, current opacity
          progress: 0,
          rotX: data.startEuler.x,
          rotY: data.startEuler.y,
          rotZ: data.startEuler.z,
          opacity: animProps.opacity, // Start from current opacity
        },
        {
          // TO: progress 1 (end of path), laydown rotation, opacity 0
          progress: 1,
          rotX: data.endEuler.x,
          rotY: data.endEuler.y,
          rotZ: data.endEuler.z,
          opacity: 0.0,
          ease: "power1.out",
          onUpdate: function () {
            // Calculate position along path based on progress
            const pathPoint = data.path.getPointAt(animProps.progress);
            data.object.position.copy(pathPoint);

            // Apply rotation (Euler to quaternion)
            data.object.rotation.set(
              animProps.rotX,
              animProps.rotY,
              animProps.rotZ
            );
            data.object.quaternion.setFromEuler(data.object.rotation);
            updateObjectRotation(data.key, data.object.quaternion);

            // Apply opacity to all materials DIRECTLY
            // Get materials fresh from the object each frame to ensure we have the correct references
            // CRITICAL: Always set transparent=true to preserve transmission/glow effects
            // MeshPhysicalMaterial with transmission needs transparent=true even at opacity 1.0
            // to maintain consistent rendering and glow effects
            data.object.traverse((child) => {
              if ((child as any).isMesh && (child as any).material) {
                const mesh = child as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((mat: any) => {
                    mat.opacity = animProps.opacity;
                    mat.transparent = true;
                    // Preserve depthWrite setting (should be false for ghost materials)
                    if (
                      mat.depthWrite !== undefined &&
                      mat.depthWrite === false
                    ) {
                      mat.depthWrite = false;
                    }
                    // Force material update to ensure transmission effect is recalculated
                    if (mat.needsUpdate !== undefined) {
                      mat.needsUpdate = true;
                    }
                  });
                } else {
                  const mat = mesh.material as any;
                  mat.opacity = animProps.opacity;
                  mat.transparent = true;
                  // Preserve depthWrite setting (should be false for ghost materials)
                  if (
                    mat.depthWrite !== undefined &&
                    mat.depthWrite === false
                  ) {
                    mat.depthWrite = false;
                  }
                  // Force material update to ensure transmission effect is recalculated
                  if (mat.needsUpdate !== undefined) {
                    mat.needsUpdate = true;
                  }
                }
              }
            });
          },
        },
        staggerPosition // Start position on timeline (staggered)
      );
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

    // Add camera animation at position 0 (start of timeline) so it runs for the full duration
    // This ensures camera animates alongside the object animations
    // Make sure cameraPath exists before creating animation
    if (!cameraPath || cameraPath.curves.length === 0) {
      console.warn("Camera path not created, skipping camera animation");
      return;
    }

    // Add camera animation - it should run for the full timeline duration
    // Position 0 means it starts at the beginning, parallel to object animations
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
      0 // Start at position 0, parallel to object animations
    );
  };

  // Create animations initially
  // Create object animations FIRST (this clears the timeline)
  createObjectAnimations();
  // Then create camera animation (after timeline is cleared, so it's not removed)
  createCameraAnimation();
}
