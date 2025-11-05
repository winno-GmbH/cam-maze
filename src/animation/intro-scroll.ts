import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";
import {
  applyIntroScrollPreset,
  getScrollDirection,
  getPacmanTargetQuaternion,
  getGhostTargetQuaternion,
  INTRO_POSITION_OFFSET,
} from "./scene-presets";

// Debug helper function to check visibility issues
function debugObjectVisibility(key: string, object: THREE.Object3D) {
  const info: any = {
    key,
    exists: !!object,
    visible: object?.visible,
    scale: object?.scale
      ? `${object.scale.x.toFixed(2)}, ${object.scale.y.toFixed(
          2
        )}, ${object.scale.z.toFixed(2)}`
      : "N/A",
    position: object?.position
      ? `${object.position.x.toFixed(2)}, ${object.position.y.toFixed(
          2
        )}, ${object.position.z.toFixed(2)}`
      : "N/A",
    meshCount: 0,
    visibleMeshCount: 0,
    hiddenMeshCount: 0,
    meshes: [] as string[],
  };

  if (object) {
    object.traverse((child) => {
      if ((child as any).isMesh) {
        info.meshCount++;
        const mesh = child as THREE.Mesh;
        const childName = child.name || "unnamed";

        if (mesh.visible) {
          info.visibleMeshCount++;
        } else {
          info.hiddenMeshCount++;
        }

        const meshInfo = {
          name: childName,
          visible: mesh.visible,
          material: mesh.material
            ? Array.isArray(mesh.material)
              ? `Array[${mesh.material.length}]`
              : mesh.material.type
            : "No material",
          opacity:
            (mesh.material as any)?.opacity !== undefined
              ? (mesh.material as any).opacity
              : "N/A",
        };
        info.meshes.push(meshInfo);
      }
    });
  }

  return info;
}

// Check if object is in camera frustum
function isInCameraFrustum(object: THREE.Object3D): boolean {
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(matrix);
  return frustum.containsPoint(object.position);
}

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let lastIntroProgress = 0;
let isUpdating = false; // Prevent concurrent updates
let lastUpdateTime = 0; // Throttle updates to prevent flickering
let cachedObjectStates: Record<string, { opacity: number; visible: boolean }> =
  {}; // Cache to avoid redundant updates

