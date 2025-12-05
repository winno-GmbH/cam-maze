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
  SCALE,
  clamp,
} from "./constants";
import { setFloorPlane } from "./scene-utils";

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let lastUpdateProgress: number | null = null;
let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};
let cachedCameraPosition: THREE.Vector3 | null = null;
let lastCameraUpdateFrame = -1;

const objectMeshes: Record<
  string,
  Array<{
    mesh: THREE.Mesh;
    material: THREE.Material | THREE.Material[];
    name: string;
  }>
> = {};
const objectScales: Record<string, number> = {};
const objectOpacities: Record<string, number> = {};

function resetIntroScrollCache() {
  cachedCameraPosition = null;
  lastCameraUpdateFrame = -1;
  lastUpdateProgress = null;
}

function cacheObjectMeshes() {
  Object.entries(ghosts).forEach(([key, object]) => {
    if (!objectMeshes[key]) {
      objectMeshes[key] = [];
      object.traverse((child) => {
        if ((child as any).isMesh) {
          const mesh = child as THREE.Mesh;
          const childName = child.name || "";
          if (
            !isCurrencySymbol(childName) &&
            !(key === "pacman" && isPacmanPart(childName))
          ) {
            objectMeshes[key].push({
              mesh,
              material: mesh.material,
              name: childName,
            });
          }
        }
      });
    }
  });
}

function setIntroScrollLocked(locked: boolean) {
  Object.values(ghosts).forEach((obj) => {
    obj.userData.introScrollLocked = locked;
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
          cacheObjectMeshes();
          setIntroScrollLocked(true);
        },
        onEnterBack: () => {
          isIntroScrollActive = true;
          resetIntroScrollCache();
          cacheObjectMeshes();
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

      const targetScale =
        key === "pacman" ? SCALE.PACMAN_INTRO : SCALE.GHOST_INTRO;
      if (objectScales[key] !== targetScale) {
        object.scale.set(targetScale, targetScale, targetScale);
        objectScales[key] = targetScale;
      }

      object.visible = true;

      const targetOpacity = key === "pacman" ? OPACITY.FULL : baseGhostOpacity;

      if (objectOpacities[key] !== targetOpacity) {
        const meshes = objectMeshes[key] || [];
        meshes.forEach(({ mesh, material }) => {
          mesh.visible = true;
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((mat: any) => {
            mat.opacity = targetOpacity;
            if (mat.transmission !== undefined && mat.transmission > 0) {
              mat.transparent = true;
            } else {
              mat.transparent = targetOpacity < 1.0;
            }
          });
        });
        objectOpacities[key] = targetOpacity;
      }
    }
  );
}
