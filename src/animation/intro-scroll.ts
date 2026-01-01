import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer, pacmanActions, pill } from "../core/objects";
import { clock, scene } from "../core/scene";
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
  PACMAN_MOUTH_SPEED,
  INTRO_MOUTH_PHASE,
  INTRO_EDGE_OFFSET,
  INTRO_OBJECT_POSITIONS,
  INTRO_OBJECT_ROTATIONS,
  INTRO_OBJECT_ANIMATION_OFFSETS,
  INTRO_GHOST_BOUNCE,
  clamp,
} from "./constants";
import { setFloorPlane, setObjectScale } from "./scene-utils";
import { getIntroPacmanRotation } from "../core/debug-hud";

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let lastUpdateProgress: number | null = null;
export let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};

function resetIntroScrollCache() {
  lastUpdateProgress = null;
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
          setIntroScrollLocked(true);
          pillCollected = false;
        },
        onEnterBack: () => {
          isIntroScrollActive = true;
          resetIntroScrollCache();
          setIntroScrollLocked(true);
          pillCollected = false;
        },
        onLeave: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);

          if (pacmanMixer) {
            pacmanMixer.timeScale = PACMAN_MOUTH_SPEED.NORMAL;
          }
        },
        onLeaveBack: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);

          if (pacmanMixer) {
            pacmanMixer.timeScale = PACMAN_MOUTH_SPEED.NORMAL;
          }
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

  ScrollTrigger.addEventListener("refresh", () => {
    const trigger = ScrollTrigger.getById("introScroll");
    if (
      trigger &&
      typeof trigger.progress === "number" &&
      trigger.progress > 0
    ) {
      updateObjectsWalkBy(trigger.progress);
    }
  });
}

