import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer } from "../core/objects";
import { clock } from "../core/scene";
import { slerpToLayDown, applyRotations } from "./util";
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
import { vector3Pool, quaternionPool, object3DPool } from "../core/object-pool";

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let lastUpdateProgress: number | null = null;
let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};
let cachedCameraPosition: THREE.Vector3 | null = null;
let lastCameraUpdateFrame = -1;
const objectMaterialCache: Record<
  string,
  Array<{ mesh: THREE.Mesh; material: THREE.Material; childName: string }>
> = {};
const objectScaleCache: Record<string, { key: string; sceneType: string }> = {};
const ghostKeys = Object.keys(ghosts);
const tempVector = vector3Pool.acquire();
const tempQuat = quaternionPool.acquire();
const tempObj = object3DPool.acquire();
let lastIntroUpdateTime = 0;
const INTRO_UPDATE_THROTTLE = 16;

function resetIntroScrollCache() {
  cachedCameraPosition = null;
  lastCameraUpdateFrame = -1;
  lastUpdateProgress = null;
}

function initializeObjectMaterialCache() {
  ghostKeys.forEach((key) => {
    const object = ghosts[key as keyof typeof ghosts];
    if (!object || objectMaterialCache[key]) return;
    objectMaterialCache[key] = [];
    object.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        const childName = child.name || "";
        const mat = mesh.material;
        if (mat) {
          const materials = Array.isArray(mat) ? mat : [mat];
          materials.forEach((material) => {
            objectMaterialCache[key].push({ mesh, material, childName });
          });
        }
      }
    });
  });
}

function setIntroScrollLocked(locked: boolean) {
  ghostKeys.forEach((key) => {
    const obj = ghosts[key as keyof typeof ghosts];
    if (obj) {
      obj.userData.introScrollLocked = locked;
    }
  });
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
        markers: {
          startColor: "green",
          endColor: "red",
          fontSize: "12px",
          fontWeight: "bold",
          indent: 60,
        },
        onEnter: () => {
          isIntroScrollActive = true;
          resetIntroScrollCache();
          initializeObjectMaterialCache();
          setIntroScrollLocked(true);
        },
        onEnterBack: () => {
          isIntroScrollActive = true;
          resetIntroScrollCache();
          initializeObjectMaterialCache();
          setIntroScrollLocked(true);
        },
        onLeave: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);
        },
        onLeaveBack: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);
        },
        onUpdate: (self) => {
          const now = performance.now();
          if (now - lastIntroUpdateTime < INTRO_UPDATE_THROTTLE) return;
          lastIntroUpdateTime = now;
          if (typeof self.progress === "number") {
            updateObjectsWalkBy(self.progress);
          }
        },
        id: "introScroll",
      },
    })
    .addLabel("intro-text-start", 0)
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
    .addLabel("intro-text-fade-in", KEYFRAME_DURATION.NONE)
    .addLabel(
      "intro-text-hold",
      KEYFRAME_DURATION.NONE + KEYFRAME_DURATION.FADE_IN
    )
    .addLabel(
      "intro-text-fade-out",
      KEYFRAME_DURATION.NONE +
        KEYFRAME_DURATION.FADE_IN +
        KEYFRAME_DURATION.HOLD
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
    )
    .addLabel(
      "intro-text-end",
      KEYFRAME_DURATION.NONE +
        KEYFRAME_DURATION.FADE_IN +
        KEYFRAME_DURATION.HOLD +
        KEYFRAME_DURATION.FADE_OUT
    );
}

