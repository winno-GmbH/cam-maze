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
} from "./scene-presets";
import {
  setMaterialOpacity,
  setGhostColor,
  forEachMaterial,
} from "../core/material-utils";
import {
  OBJECT_KEYS,
  GHOST_COLORS,
  isCurrencySymbol,
  isPacmanPart,
} from "./util";
import {
  SCROLL_SELECTORS,
  SCALE,
  COLOR,
  OPACITY,
  INTRO_WALK_DISTANCE,
  INTRO_FADE_IN_DURATION,
  INTRO_BEHIND_OFFSET_STEP,
  INTRO_BASE_X_OFFSET,
  INTRO_POSITION_OFFSET,
  SCRUB_DURATION,
  KEYFRAME_SCALE,
  KEYFRAME_DURATION,
  INTRO_GHOST_OFFSETS,
} from "./constants";
import { setFloorPlane, setObjectScale, killObjectAnimations } from "./scene-utils";

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
  killObjectAnimations(obj);
  obj.visible = true;

  // Use centralized utility to iterate over materials
  forEachMaterial(
    obj,
    (mat: any, mesh: THREE.Mesh, childName: string) => {
      // Skip currency symbols and pacman parts
      if (
        isCurrencySymbol(childName) ||
        (key === "pacman" && isPacmanPart(childName))
      ) {
        mesh.visible = false;
        return;
      }

      mesh.visible = true;
      setMaterialOpacity(mat, 1, true);
    },
    {
      skipCurrencySymbols: false, // We handle this in the callback
      skipPacmanParts: false, // We handle this in the callback
      objectKey: key,
    }
  );

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
  setFloorPlane(true, OPACITY.FULL, false);
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
        trigger: SCROLL_SELECTORS.INTRO,
        start: "top top",
        end: "bottom bottom",
        scrub: SCRUB_DURATION,
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
      { scale: KEYFRAME_SCALE.START, opacity: OPACITY.HIDDEN },
      {
        keyframes: [
          {
            scale: KEYFRAME_SCALE.START,
            opacity: OPACITY.HIDDEN,
            duration: 0,
          },
          {
            scale: KEYFRAME_SCALE.MID,
            opacity: OPACITY.FULL,
            duration: KEYFRAME_DURATION.FADE_IN,
          },
          {
            scale: KEYFRAME_SCALE.LARGE,
            opacity: OPACITY.FULL,
            duration: KEYFRAME_DURATION.HOLD,
          },
          {
            scale: KEYFRAME_SCALE.END,
            opacity: OPACITY.HIDDEN,
            duration: KEYFRAME_DURATION.FADE_OUT,
          },
        ],
      }
    )
    .fromTo(
      ".sc_b--intro",
      { scale: KEYFRAME_SCALE.START, opacity: OPACITY.HIDDEN },
      {
        keyframes: [
          {
            scale: KEYFRAME_SCALE.START,
            opacity: OPACITY.HIDDEN,
            duration: 0,
          },
          {
            scale: KEYFRAME_SCALE.MID,
            opacity: OPACITY.FULL,
            duration: KEYFRAME_DURATION.FADE_IN,
          },
          {
            scale: KEYFRAME_SCALE.LARGE,
            opacity: OPACITY.FULL,
            duration: KEYFRAME_DURATION.HOLD,
          },
          {
            scale: KEYFRAME_SCALE.END,
            opacity: OPACITY.HIDDEN,
            duration: KEYFRAME_DURATION.FADE_OUT,
          },
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
    setFloorPlane(true, OPACITY.HIDDEN, true);

    // Calculate base center point for walk path
    const baseCenter = new THREE.Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    // Walk path symmetric around center
    // Start INTRO_WALK_DISTANCE units left of center, end INTRO_WALK_DISTANCE units right of center
    const walkStart = baseCenter.x - INTRO_WALK_DISTANCE; // Start from left
    const walkEnd = baseCenter.x + INTRO_WALK_DISTANCE; // End at right

    // Objects to animate - ghosts walk behind pacman
    const objectsToAnimate = [
      { key: "pacman", behindOffset: 0 },
      { key: "ghost1", behindOffset: INTRO_GHOST_OFFSETS.GHOST1 },
      { key: "ghost2", behindOffset: INTRO_GHOST_OFFSETS.GHOST2 },
      { key: "ghost3", behindOffset: INTRO_GHOST_OFFSETS.GHOST3 },
      { key: "ghost4", behindOffset: INTRO_GHOST_OFFSETS.GHOST4 },
      { key: "ghost5", behindOffset: INTRO_GHOST_OFFSETS.GHOST5 },
    ];

    // Calculate pacman's position using smooth interpolation
    const normalizedProgress = Math.max(0, Math.min(1, progress));
    const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
    const pacmanX = baseX + INTRO_POSITION_OFFSET.x;
    const pacmanY = baseCenter.y + INTRO_POSITION_OFFSET.y;
    const pacmanZ = baseCenter.z + INTRO_POSITION_OFFSET.z;

    // Smooth fade-in for ghosts based on progress
    const ghostOpacity =
      normalizedProgress < INTRO_FADE_IN_DURATION
        ? normalizedProgress / INTRO_FADE_IN_DURATION
        : 1.0;

    objectsToAnimate.forEach(({ key, behindOffset }) => {
      const object = ghosts[key];
      if (!object) return;

      // CRITICAL: Kill all GSAP animations that might interfere
      killObjectAnimations(object);

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
      setObjectScale(object, key, "intro");

      // Update opacity for meshes
      const targetOpacity = key === "pacman" ? OPACITY.FULL : ghostOpacity;

      // Use centralized utility for consistency
      forEachMaterial(
        object,
        (mat: any, mesh: THREE.Mesh, childName: string) => {
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

          // CRITICAL: Force opacity EVERY frame using centralized utility
          // This ensures opacity is always correct and ghost materials keep transparent=true
          setMaterialOpacity(mat, targetOpacity, true);
        },
        {
          skipCurrencySymbols: false, // We handle this in the callback
          skipPacmanParts: false, // We handle this in the callback
          objectKey: key,
        }
      );

      // Set ghost colors using centralized utility (only if needed)
      if (GHOST_COLORS[key] && key !== "pacman") {
        setGhostColor(object, GHOST_COLORS[key]);
      }

      // CRITICAL: Force matrix update after all changes (only once per object)
      object.updateMatrixWorld(true);
    });
  } finally {
    isUpdating = false;
  }
}
