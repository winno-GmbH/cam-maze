import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock } from "../core/scene";
import { slerpToLayDown, applyRotations } from "./util";
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
import { setFloorPlane, setObjectScale } from "./scene-utils";

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let isUpdating = false;
let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};

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

function restoreFloor() {
  const floorState = {
    visible: true,
    opacity: OPACITY.FULL,
    transparent: false,
  };
  if (
    !lastFloorState ||
    lastFloorState.visible !== floorState.visible ||
    lastFloorState.opacity !== floorState.opacity ||
    lastFloorState.transparent !== floorState.transparent
  ) {
    setFloorPlane(
      floorState.visible,
      floorState.opacity,
      floorState.transparent
    );
    lastFloorState = floorState;
  }
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
          pauseOtherScrollTriggers();
        },
        onEnterBack: () => {
          isIntroScrollActive = true;
          pauseOtherScrollTriggers();
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

function initializeQuaternions() {
  if (pacmanTargetQuaternion && ghostTargetQuaternion) return;

  const pacmanObj = ghosts.pacman;
  if (pacmanObj) {
    if (!introInitialRotations["pacman"]) {
      introInitialRotations["pacman"] = pacmanObj.quaternion.clone();
    }

    let quat = introInitialRotations["pacman"].clone();
    const tempObj = new THREE.Object3D();
    tempObj.quaternion.copy(quat);
    slerpToLayDown(tempObj, quat, OPACITY.FULL);
    quat = tempObj.quaternion.clone();

    quat = applyRotations(quat, [
      { axis: "x", angle: Math.PI / 2 },
      { axis: "y", angle: Math.PI },
      { axis: "y", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "y", angle: Math.PI },
    ]);

    pacmanTargetQuaternion = quat;
  }

  const ghostObj = ghosts.ghost1;
  if (ghostObj) {
    if (!introInitialRotations["ghost1"]) {
      introInitialRotations["ghost1"] = ghostObj.quaternion.clone();
    }

    let quat = introInitialRotations["ghost1"].clone();
    const tempObj = new THREE.Object3D();
    tempObj.quaternion.copy(quat);
    slerpToLayDown(tempObj, quat, OPACITY.FULL);
    quat = tempObj.quaternion.clone();

    quat = applyRotations(quat, [
      { axis: "x", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "y", angle: Math.PI },
      { axis: "y", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "x", angle: Math.PI },
    ]);

    ghostTargetQuaternion = quat;
  }

  Object.keys(ghosts).forEach((key) => {
    const obj = ghosts[key as keyof typeof ghosts];
    if (obj && !introInitialRotations[key]) {
      introInitialRotations[key] = obj.quaternion.clone();
    }
  });
}

let lastFloorState: {
  visible: boolean;
  opacity: number;
  transparent: boolean;
} | null = null;

const tempVector = new THREE.Vector3();
const meshesToShowCache: THREE.Mesh[] = [];
const meshesToHideCache: THREE.Mesh[] = [];

function updateObjectsWalkBy(progress: number) {
  if (!isIntroScrollActive || isUpdating) return;

  isUpdating = true;

  try {
    initializeQuaternions();

    if (pacmanMixer) {
      pacmanMixer.update(clock.getDelta());
    }

    const floorState = {
      visible: true,
      opacity: OPACITY.HIDDEN,
      transparent: true,
    };
    if (
      !lastFloorState ||
      lastFloorState.visible !== floorState.visible ||
      lastFloorState.opacity !== floorState.opacity ||
      lastFloorState.transparent !== floorState.transparent
    ) {
      setFloorPlane(
        floorState.visible,
        floorState.opacity,
        floorState.transparent
      );
      lastFloorState = floorState;
    }

    const pacmanQuat = pacmanTargetQuaternion;
    const ghostQuat = ghostTargetQuaternion;

    tempVector.set(camera.position.x, camera.position.y, camera.position.z);

    const walkStart = tempVector.x - INTRO_WALK_DISTANCE;
    const walkEnd = tempVector.x + INTRO_WALK_DISTANCE;

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
    const pacmanY = tempVector.y + INTRO_POSITION_OFFSET.y;
    const pacmanZ = tempVector.z + INTRO_POSITION_OFFSET.z;

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

        const zBounce =
          key === "pacman"
            ? 0
            : Math.sin(normalizedProgress * Math.PI * 2 * 20 + zPhase) * 0.01;
        const animatedYOffset = key === "pacman" ? 0 : zBounce * 1.5;
        const finalX = pacmanX + behindOffset + (xOffset || 0);
        const finalY = pacmanY + (staticYOffset || 0) - animatedYOffset;
        const finalZ = pacmanZ + zOffset - zBounce;

        object.position.set(finalX, finalY, finalZ);

        if (key === "pacman" && pacmanQuat) {
          object.quaternion.copy(pacmanQuat);
        } else if (ghostQuat) {
          object.quaternion.copy(ghostQuat);
        }

        setObjectScale(object, key, "intro");

        object.visible = true;

        const targetOpacity = key === "pacman" ? OPACITY.FULL : ghostOpacity;

        meshesToShowCache.length = 0;
        meshesToHideCache.length = 0;

        let hasVisibleMesh = false;

        forEachMaterial(
          object,
          (mat: any, mesh: THREE.Mesh, childName: string) => {
            if (
              isCurrencySymbol(childName) ||
              (key === "pacman" && isPacmanPart(childName))
            ) {
              if (mesh.visible) {
                meshesToHideCache.push(mesh);
              }
              return;
            }

            if (!mesh.visible) {
              meshesToShowCache.push(mesh);
            }
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
          let foundFallback = false;
          object.traverse((child) => {
            if ((child as any).isMesh && !foundFallback) {
              const mesh = child as THREE.Mesh;
              if (!mesh.visible) {
                meshesToShowCache.push(mesh);
              }
              foundFallback = true;
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

        meshesToShowCache.forEach((mesh) => {
          mesh.visible = true;
        });
        meshesToHideCache.forEach((mesh) => {
          mesh.visible = false;
        });
      }
    );
  } finally {
    isUpdating = false;
  }
}
