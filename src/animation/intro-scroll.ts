import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock } from "../core/scene";
import {
  applyIntroScrollPreset,
  getScrollDirection,
  getPacmanTargetQuaternion,
  getGhostTargetQuaternion,
} from "./scene-presets";
import { setMaterialOpacity, forEachMaterial } from "../core/material-utils";
import { isCurrencySymbol, isPacmanPart } from "./util";
import {
  SCROLL_SELECTORS,
  OPACITY,
  INTRO_WALK_DISTANCE,
  INTRO_FADE_IN_DURATION,
  INTRO_POSITION_OFFSET,
  SCRUB_DURATION,
  KEYFRAME_SCALE,
  KEYFRAME_DURATION,
  INTRO_GHOST_OFFSETS,
  clamp,
} from "./constants";
import {
  setFloorPlane,
  setObjectScale,
  killObjectAnimations,
} from "./scene-utils";

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
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

function initializeIntroScrollState() {
  pauseOtherScrollTriggers();
  applyIntroScrollPreset(true, getScrollDirection());
  isUpdating = false;

  const scrollTrigger = ScrollTrigger.getById("introScroll");
  const progress =
    scrollTrigger && typeof scrollTrigger.progress === "number"
      ? scrollTrigger.progress
      : 0;
  updateObjectsWalkBy(progress);
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
            duration: KEYFRAME_DURATION.NONE,
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
            duration: KEYFRAME_DURATION.NONE,
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
    );
}

function updateObjectsWalkBy(progress: number) {
  if (!isIntroScrollActive || isUpdating) return;

  isUpdating = true;

  try {
    if (pacmanMixer) {
      pacmanMixer.update(clock.getDelta());
    }

    setFloorPlane(true, OPACITY.HIDDEN, true);

    const baseCenter = new THREE.Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    const walkStart = baseCenter.x - INTRO_WALK_DISTANCE;
    const walkEnd = baseCenter.x + INTRO_WALK_DISTANCE;

    const objectsToAnimate = [
      {
        key: "pacman",
        behindOffset: 1.5,
        zOffset: 0.5,
        xOffset: 0,
        yOffset: 0,
        zPhase: 0,
      },
      {
        key: "ghost1",
        behindOffset: INTRO_GHOST_OFFSETS.GHOST1,
        zOffset: 0.5,
        xOffset: 0.5,
        yOffset: -0.5,
        zPhase: Math.PI * 1.0,
      },
      {
        key: "ghost2",
        behindOffset: INTRO_GHOST_OFFSETS.GHOST2,
        zOffset: 0.5,
        xOffset: 0,
        yOffset: -1,
        zPhase: Math.PI * 1.5,
      },
      {
        key: "ghost3",
        behindOffset: INTRO_GHOST_OFFSETS.GHOST3,
        zOffset: 0.5,
        xOffset: 0.5,
        yOffset: 0.5,
        zPhase: Math.PI * 1.0,
      },
      {
        key: "ghost4",
        behindOffset: INTRO_GHOST_OFFSETS.GHOST4,
        zOffset: 0.5,
        xOffset: 0.75,
        yOffset: 0.25,
        zPhase: Math.PI * 1.0,
      },
      {
        key: "ghost5",
        behindOffset: INTRO_GHOST_OFFSETS.GHOST5,
        zOffset: 0.5,
        xOffset: 0,
        yOffset: -0.5,
        zPhase: Math.PI * 1.0,
      },
    ];

    const normalizedProgress = clamp(progress);
    const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
    const pacmanX = baseX + INTRO_POSITION_OFFSET.x;
    const pacmanY = baseCenter.y + INTRO_POSITION_OFFSET.y;
    const pacmanZ = baseCenter.z + INTRO_POSITION_OFFSET.z;

    const ghostOpacity =
      normalizedProgress < INTRO_FADE_IN_DURATION
        ? normalizedProgress / INTRO_FADE_IN_DURATION
        : 1.0;

    objectsToAnimate.forEach(
      ({
        key,
        behindOffset,
        zOffset,
        xOffset,
        yOffset: staticYOffset,
        zPhase,
      }) => {
        const object = ghosts[key];
        if (!object) return;

        killObjectAnimations(object);

        const zBounce =
          key === "pacman"
            ? 0
            : Math.sin(normalizedProgress * Math.PI * 2 * 20 + zPhase) * 0.01;
        const animatedYOffset = key === "pacman" ? 0 : zBounce * 1.5;
        const finalX = pacmanX + behindOffset + (xOffset || 0);
        const finalY = pacmanY + (staticYOffset || 0) - animatedYOffset;
        const finalZ = pacmanZ + zOffset - zBounce;

        object.position.set(finalX, finalY, finalZ);

        const pacmanQuat = getPacmanTargetQuaternion();
        const ghostQuat = getGhostTargetQuaternion();
        if (key === "pacman" && pacmanQuat) {
          object.quaternion.copy(pacmanQuat);
        } else if (ghostQuat) {
          object.quaternion.copy(ghostQuat);
        }

        object.visible = true;
        setObjectScale(object, key, "intro");

        let targetOpacity = key === "pacman" ? OPACITY.FULL : ghostOpacity;

        if (key === "ghost5") {
          targetOpacity = Math.max(targetOpacity, 0.3);
        }

        let hasVisibleMesh = false;

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
            hasVisibleMesh = true;
            setMaterialOpacity(mat, targetOpacity, true);
          },
          {
            skipCurrencySymbols: false,
            skipPacmanParts: false,
            objectKey: key,
          }
        );

        if (key === "ghost5" && !hasVisibleMesh) {
          object.traverse((child) => {
            if ((child as any).isMesh && !hasVisibleMesh) {
              const mesh = child as THREE.Mesh;
              mesh.visible = true;
              hasVisibleMesh = true;
              const mat = mesh.material;
              if (mat) {
                setMaterialOpacity(
                  Array.isArray(mat) ? mat[0] : mat,
                  targetOpacity,
                  true
                );
              }
            }
          });
        }

        object.updateMatrixWorld(true);
      }
    );
  } finally {
    isUpdating = false;
  }
}