export function initIntroScrollAnimation() {
  // Kill any existing timeline
  if (introScrollTimeline) {
    introScrollTimeline.kill();
    introScrollTimeline = null;
  }

  introScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--intro",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        refreshPriority: 1,
        onEnter: () => {
          console.log("🎬 Intro section ENTERED!");
          isIntroScrollActive = true;

          // CRITICAL: Kill any home-scroll animations that might interfere
          const homeScrollTrigger = gsap.getById("homeScroll");
          if (homeScrollTrigger) {
            const homeTimeline = (homeScrollTrigger as any).timeline;
            if (homeTimeline && homeTimeline.pause) {
              homeTimeline.pause();
            }
          }

          // CRITICAL: Kill any pov-scroll animations that might interfere
          const povScrollTrigger = ScrollTrigger.getById("povScroll");
          if (povScrollTrigger) {
            const povTimeline = (povScrollTrigger as any).timeline;
            if (povTimeline && povTimeline.pause) {
              povTimeline.pause();
            }
          }

          // Kill any GSAP animations on objects
          ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(
            (key) => {
              const obj = ghosts[key];
              if (obj) {
                gsap.killTweensOf(obj);
                gsap.killTweensOf(obj.scale);
                gsap.killTweensOf(obj.position);
                gsap.killTweensOf(obj.quaternion);

                // CRITICAL: Immediately set visibility and opacity to ensure objects are visible
                // This overrides any opacity/visibility set by home-scroll
                // Must traverse ALL nested meshes to restore visibility
                obj.visible = true;
                obj.traverse((child) => {
                  if ((child as any).isMesh && (child as any).material) {
                    const mesh = child as THREE.Mesh;
                    const childName = child.name || "";

                    // Skip currency symbols and pacman parts - they stay hidden
                    if (
                      ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
                      childName.includes("EUR") ||
                      childName.includes("CHF") ||
                      childName.includes("YEN") ||
                      childName.includes("USD") ||
                      childName.includes("GBP") ||
                      (key === "pacman" &&
                        (childName.includes("Shell") ||
                          childName.includes("Bitcoin_1") ||
                          childName.includes("Bitcoin_2")))
                    ) {
                      return; // Skip these, keep them hidden
                    }

                    // Force visibility and opacity for all other meshes
                    mesh.visible = true;
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat: any) => {
                        mat.opacity = 1;
                        mat.transparent = true;
                      });
                    } else {
                      (mesh.material as any).opacity = 1;
                      (mesh.material as any).transparent = true;
                    }
                  }
                });

                // Force update matrix to ensure changes are applied
                obj.updateMatrixWorld(true);
              }
            }
          );

          const scrollDir = getScrollDirection();
          applyIntroScrollPreset(true, scrollDir);

          // CRITICAL: After preset is applied, FORCE visibility again to ensure objects are visible
          // This is necessary because home-scroll makes objects invisible (opacity 0 or visible false)
          ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(
            (key) => {
              const obj = ghosts[key];
              if (obj) {
                obj.visible = true;
                obj.traverse((child) => {
                  if ((child as any).isMesh && (child as any).material) {
                    const mesh = child as THREE.Mesh;
                    const childName = child.name || "";

                    // Skip currency symbols and pacman parts
                    if (
                      ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
                      childName.includes("EUR") ||
                      childName.includes("CHF") ||
                      childName.includes("YEN") ||
                      childName.includes("USD") ||
                      childName.includes("GBP") ||
                      (key === "pacman" &&
                        (childName.includes("Shell") ||
                          childName.includes("Bitcoin_1") ||
                          childName.includes("Bitcoin_2")))
                    ) {
                      return;
                    }

                    mesh.visible = true;
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat: any) => {
                        mat.opacity = 1;
                        mat.transparent = true;
                      });
                    } else {
                      (mesh.material as any).opacity = 1;
                      (mesh.material as any).transparent = true;
                    }
                  }
                });
                obj.updateMatrixWorld(true);
              }
            }
          );

          // CRITICAL: Reset update flags to ensure first update runs
          isUpdating = false;
          lastUpdateTime = 0;
          cachedObjectStates = {};

          // Immediately update objects to ensure they're visible and at correct position
          // Call synchronously first, then also in requestAnimationFrame for safety
          const scrollTrigger = ScrollTrigger.getById("introScroll");
          if (scrollTrigger && typeof scrollTrigger.progress === "number") {
            lastIntroProgress = scrollTrigger.progress;
            updateObjectsWalkBy(scrollTrigger.progress);
          } else {
            lastIntroProgress = 0;
            updateObjectsWalkBy(0);
          }

          // Also call in requestAnimationFrame to ensure it runs after any pending updates
          requestAnimationFrame(() => {
            const scrollTrigger = ScrollTrigger.getById("introScroll");
            if (scrollTrigger && typeof scrollTrigger.progress === "number") {
              lastIntroProgress = scrollTrigger.progress;
              updateObjectsWalkBy(scrollTrigger.progress);
            } else {
              lastIntroProgress = 0;
              updateObjectsWalkBy(0);
            }
          });
        },
        onEnterBack: () => {
          console.log("🎬 Intro section ENTERED BACK!");
          isIntroScrollActive = true;

          // CRITICAL: Kill any home-scroll animations that might interfere
          const homeScrollTrigger = gsap.getById("homeScroll");
          if (homeScrollTrigger) {
            const homeTimeline = (homeScrollTrigger as any).timeline;
            if (homeTimeline && homeTimeline.pause) {
              homeTimeline.pause();
            }
          }

          // CRITICAL: Kill any pov-scroll animations that might interfere
          const povScrollTrigger = ScrollTrigger.getById("povScroll");
          if (povScrollTrigger) {
            const povTimeline = (povScrollTrigger as any).timeline;
            if (povTimeline && povTimeline.pause) {
              povTimeline.pause();
            }
          }

          // Kill any GSAP animations on objects
          ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(
            (key) => {
              const obj = ghosts[key];
              if (obj) {
                gsap.killTweensOf(obj);
                gsap.killTweensOf(obj.scale);
                gsap.killTweensOf(obj.position);
                gsap.killTweensOf(obj.quaternion);

                // CRITICAL: Immediately set visibility and opacity to ensure objects are visible
                // This overrides any opacity/visibility set by home-scroll
                // Must traverse ALL nested meshes to restore visibility
                obj.visible = true;
                obj.traverse((child) => {
                  if ((child as any).isMesh && (child as any).material) {
                    const mesh = child as THREE.Mesh;
                    const childName = child.name || "";

                    // Skip currency symbols and pacman parts - they stay hidden
                    if (
                      ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
                      childName.includes("EUR") ||
                      childName.includes("CHF") ||
                      childName.includes("YEN") ||
                      childName.includes("USD") ||
                      childName.includes("GBP") ||
                      (key === "pacman" &&
                        (childName.includes("Shell") ||
                          childName.includes("Bitcoin_1") ||
                          childName.includes("Bitcoin_2")))
                    ) {
                      return; // Skip these, keep them hidden
                    }

                    // Force visibility and opacity for all other meshes
                    mesh.visible = true;
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat: any) => {
                        mat.opacity = 1;
                        mat.transparent = true;
                      });
                    } else {
                      (mesh.material as any).opacity = 1;
                      (mesh.material as any).transparent = true;
                    }
                  }
                });

                // Force update matrix to ensure changes are applied
                obj.updateMatrixWorld(true);
              }
            }
          );

          const scrollDir = getScrollDirection();
          applyIntroScrollPreset(true, scrollDir);

          // CRITICAL: After preset is applied, FORCE visibility again to ensure objects are visible
          // This is necessary because home-scroll makes objects invisible (opacity 0 or visible false)
          ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(
            (key) => {
              const obj = ghosts[key];
              if (obj) {
                obj.visible = true;
                obj.traverse((child) => {
                  if ((child as any).isMesh && (child as any).material) {
                    const mesh = child as THREE.Mesh;
                    const childName = child.name || "";

                    // Skip currency symbols and pacman parts
                    if (
                      ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
                      childName.includes("EUR") ||
                      childName.includes("CHF") ||
                      childName.includes("YEN") ||
                      childName.includes("USD") ||
                      childName.includes("GBP") ||
                      (key === "pacman" &&
                        (childName.includes("Shell") ||
                          childName.includes("Bitcoin_1") ||
                          childName.includes("Bitcoin_2")))
                    ) {
                      return;
                    }

                    mesh.visible = true;
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat: any) => {
                        mat.opacity = 1;
                        mat.transparent = true;
                      });
                    } else {
                      (mesh.material as any).opacity = 1;
                      (mesh.material as any).transparent = true;
                    }
                  }
                });
                obj.updateMatrixWorld(true);
              }
            }
          );

          // CRITICAL: Reset update flags to ensure first update runs
          isUpdating = false;
          lastUpdateTime = 0;
          cachedObjectStates = {};

          // Immediately update objects to ensure they're visible and at correct position
          // Call synchronously first, then also in requestAnimationFrame for safety
          const scrollTrigger = ScrollTrigger.getById("introScroll");
          if (scrollTrigger && typeof scrollTrigger.progress === "number") {
            lastIntroProgress = scrollTrigger.progress;
            updateObjectsWalkBy(scrollTrigger.progress);
          } else {
            lastIntroProgress = 0;
            updateObjectsWalkBy(0);
          }

          // Also call in requestAnimationFrame to ensure it runs after any pending updates
          requestAnimationFrame(() => {
            const scrollTrigger = ScrollTrigger.getById("introScroll");
            if (scrollTrigger && typeof scrollTrigger.progress === "number") {
              lastIntroProgress = scrollTrigger.progress;
              updateObjectsWalkBy(scrollTrigger.progress);
            } else {
              lastIntroProgress = 0;
              updateObjectsWalkBy(0);
            }
          });
        },
        onLeave: () => {
          console.log("🎬 Intro section LEFT!");
          isIntroScrollActive = false;

          // CRITICAL: Restore camera rotation when leaving intro-scroll
          // Rotate camera back 180 degrees on Y-axis
          camera.rotation.y = camera.rotation.y - Math.PI;
          camera.updateProjectionMatrix();

          // Restore floor to original appearance when leaving intro section
          scene.traverse((child) => {
            if (child.name === "CAM-Floor") {
              child.visible = true;
              if (child instanceof THREE.Mesh && child.material) {
                const material = child.material as THREE.MeshBasicMaterial;
                material.color.setHex(0xffffff); // White
                material.opacity = 1;
                material.transparent = false;
                console.log("🎬 Restored floor plane:", child.name);
              }
            }
          });
        },
        onLeaveBack: () => {
          console.log("🎬 Intro section LEFT BACK!");
          isIntroScrollActive = false;

          // CRITICAL: Restore camera rotation when leaving intro-scroll
          // Rotate camera back 180 degrees on Y-axis
          camera.rotation.y = camera.rotation.y - Math.PI;
          camera.updateProjectionMatrix();

          // Restore floor to original appearance when leaving intro section
          scene.traverse((child) => {
            if (child.name === "CAM-Floor") {
              child.visible = true;
              if (child instanceof THREE.Mesh && child.material) {
                const material = child.material as THREE.MeshBasicMaterial;
                material.color.setHex(0xffffff); // White
                material.opacity = 1;
                material.transparent = false;
                console.log("🎬 Restored floor plane:", child.name);
              }
            }
          });
        },
        onUpdate: (self) => {
          // CRITICAL: Update on every scroll event - this is the primary update source
          // Update bidirectionally based on scroll progress (works for both scroll up and down)
          if (
            isIntroScrollActive &&
            typeof self.progress === "number" &&
            !isUpdating
          ) {
            lastIntroProgress = self.progress;
            updateObjectsWalkBy(self.progress);
          }
        },
        onRefresh: () => {
          // Only refresh if active - don't update objects here to avoid conflicts
          // The onUpdate callback will handle updates
        },
        id: "introScroll",
      },
    })
    .fromTo(
      ".sc_h--intro",
      { scale: 0.5, opacity: 0 },
      {
        keyframes: [
          { scale: 0.5, opacity: 0, duration: 0 },
          { scale: 0.8, opacity: 1, duration: 0.3 },
          { scale: 1.2, opacity: 1, duration: 0.4 },
          { scale: 1.5, opacity: 0, duration: 0.3 },
        ],
      }
    )
    .fromTo(
      ".sc_b--intro",
      { scale: 0.5, opacity: 0 },
      {
        keyframes: [
          { scale: 0.5, opacity: 0, duration: 0 },
          { scale: 0.8, opacity: 1, duration: 0.3 },
          { scale: 1.2, opacity: 1, duration: 0.4 },
          { scale: 1.5, opacity: 0, duration: 0.3 },
        ],
      }
    )
    .to(
      { progress: 0 },
      {
        progress: 1,
        duration: 1,
        immediateRender: false,
        // Remove onUpdate here - ScrollTrigger's onUpdate handles all updates
        // This prevents double updates that cause flickering
        onStart: function () {
          console.log("🎬 Animation timeline STARTED!");
        },
        onComplete: function () {
          // CRITICAL: Ensure objects are visible even when animation completes
          if (isIntroScrollActive) {
            updateObjectsWalkBy(lastIntroProgress);
          }
        },
        onReverseComplete: function () {
          // CRITICAL: Ensure objects are visible even when animation reverses
          if (isIntroScrollActive) {
            updateObjectsWalkBy(lastIntroProgress);
          }
        },
      },
      0 // Start at the same time as the other animations
    );
}

