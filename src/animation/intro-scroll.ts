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
import {
  OBJECT_KEYS,
  GHOST_COLORS,
  isCurrencySymbol,
  isPacmanPart,
} from "./util";

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let lastIntroProgress = 0;
let isUpdating = false; // Prevent concurrent updates

// Helper function to pause other scroll triggers
function pauseOtherScrollTriggers() {
  const homeScrollTrigger = gsap.getById("homeScroll");
  if (homeScrollTrigger) {
    const homeTimeline = (homeScrollTrigger as any).timeline;
    if (homeTimeline?.pause) {
      homeTimeline.pause();
    }
  }

  const povScrollTrigger = ScrollTrigger.getById("povScroll");
  if (povScrollTrigger) {
    const povTimeline = (povScrollTrigger as any).timeline;
    if (povTimeline?.pause) {
      povTimeline.pause();
    }
  }
}

// Helper function to set object visibility and opacity
function setObjectVisibilityAndOpacity(key: string, obj: THREE.Object3D) {
  gsap.killTweensOf(obj);
  gsap.killTweensOf(obj.scale);
  gsap.killTweensOf(obj.position);
  gsap.killTweensOf(obj.quaternion);

  obj.visible = true;
  obj.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      const childName = child.name || "";

      // Skip currency symbols and pacman parts
      if (
        isCurrencySymbol(childName) ||
        (key === "pacman" && isPacmanPart(childName))
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

// Helper function to initialize intro scroll state
function initializeIntroScrollState() {
  pauseOtherScrollTriggers();

  const setVisibilityForAll = () => {
    OBJECT_KEYS.forEach((key) => {
      const obj = ghosts[key];
      if (obj) setObjectVisibilityAndOpacity(key, obj);
    });
  };

  setVisibilityForAll();
  applyIntroScrollPreset(true, getScrollDirection());
  setVisibilityForAll(); // Force visibility again after preset

  isUpdating = false;

  // Update objects immediately
  const scrollTrigger = ScrollTrigger.getById("introScroll");
  const progress =
    scrollTrigger && typeof scrollTrigger.progress === "number"
      ? scrollTrigger.progress
      : 0;
  lastIntroProgress = progress;
  updateObjectsWalkBy(progress);

  // Also update in next frame
  requestAnimationFrame(() => {
    const scrollTrigger = ScrollTrigger.getById("introScroll");
    const progress =
      scrollTrigger && typeof scrollTrigger.progress === "number"
        ? scrollTrigger.progress
        : 0;
    lastIntroProgress = progress;
    updateObjectsWalkBy(progress);
  });
}

// Helper function to restore floor
function restoreFloor() {
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.transparent = false;
      }
    }
  });
}

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
          isIntroScrollActive = true;
          initializeIntroScrollState();
        },
        onEnterBack: () => {
          isIntroScrollActive = true;
          initializeIntroScrollState();
        },
        onLeave: () => {
          isIntroScrollActive = false;
          restoreFloor();
        },
        onLeaveBack: () => {
          isIntroScrollActive = false;
          restoreFloor();
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
        onComplete: () => {
          if (isIntroScrollActive) {
            updateObjectsWalkBy(lastIntroProgress);
          }
        },
        onReverseComplete: () => {
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

    // Walk path symmetric around center
    // Start 10 units left of center, end 10 units right of center
    const walkDistance = 10.0;
    const walkStart = baseCenter.x - walkDistance; // Start from left
    const walkEnd = baseCenter.x + walkDistance; // End at right

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

      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          const childName = child.name || "";

          // Keep currency symbols and pacman parts hidden
          if (
            isCurrencySymbol(childName) ||
            (key === "pacman" && isPacmanPart(childName))
          ) {
            mesh.visible = false;
            return;
          }

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
          if (GHOST_COLORS[key] && key !== "pacman") {
            const newColor = GHOST_COLORS[key];
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
  } finally {
    isUpdating = false;
  }
}