function initializeQuaternions() {
  if (pacmanTargetQuaternion && ghostTargetQuaternion) return;

  const pacmanObj = ghosts.pacman;
  if (pacmanObj) {
    if (!introInitialRotations["pacman"]) {
      tempQuat.copy(pacmanObj.quaternion);
      introInitialRotations["pacman"] = tempQuat.clone();
    }

    tempQuat.copy(introInitialRotations["pacman"]);
    tempObj.quaternion.copy(tempQuat);
    slerpToLayDown(tempObj, tempQuat, OPACITY.FULL);
    tempQuat.copy(tempObj.quaternion);

    const resultQuat = applyRotations(tempQuat, [
      { axis: "x", angle: Math.PI / 2 },
      { axis: "y", angle: Math.PI },
      { axis: "y", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "y", angle: Math.PI },
    ]);

    pacmanTargetQuaternion = resultQuat.clone();
  }

  const ghostObj = ghosts.ghost1;
  if (ghostObj) {
    if (!introInitialRotations["ghost1"]) {
      tempQuat.copy(ghostObj.quaternion);
      introInitialRotations["ghost1"] = tempQuat.clone();
    }

    tempQuat.copy(introInitialRotations["ghost1"]);
    tempObj.quaternion.copy(tempQuat);
    slerpToLayDown(tempObj, tempQuat, OPACITY.FULL);
    tempQuat.copy(tempObj.quaternion);

    const resultQuat = applyRotations(tempQuat, [
      { axis: "x", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "y", angle: Math.PI },
      { axis: "y", angle: Math.PI },
      { axis: "x", angle: Math.PI },
      { axis: "x", angle: Math.PI },
    ]);

    ghostTargetQuaternion = resultQuat.clone();
  }

  ghostKeys.forEach((key) => {
    const obj = ghosts[key as keyof typeof ghosts];
    if (obj && !introInitialRotations[key]) {
      tempQuat.copy(obj.quaternion);
      introInitialRotations[key] = tempQuat.clone();
    }
  });
}

let lastFloorState: {
  visible: boolean;
  opacity: number;
  transparent: boolean;
} | null = null;

function updateObjectsWalkBy(progress: number) {
  if (!isIntroScrollActive) return;

  if (lastUpdateProgress === progress) return;
  lastUpdateProgress = progress;

  const currentFrame = performance.now();
  const shouldUpdateCache =
    !cachedCameraPosition || currentFrame - lastCameraUpdateFrame > 16;

  if (shouldUpdateCache) {
    const camX = camera.position.x;
    const camY = camera.position.y;
    const camZ = camera.position.z;

    if (!isFinite(camX) || !isFinite(camY) || !isFinite(camZ)) {
      if (!cachedCameraPosition) {
        return;
      }
      tempVector.copy(cachedCameraPosition);
    } else {
      if (!cachedCameraPosition) {
        cachedCameraPosition = new THREE.Vector3();
      }
      cachedCameraPosition.set(camX, camY, camZ);
      lastCameraUpdateFrame = currentFrame;
      tempVector.copy(cachedCameraPosition);
    }
  } else {
    tempVector.copy(cachedCameraPosition!);
  }

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

  if (
    !isFinite(baseX) ||
    !isFinite(pacmanX) ||
    !isFinite(pacmanY) ||
    !isFinite(pacmanZ)
  ) {
    return;
  }

  const baseGhostOpacity =
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
      const finalX = pacmanX + behindOffset + xOffset;
      const finalY = pacmanY + staticYOffset - animatedYOffset;
      const finalZ = pacmanZ + zOffset - zBounce;

      if (
        !isFinite(finalX) ||
        !isFinite(finalY) ||
        !isFinite(finalZ) ||
        Math.abs(finalZ) < 0.01 ||
        Math.abs(finalZ) > 100
      ) {
        return;
      }

      object.position.set(finalX, finalY, finalZ);

      const targetQuat = key === "pacman" ? pacmanQuat : ghostQuat;
      if (targetQuat) {
        object.quaternion.copy(targetQuat);
      }

      const scaleKey = `${key}-intro`;
      if (!objectScaleCache[scaleKey]) {
        setObjectScale(object, key, "intro");
        objectScaleCache[scaleKey] = { key, sceneType: "intro" };
      }

      object.visible = true;

      const targetOpacity = key === "pacman" ? OPACITY.FULL : baseGhostOpacity;

      if (!objectMaterialCache[key]) {
        initializeObjectMaterialCache();
      }

      const materialCache = objectMaterialCache[key];
      if (materialCache) {
        materialCache.forEach(({ mesh, material, childName }) => {
          if (
            isCurrencySymbol(childName) ||
            (key === "pacman" && isPacmanPart(childName))
          ) {
            mesh.visible = false;
            return;
          }

          mesh.visible = true;

          const mat = material as any;
          if (Math.abs(mat.opacity - targetOpacity) > 0.001) {
            mat.opacity = targetOpacity;
            if (mat.transmission !== undefined && mat.transmission > 0) {
              mat.transparent = true;
            } else {
              mat.transparent = targetOpacity < 1.0;
            }
          }
        });
      }
    }
  );
}