function updateObjectsWalkBy(progress: number) {
  // CRITICAL: Only update if intro-scroll is active
  if (!isIntroScrollActive || isUpdating) return;

  isUpdating = true;

  try {
    // Ensure floor plane stays invisible (white with opacity 0) during animation
    scene.traverse((child) => {
      if (child.name === "CAM-Floor") {
        child.visible = true;
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshBasicMaterial;
          material.color.setHex(0xffffff); // White
          material.opacity = 0;
          material.transparent = true;
        }
      }
    });

    // Calculate base center point for walk path
    const baseCenter = new THREE.Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    // Walk path symmetric around center - REVERSED due to camera rotation
    // Start 10 units right of center, end 10 units left of center (reversed from normal)
    const walkDistance = 10.0;
    const walkStart = baseCenter.x + walkDistance; // Start from right (reversed)
    const walkEnd = baseCenter.x - walkDistance; // End at left (reversed)

    // Objects to animate - ghosts walk 0.5 units behind pacman
    const objectsToAnimate = [
      { key: "pacman", behindOffset: 0 },
      { key: "ghost1", behindOffset: -0.5 },
      { key: "ghost2", behindOffset: -1.0 },
      { key: "ghost3", behindOffset: -1.5 },
      { key: "ghost4", behindOffset: -2.0 },
      { key: "ghost5", behindOffset: -2.5 },
    ];

    // Calculate pacman's position using smooth interpolation
    const normalizedProgress = Math.max(0, Math.min(1, progress));
    const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
    const pacmanX = baseX + INTRO_POSITION_OFFSET.x;
    const pacmanY = baseCenter.y + INTRO_POSITION_OFFSET.y;
    const pacmanZ = baseCenter.z + INTRO_POSITION_OFFSET.z;

    // Smooth fade-in for ghosts based on progress
    const fadeInDuration = 0.2; // Fade in over 20% of progress
    const ghostOpacity =
      normalizedProgress < fadeInDuration
        ? normalizedProgress / fadeInDuration
        : 1.0;

    objectsToAnimate.forEach(({ key, behindOffset }) => {
      const object = ghosts[key];
      if (!object) return;

      // CRITICAL: Kill any GSAP animations that might interfere
      gsap.killTweensOf(object);
      gsap.killTweensOf(object.scale);
      gsap.killTweensOf(object.position);
      gsap.killTweensOf(object.quaternion);

      // CRITICAL: Kill any opacity/material animations that might be interfering
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

      // Calculate position
      const finalX = pacmanX + behindOffset;
      const finalY = pacmanY;
      const finalZ = pacmanZ;

      // Update position directly (no GSAP interpolation for smoother updates)
      object.position.set(finalX, finalY, finalZ);

      // Set rotation quaternion directly (no recalculation - use pre-calculated quaternions)
      const pacmanQuat = getPacmanTargetQuaternion();
      const ghostQuat = getGhostTargetQuaternion();
      if (key === "pacman" && pacmanQuat) {
        object.quaternion.copy(pacmanQuat);
      } else if (ghostQuat) {
        object.quaternion.copy(ghostQuat);
      }

      // Force update matrix to ensure rotation is applied
      object.updateMatrixWorld(true);

      // CRITICAL: Force visibility, scale EVERY frame to override home-scroll
      object.visible = true;
      if (key === "pacman") {
        object.scale.set(0.1, 0.1, 0.1);
      } else {
        object.scale.set(1.0, 1.0, 1.0);
      }

      // Update opacity for meshes
      const targetOpacity = key === "pacman" ? 1.0 : ghostOpacity;

      // Ensure child meshes are visible and maintain ghost colors
      const ghostColors: Record<string, number> = {
        ghost1: 0xff0000, // Red
        ghost2: 0x00ff00, // Green
        ghost3: 0x0000ff, // Blue
        ghost4: 0xffff00, // Yellow
        ghost5: 0xff00ff, // Magenta
      };

      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          const childName = child.name || "";

          // Keep currency symbols hidden - check both exact match and includes
          if (
            ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
            childName.includes("EUR") ||
            childName.includes("CHF") ||
            childName.includes("YEN") ||
            childName.includes("USD") ||
            childName.includes("GBP")
          ) {
            mesh.visible = false;
            return;
          }

          // For pacman: hide Shell and Bitcoin parts
          if (
            key === "pacman" &&
            (childName.includes("Shell") ||
              childName.includes("Bitcoin_1") ||
              childName.includes("Bitcoin_2"))
          ) {
            mesh.visible = false;
            return;
          }

          // Cache key for this mesh to avoid redundant updates
          const cacheKey = `${key}_${childName}`;
          const cachedState = cachedObjectStates[cacheKey];

          // CRITICAL: Force visibility EVERY frame (don't check, just set it)
          mesh.visible = true;

          // CRITICAL: Force opacity EVERY frame (always set it, don't check cache or conditions)
          // This ensures opacity is always correct even if something overrides it
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = targetOpacity;
              mat.transparent = true;
              // Force material update
              if (mat.needsUpdate !== undefined) {
                mat.needsUpdate = true;
              }
            });
          } else {
            const mat = mesh.material as any;
            mat.opacity = targetOpacity;
            mat.transparent = true;
            // Force material update
            if (mat.needsUpdate !== undefined) {
              mat.needsUpdate = true;
            }
          }

          // Set ghost colors (only if needed)
          if (ghostColors[key] && key !== "pacman") {
            const newColor = ghostColors[key];
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat: any) => {
                if (mat.color.getHex() !== newColor) {
                  mat.color.setHex(newColor);
                }
              });
            } else {
              const mat = mesh.material as any;
              if (mat.color.getHex() !== newColor) {
                mat.color.setHex(newColor);
              }
            }
          }
        }
      });

      // CRITICAL: Force matrix update after all changes (only once per object)
      object.updateMatrixWorld(true);
    });

    // Clear cache periodically to prevent memory buildup (every 100 frames)
    if (Math.floor(normalizedProgress * 100) % 10 === 0) {
      // Keep cache size reasonable
      if (Object.keys(cachedObjectStates).length > 100) {
        cachedObjectStates = {};
      }
    }
  } finally {
    isUpdating = false;
  }
}
