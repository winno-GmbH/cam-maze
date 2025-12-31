import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacmanMixer, pill } from "../core/objects";
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
  INTRO_GHOST_OFFSETS,
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
let cachedCameraPosition: THREE.Vector3 | null = null;
let lastCameraUpdateFrame = -1;

function resetIntroScrollCache() {
  cachedCameraPosition = null;
  lastCameraUpdateFrame = -1;
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
          // Speed up Pacman mouth animation in intro-scroll (much faster for more frequent mouth movements)
          if (pacmanMixer) {
            pacmanMixer.timeScale = 4.0; // 4x faster for more frequent mouth movements
          }
        },
        onEnterBack: () => {
          isIntroScrollActive = true;
          resetIntroScrollCache();
          setIntroScrollLocked(true);
          // Speed up Pacman mouth animation in intro-scroll (much faster for more frequent mouth movements)
          if (pacmanMixer) {
            pacmanMixer.timeScale = 4.0; // 4x faster for more frequent mouth movements
          }
        },
        onLeave: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);
          // Reset Pacman animation speed when leaving intro-scroll
          if (pacmanMixer) {
            pacmanMixer.timeScale = 1.0;
          }
        },
        onLeaveBack: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);
          // Reset Pacman animation speed when leaving intro-scroll
          if (pacmanMixer) {
            pacmanMixer.timeScale = 1.0;
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
}

function initializeQuaternions() {
  // Always use HUD values for Pacman rotation (defaults to 0,0,0)
  const rotation = getIntroPacmanRotation();

  // Create quaternion from HUD values
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
    // Ensure timeScale is set during intro-scroll (in case it was reset elsewhere)
    if (isIntroScrollActive && pacmanMixer.timeScale !== 4.0) {
      pacmanMixer.timeScale = 4.0; // 4x faster for more frequent mouth movements
    }
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

  // Calculate visible width based on camera FOV, aspect ratio, and object distance
  // Objects are positioned at: camera.z + INTRO_POSITION_OFFSET.z + zOffset
  // Most objects have zOffset = 0.5, so distance from camera is approximately 0.5 units
  const objectDistance = Math.abs(INTRO_POSITION_OFFSET.z + 0.5); // Distance to objects in Z
  const fovRadians = (camera.fov * Math.PI) / 180; // Convert FOV to radians
  const visibleHeight = 2 * objectDistance * Math.tan(fovRadians / 2); // Visible height at object distance
  const visibleWidth = visibleHeight * camera.aspect; // Visible width = height * aspect ratio (adapts to viewport)
  // Edge offset: combination of percentage and fixed value for consistent positioning across screen sizes
  // Use larger percentage (25%) plus a fixed minimum (2.0 units) to ensure objects are well outside screen
  const edgeOffset = Math.max(visibleWidth * 0.25, 2.0); // At least 25% of width or 2.0 units, whichever is larger

  // Calculate screen edges in world space
  const leftScreenEdge = tempVector.x - visibleWidth / 2;
  const rightScreenEdge = tempVector.x + visibleWidth / 2;

  // Position calculation chain:
  // baseX -> pacmanX = baseX + INTRO_POSITION_OFFSET.x -> finalX = pacmanX + behindOffset + xOffset
  // For Pacman: behindOffset = 1.5, xOffset = 0
  // So: finalX = baseX + 4.3 + 1.5 = baseX + 5.8
  // We want finalX to start at: leftScreenEdge - edgeOffset
  // Therefore: baseX = leftScreenEdge - edgeOffset - 5.8
  const pacmanBehindOffset = 1.5; // Pacman's behindOffset
  const pacmanXOffset = 0; // Pacman's xOffset
  const totalPacmanOffset =
    INTRO_POSITION_OFFSET.x + pacmanBehindOffset + pacmanXOffset; // 4.3 + 1.5 + 0 = 5.8

  // Calculate walkStart and walkEnd so that finalX starts/ends just outside screen edges
  const walkStart = leftScreenEdge - edgeOffset - totalPacmanOffset; // Start just outside left edge
  const walkEnd = rightScreenEdge + edgeOffset - totalPacmanOffset; // End just outside right edge

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
    {
      key: "pill",
      behindOffset: 1.1 - INTRO_POSITION_OFFSET.x, // X position 1.1 on green grid line (absolute world position)
      zOffset: 1.5, // Z position 1.5 on red grid line (absolute world position)
      xOffset: 0,
      yOffset: 0,
      zPhase: Math.PI * 0.5,
    },
  ];

  const normalizedProgress = clamp(progress);
  // Stretch animation over entire intro-scroll by using a gentler easing curve
  // Use a quadratic ease-in-out for smooth, gradual movement that's visible throughout
  // This makes the animation slower overall while keeping it visible from start to finish
  const positionProgress =
    normalizedProgress < 0.5
      ? 2 * normalizedProgress * normalizedProgress // Ease-in for first half
      : 1 - 2 * (1 - normalizedProgress) * (1 - normalizedProgress); // Ease-out for second half
  const baseX = walkStart + (walkEnd - walkStart) * positionProgress;
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
      const object = key === "pill" ? pill : ghosts[key];
      if (!object) return;

      const zBounce =
        key === "pacman" || key === "pill"
          ? 0
          : Math.sin(normalizedProgress * Math.PI * 2 * 20 + zPhase) * 0.01;
      const animatedYOffset =
        key === "pacman" || key === "pill" ? 0 : zBounce * 1.5;

      // Special handling for pill: position at absolute grid coordinates
      let finalX: number;
      let finalY: number;
      let finalZ: number;

      if (key === "pill") {
        // Pill should be at grid position X=1.5 (green), Z=1.1 (red), Y=-2.0 (grid height)
        finalX = 1.5;
        finalY = INTRO_POSITION_OFFSET.y; // -2.0, same as grid height
        finalZ = 1.1;
      } else {
        // Other objects use relative positioning
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

      object.position.set(finalX, finalY, finalZ);

      if (key === "pill") {
        // Set specific rotation: X=1.571 (90°), Y=20°, Z=180° (π rad)
        const targetEuler = new THREE.Euler(
          1.571, // X: 90 degrees (π/2)
          (20 * Math.PI) / 180, // Y: 20 degrees
          (180 * Math.PI) / 180, // Z: 180 degrees (π)
          "XYZ"
        );
        object.rotation.copy(targetEuler);
        object.scale.set(10, 10, 10);
      } else {
        // For Pacman: use pacmanTargetQuaternion which is already set from HUD values
        // For ghosts: use ghostQuat
        const targetQuat = key === "pacman" ? pacmanQuat : ghostQuat;

        if (targetQuat) {
          object.quaternion.copy(targetQuat);
        }
        setObjectScale(object, key, "intro");
      }
      object.visible = true;

      const targetOpacity =
        key === "pacman" || key === "pill" ? OPACITY.FULL : baseGhostOpacity;

      // For pill, don't manipulate materials - keep original materials from 3D file
      if (key !== "pill") {
        object.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            const childName = child.name || "";

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
        // For pill: just ensure visibility, but keep original materials untouched
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