function initializeQuaternions() {
  const rotation = getIntroPacmanRotation();

  const euler = new THREE.Euler(
    (rotation.x * Math.PI) / 180,
    (rotation.y * Math.PI) / 180,
    (rotation.z * Math.PI) / 180,
    "XYZ"
  );
  pacmanTargetQuaternion = new THREE.Quaternion().setFromEuler(euler);

  if (ghostTargetQuaternion) return;

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

let pillCollected: boolean = false;

function calculatePillProgress(): number {
  const camX = camera.position.x;
  const camY = camera.position.y;
  const camZ = camera.position.z;
  const pillPosition = INTRO_OBJECT_POSITIONS.PILL;

  const objectDistance = Math.abs(
    INTRO_POSITION_OFFSET.z + INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN.zOffset
  );
  const fovRadians = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * objectDistance * Math.tan(fovRadians / 2);
  const visibleWidth = visibleHeight * camera.aspect;
  const edgeOffset = Math.max(
    visibleWidth * INTRO_EDGE_OFFSET.PERCENTAGE,
    INTRO_EDGE_OFFSET.MIN
  );
  const leftScreenEdge = camX - visibleWidth / 2;
  const rightScreenEdge = camX + visibleWidth / 2;
  const totalPacmanOffset =
    INTRO_POSITION_OFFSET.x +
    INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN.behindOffset;
  const walkStart = leftScreenEdge - edgeOffset - totalPacmanOffset;
  const walkEnd = rightScreenEdge + edgeOffset - totalPacmanOffset;

  const pacmanFinalX = pillPosition.x;
  const pacmanX =
    pacmanFinalX -
    INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN.behindOffset -
    INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN.xOffset;
  const baseX = pacmanX - INTRO_POSITION_OFFSET.x;
  const positionProgress = (baseX - walkStart) / (walkEnd - walkStart);

  let normalizedProgress = positionProgress;
  if (positionProgress < 0.5) {
    normalizedProgress = Math.sqrt(positionProgress / 2);
  } else {
    normalizedProgress = 1 - Math.sqrt((1 - positionProgress) / 2);
  }

  return Math.max(0, Math.min(1, normalizedProgress));
}

function updateObjectsWalkBy(progress: number) {
  if (!isIntroScrollActive) return;

  if (lastUpdateProgress === progress) return;
  lastUpdateProgress = progress;

  const camX = camera.position.x;
  const camY = camera.position.y;
  const camZ = camera.position.z;

  if (!isFinite(camX) || !isFinite(camY) || !isFinite(camZ)) {
    return;
  }

  initializeQuaternions();

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

  const objectDistance = Math.abs(
    INTRO_POSITION_OFFSET.z + INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN.zOffset
  );
  const fovRadians = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * objectDistance * Math.tan(fovRadians / 2);
  const visibleWidth = visibleHeight * camera.aspect;

  const edgeOffset = Math.max(
    visibleWidth * INTRO_EDGE_OFFSET.PERCENTAGE,
    INTRO_EDGE_OFFSET.MIN
  );

  const leftScreenEdge = camX - visibleWidth / 2;
  const rightScreenEdge = camX + visibleWidth / 2;

  const totalPacmanOffset =
    INTRO_POSITION_OFFSET.x +
    INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN.behindOffset;

  const walkStart = leftScreenEdge - edgeOffset - totalPacmanOffset;
  const walkEnd = rightScreenEdge + edgeOffset - totalPacmanOffset;

  const objectsToAnimate = [
    {
      key: "pacman",
      ...INTRO_OBJECT_ANIMATION_OFFSETS.PACMAN,
    },
    {
      key: "ghost1",
      ...INTRO_OBJECT_ANIMATION_OFFSETS.GHOST1,
    },
    {
      key: "ghost2",
      ...INTRO_OBJECT_ANIMATION_OFFSETS.GHOST2,
    },
    {
      key: "ghost3",
      ...INTRO_OBJECT_ANIMATION_OFFSETS.GHOST3,
    },
    {
      key: "ghost4",
      ...INTRO_OBJECT_ANIMATION_OFFSETS.GHOST4,
    },
    {
      key: "ghost5",
      ...INTRO_OBJECT_ANIMATION_OFFSETS.GHOST5,
    },
    {
      key: "pill",
      behindOffset: 0,
      zOffset: 0,
      xOffset: 0,
      yOffset: 0,
      zPhase: 0,
    },
  ];

  const normalizedProgress = clamp(progress);

  const positionProgress =
    normalizedProgress < 0.5
      ? 2 * normalizedProgress * normalizedProgress
      : 1 - 2 * (1 - normalizedProgress) * (1 - normalizedProgress);
  const baseX = walkStart + (walkEnd - walkStart) * positionProgress;
  const pacmanX = baseX + INTRO_POSITION_OFFSET.x;
  const pacmanY = camY + INTRO_POSITION_OFFSET.y;
  const pacmanZ = camZ + INTRO_POSITION_OFFSET.z;

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

  const objectPositions: Record<string, THREE.Vector3> = {};

  objectsToAnimate.forEach(
    ({
      key,
      behindOffset,
      zOffset,
      xOffset,
      yOffset: staticYOffset,
      zPhase,
    }) => {
      const zBounce =
        key === "pacman" || key === "pill"
          ? 0
          : Math.sin(
              normalizedProgress * Math.PI * 2 * INTRO_GHOST_BOUNCE.FREQUENCY +
                zPhase
            ) * INTRO_GHOST_BOUNCE.AMPLITUDE;
      const animatedYOffset =
        key === "pacman" || key === "pill"
          ? 0
          : zBounce * INTRO_GHOST_BOUNCE.Y_MULTIPLIER;

      let finalX: number;
      let finalY: number;
      let finalZ: number;

      if (key === "pill") {
        finalX = INTRO_OBJECT_POSITIONS.PILL.x;
        finalY = INTRO_OBJECT_POSITIONS.PILL.y;
        finalZ = INTRO_OBJECT_POSITIONS.PILL.z;
      } else {
        finalX = pacmanX + behindOffset + xOffset;
        finalY = pacmanY + staticYOffset - animatedYOffset;
        finalZ = pacmanZ + zOffset - zBounce;
      }

      if (
        !isFinite(finalX) ||
        !isFinite(finalY) ||
        !isFinite(finalZ) ||
        Math.abs(finalZ) < 0.01 ||
        Math.abs(finalZ) > 100
      ) {
        return;
      }

      objectPositions[key] = new THREE.Vector3(finalX, finalY, finalZ);
    }
  );

  const pacmanPos = objectPositions["pacman"];
  const pillPosition = INTRO_OBJECT_POSITIONS.PILL;
  const positionThreshold = 0.1;
  const pillProgress = calculatePillProgress();

  if (progress < pillProgress - 0.01) {
    pillCollected = false;
  } else if (pacmanPos && !pillCollected) {
    const distanceX = Math.abs(pacmanPos.x - pillPosition.x);
    const distanceY = Math.abs(pacmanPos.y - pillPosition.y);
    const distanceZ = Math.abs(pacmanPos.z - pillPosition.z);

    if (
      distanceX < positionThreshold &&
      distanceY < positionThreshold &&
      distanceZ < positionThreshold
    ) {
      pillCollected = true;
    }
  }

  if (pacmanMixer && pacmanActions) {
    const mouthSpeed = 10.0;
    const normalizedProgress =
      (progress * mouthSpeed + INTRO_MOUTH_PHASE) % 1.0;

    Object.values(pacmanActions).forEach((action) => {
      const clipDuration = action.getClip().duration;
      action.time = normalizedProgress * clipDuration;
      action.paused = false;
    });

    pacmanMixer.update(0);
  }

  objectsToAnimate.forEach(
    ({
      key,
      behindOffset,
      zOffset,
      xOffset,
      yOffset: staticYOffset,
      zPhase,
    }) => {
      const object = key === "pill" ? pill : ghosts[key];
      if (!object) return;

      const position = objectPositions[key];
      if (!position) return;

      object.position.set(position.x, position.y, position.z);

      if (key === "pill") {
        const targetEuler = new THREE.Euler(
          (INTRO_OBJECT_ROTATIONS.PILL.x * Math.PI) / 180,
          (INTRO_OBJECT_ROTATIONS.PILL.y * Math.PI) / 180,
          (INTRO_OBJECT_ROTATIONS.PILL.z * Math.PI) / 180,
          "XYZ"
        );
        object.rotation.copy(targetEuler);
        object.scale.set(1, 1, 1);
      } else {
        const targetQuat =
          key === "pacman" ? pacmanTargetQuaternion : ghostTargetQuaternion;

        if (targetQuat) {
          object.quaternion.copy(targetQuat);
        }
        setObjectScale(object, key, "intro");
      }
      if (key === "pill") {
        object.visible = !pillCollected;
      } else {
        object.visible = true;
      }

      const targetOpacity =
        key === "pacman" || key === "pill" ? OPACITY.FULL : baseGhostOpacity;

      if (key !== "pill") {
        object.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            const childName = child.name || "";

            if (isCurrencySymbol(childName)) {
              mesh.visible = false;
              return;
            }

            if (
              isCurrencySymbol(childName) ||
              (key === "pacman" && isPacmanPart(childName))
            ) {
              mesh.visible = false;
              return;
            }

            mesh.visible = true;

            const mat = mesh.material;
            if (mat) {
              const materials = Array.isArray(mat) ? mat : [mat];
              materials.forEach((material: any) => {
                material.opacity = targetOpacity;
                if (
                  material.transmission !== undefined &&
                  material.transmission > 0
                ) {
                  material.transparent = true;
                } else {
                  material.transparent = targetOpacity < 1.0;
                }
              });
            }
          }
        });
      } else {
        object.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.visible = true;
          }
        });
      }
    }
  );
}
