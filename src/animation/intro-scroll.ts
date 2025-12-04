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
let isUpdating = false;

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

function setObjectVisibilityAndOpacity(key: string, obj: THREE.Object3D) {
  killObjectAnimations(obj);
  obj.visible = true;

  forEachMaterial(
    obj,
    (mat: any, mesh: THREE.Mesh, childName: string) => {
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
      skipCurrencySymbols: false,
      skipPacmanParts: false,
      objectKey: key,
    }
  );

  obj.updateMatrixWorld(true);
}

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
  setVisibilityForAll();

  isUpdating = false;

  const scrollTrigger = ScrollTrigger.getById("introScroll");
  const progress =
    scrollTrigger && typeof scrollTrigger.progress === "number"
      ? scrollTrigger.progress
      : 0;
  lastIntroProgress = progress;
  updateObjectsWalkBy(progress);

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

function restoreFloor() {
  setFloorPlane(true, OPACITY.FULL, false);
}

export function initIntroScrollAnimation() {
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
      0
    );
}

function updateObjectsWalkBy(progress: number) {
  if (!isIntroScrollActive || isUpdating) return;

  isUpdating = true;

  try {
    setFloorPlane(true, OPACITY.HIDDEN, true);

    const baseCenter = new THREE.Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    const walkStart = baseCenter.x - INTRO_WALK_DISTANCE;
    const walkEnd = baseCenter.x + INTRO_WALK_DISTANCE;

    const objectsToAnimate = [
      { key: "pacman", behindOffset: 0 },
      { key: "ghost1", behindOffset: INTRO_GHOST_OFFSETS.GHOST1 },
      { key: "ghost2", behindOffset: INTRO_GHOST_OFFSETS.GHOST2 },
      { key: "ghost3", behindOffset: INTRO_GHOST_OFFSETS.GHOST3 },
      { key: "ghost4", behindOffset: INTRO_GHOST_OFFSETS.GHOST4 },
      { key: "ghost5", behindOffset: INTRO_GHOST_OFFSETS.GHOST5 },
    ];

    const normalizedProgress = Math.max(0, Math.min(1, progress));
    const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
    const pacmanX = baseX + INTRO_POSITION_OFFSET.x;
    const pacmanY = baseCenter.y + INTRO_POSITION_OFFSET.y;
    const pacmanZ = baseCenter.z + INTRO_POSITION_OFFSET.z;

    const ghostOpacity =
      normalizedProgress < INTRO_FADE_IN_DURATION
        ? normalizedProgress / INTRO_FADE_IN_DURATION
        : 1.0;

    objectsToAnimate.forEach(({ key, behindOffset }) => {
      const object = ghosts[key];
      if (!object) return;

      killObjectAnimations(object);

      const finalX = pacmanX + behindOffset;
      const finalY = pacmanY;
      const finalZ = pacmanZ;

      object.position.set(finalX, finalY, finalZ);

      const pacmanQuat = getPacmanTargetQuaternion();
      const ghostQuat = getGhostTargetQuaternion();
      if (key === "pacman" && pacmanQuat) {
        object.quaternion.copy(pacmanQuat);
      } else if (ghostQuat) {
        object.quaternion.copy(ghostQuat);
      }

      object.updateMatrixWorld(true);

      object.visible = true;
      setObjectScale(object, key, "intro");

      const targetOpacity = key === "pacman" ? OPACITY.FULL : ghostOpacity;

      forEachMaterial(
        object,
        (mat: any, mesh: THREE.Mesh, childName: string) => {
          if (
            isCurrencySymbol(childName) ||
            (key === "pacman" && isPacmanPart(childName))
          ) {
            mesh.visible = false;
            return;
          }

          mesh.visible = true;

          setMaterialOpacity(mat, targetOpacity, true);
        },
        {
          skipCurrencySymbols: false,
          skipPacmanParts: false,
          objectKey: key,
        }
      );

      if (GHOST_COLORS[key] && key !== "pacman") {
        setGhostColor(object, GHOST_COLORS[key]);
      }

      object.updateMatrixWorld(true);
    });
  } finally {
    isUpdating = false;
  }
}
