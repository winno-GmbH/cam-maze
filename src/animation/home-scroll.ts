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
let startOpacities: Record<string, number> = {};

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

          // CRITICAL: Store ACTUAL current positions and opacities (not t-values)
          // These are the positions/opacities where objects are RIGHT NOW when entering home-scroll
          const freshPositions: Record<string, THREE.Vector3> = {};
          const freshOpacities: Record<string, number> = {};

          Object.entries(ghosts).forEach(([key, object]) => {
            // Use actual object position (from home-loop or wherever it is)
            freshPositions[key] = object.position.clone();

            // Store current opacity BEFORE applyHomeScrollPreset changes it
            let currentOpacity = 1.0;
            object.traverse((child) => {
              if ((child as any).isMesh && (child as any).material) {
                const mesh = child as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                  if (mesh.material.length > 0) {
                    currentOpacity = (mesh.material[0] as any).opacity ?? 1.0;
                  }
                } else {
                  currentOpacity = (mesh.material as any).opacity ?? 1.0;
                }
                return; // Only need first material
              }
            });
            freshOpacities[key] = currentOpacity;
          });

          // Also include pacman
          if (pacman) {
            freshPositions["pacman"] = pacman.position.clone();
            let currentOpacity = 1.0;
            pacman.traverse((child) => {
              if ((child as any).isMesh && (child as any).material) {
                const mesh = child as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                  if (mesh.material.length > 0) {
                    currentOpacity = (mesh.material[0] as any).opacity ?? 1.0;
                  }
                } else {
                  currentOpacity = (mesh.material as any).opacity ?? 1.0;
                }
                return;
              }
            });
            freshOpacities["pacman"] = currentOpacity;
          }

          // Store for use in animations
          startPositions = freshPositions;
          startOpacities = freshOpacities;

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
          createObjectAnimations();
          createCameraAnimation();
        });
      },
      onEnterBack: () => {
        requestAnimationFrame(() => {
          const freshRotations = getCurrentRotations();
          const scrollDir = getScrollDirection();

          // CRITICAL: Store ACTUAL current positions and opacities (not t-values)
          // These are the positions/opacities where objects are RIGHT NOW when entering back
          const freshPositions: Record<string, THREE.Vector3> = {};
          const freshOpacities: Record<string, number> = {};

          Object.entries(ghosts).forEach(([key, object]) => {
            // Use actual object position
            freshPositions[key] = object.position.clone();

            // Store current opacity BEFORE applyHomeScrollPreset changes it
            let currentOpacity = 1.0;
            object.traverse((child) => {
              if ((child as any).isMesh && (child as any).material) {
                const mesh = child as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                  if (mesh.material.length > 0) {
                    currentOpacity = (mesh.material[0] as any).opacity ?? 1.0;
                  }
                } else {
                  currentOpacity = (mesh.material as any).opacity ?? 1.0;
                }
                return; // Only need first material
              }
            });
            freshOpacities[key] = currentOpacity;
          });

          // Note: pacman is already in ghosts, so it's included above

          // Store for use in animations
          startPositions = freshPositions;
          startOpacities = freshOpacities;

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
          createObjectAnimations();
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

  // Initialize startPositions and startOpacities with current values
  // Note: ghosts already contains pacman, so we don't need to add it separately
  const allObjects = Object.entries(ghosts);
  allObjects.forEach(([key, object]) => {
    startPositions[key] = object.position.clone();

    // Get current opacity
    let currentOpacity = 1.0;
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          if (mesh.material.length > 0) {
            currentOpacity = (mesh.material[0] as any).opacity ?? 1.0;
          }
        } else {
          currentOpacity = (mesh.material as any).opacity ?? 1.0;
        }
        return; // Only need first material
      }
    });
    startOpacities[key] = currentOpacity;
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

    // Collect all animation data in arrays for stagger
    const animPropsArray: any[] = [];
    const animationData: Array<{
      key: string;
      object: THREE.Object3D;
      materials: any[];
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      startEuler: THREE.Euler;
      endEuler: THREE.Euler;
      currentPos: THREE.Vector3;
    }> = [];

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

      // Get FROM values: current position, current rotation
      const startPos = startPositions[key] || object.position.clone();
      const startRot = getCurrentRotations()[key] || object.quaternion.clone();
      const startEuler = new THREE.Euler().setFromQuaternion(startRot);

      // Set opacity to 1.0 for all objects at start (stagger will handle timing)
      materials.forEach((mat) => {
        mat.opacity = 1.0;
        mat.transparent = true;
      });

      // Get TO values: center of maze, laydown rotation
      const endPos = objectHomeScrollEndPathPoint;
      const d1 = startRot.angleTo(LAY_DOWN_QUAT_1);
      const d2 = startRot.angleTo(LAY_DOWN_QUAT_2);
      const endRot = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;
      const endEuler = new THREE.Euler().setFromQuaternion(endRot);

      // Use actual current position from object
      const currentPos = object.position.clone();

      // Create animation props object
      const animProps = {
        posX: currentPos.x,
        posY: currentPos.y,
        posZ: currentPos.z,
        rotX: startEuler.x,
        rotY: startEuler.y,
        rotZ: startEuler.z,
        opacity: 1.0, // Always start from 1.0
      };

      animPropsArray.push(animProps);
      animationData.push({
        key,
        object,
        materials,
        startPos,
        endPos,
        startEuler,
        endEuler,
        currentPos,
      });
    });

    // Use stagger to animate all objects with different start times
    homeScrollTimeline!.fromTo(
      animPropsArray,
      {
        // FROM: current position, current rotation, opacity 1.0
        posX: (index: number) => animationData[index].currentPos.x,
        posY: (index: number) => animationData[index].currentPos.y,
        posZ: (index: number) => animationData[index].currentPos.z,
        rotX: (index: number) => animationData[index].startEuler.x,
        rotY: (index: number) => animationData[index].startEuler.y,
        rotZ: (index: number) => animationData[index].startEuler.z,
        opacity: 1.0, // All start from 1.0
      },
      {
        // TO: center position, laydown rotation, opacity 0
        posX: (index: number) => animationData[index].endPos.x,
        posY: (index: number) => animationData[index].endPos.y,
        posZ: (index: number) => animationData[index].endPos.z,
        rotX: (index: number) => animationData[index].endEuler.x,
        rotY: (index: number) => animationData[index].endEuler.y,
        rotZ: (index: number) => animationData[index].endEuler.z,
        opacity: 0.0,
        ease: "power1.out",
        stagger: {
          amount: 1, // Stagger across the full timeline duration
        },
        onUpdate: function (this: gsap.core.Tween) {
          // Apply updates to each object
          const targets = this.targets() as any[];
          targets.forEach((animProps, index) => {
            const data = animationData[index];

            // Apply position
            data.object.position.set(
              animProps.posX,
              animProps.posY,
              animProps.posZ
            );

            // Apply rotation (Euler to quaternion)
            data.object.rotation.set(
              animProps.rotX,
              animProps.rotY,
              animProps.rotZ
            );
            data.object.quaternion.setFromEuler(data.object.rotation);
            updateObjectRotation(data.key, data.object.quaternion);

            // Apply opacity to all materials
            data.materials.forEach((mat) => {
              mat.opacity = animProps.opacity;
              mat.transparent = animProps.opacity < 1.0;
            });
            updateObjectOpacity(data.key, animProps.opacity);
          });
        },
      }
    );
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
    // Position 0 means it starts at the beginning and runs alongside object animations
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
      "<" // Start at the same time as the first animation (object animations)
    );
  };

  // Create animations initially
  createObjectAnimations();
  createCameraAnimation();
}
