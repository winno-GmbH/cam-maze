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

let introScrollTimeline: gsap.core.Timeline | null = null;
let isIntroScrollActive = false;
let lastUpdateProgress: number | null = null;
let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};
let cachedCameraPosition: THREE.Vector3 | null = null;
let lastCameraUpdateFrame = -1;
let introGridGuides: THREE.Group | null = null;

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

function createIntroGridGuides() {
  // Remove existing guides if they exist
  if (introGridGuides) {
    scene.remove(introGridGuides);
    introGridGuides = null;
  }

  const gridGroup = new THREE.Group();
  gridGroup.name = "introGridGuides";
  introGridGuides = gridGroup;

  // Use smaller grid size to match the object area
  // Objects are positioned around INTRO_POSITION_OFFSET.y = -2.0
  const gridSize = 10; // Smaller grid
  const gridDivisions = 20; // More divisions for better visibility
  const gridYPosition = INTRO_POSITION_OFFSET.y; // Position at same Y as objects (-2.0)
  const gridSpacing = gridSize / gridDivisions; // 0.5 units between lines

  // Create grid lines manually so we can color them differently
  // X-direction lines (green) - lines parallel to X-axis
  const xLinesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  for (let i = -gridSize / 2; i <= gridSize / 2; i += gridSpacing) {
    const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-gridSize / 2, gridYPosition, i),
      new THREE.Vector3(gridSize / 2, gridYPosition, i),
    ]);
    const xLine = new THREE.Line(xLineGeometry, xLinesMaterial);
    xLine.renderOrder = 999;
    gridGroup.add(xLine);
  }

  // Z-direction lines (red) - lines parallel to Z-axis
  const zLinesMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  for (let i = -gridSize / 2; i <= gridSize / 2; i += gridSpacing) {
    const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i, gridYPosition, -gridSize / 2),
      new THREE.Vector3(i, gridYPosition, gridSize / 2),
    ]);
    const zLine = new THREE.Line(zLineGeometry, zLinesMaterial);
    zLine.renderOrder = 999;
    gridGroup.add(zLine);
  }

  // Y-axis line (yellow) - vertical, centered at grid to show height
  const yLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, gridYPosition - 1, 0),
    new THREE.Vector3(0, gridYPosition + 1, 0),
  ]);
  const yLineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
  const yLine = new THREE.Line(yLineGeometry, yLineMaterial);
  yLine.renderOrder = 1000;
  gridGroup.add(yLine);

  // Add labeled grid markers with numbers
  const labelDistance = 1; // Distance between labels
  const labelColor = 0xffffff;
  const labelSize = 0.15;

  // X-axis labels (along the red line)
  for (
    let i = -Math.floor(gridSize / 2);
    i <= Math.floor(gridSize / 2);
    i += labelDistance
  ) {
    if (i === 0) continue; // Skip origin

    // Create small sphere marker
    const markerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: labelColor });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(i, gridYPosition, 0);
    marker.renderOrder = 1001;
    gridGroup.add(marker);

    // Create number text using sprites (simple approach)
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#ffffff";
      context.font = "Bold 48px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(i.toString(), 32, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.3, 0.3, 1);
      sprite.position.set(i, gridYPosition + 0.3, 0);
      sprite.renderOrder = 1001;
      gridGroup.add(sprite);
    }
  }

  // Z-axis labels (along the blue line)
  for (
    let i = -Math.floor(gridSize / 2);
    i <= Math.floor(gridSize / 2);
    i += labelDistance
  ) {
    if (i === 0) continue; // Skip origin

    // Create small sphere marker
    const markerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: labelColor });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(0, gridYPosition, i);
    marker.renderOrder = 1001;
    gridGroup.add(marker);

    // Create number text
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#ffffff";
      context.font = "Bold 48px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(i.toString(), 32, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.3, 0.3, 1);
      sprite.position.set(0, gridYPosition + 0.3, i);
      sprite.renderOrder = 1001;
      gridGroup.add(sprite);
    }
  }

  // Origin marker
  const originGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const originMarker = new THREE.Mesh(originGeometry, originMaterial);
  originMarker.position.set(0, gridYPosition, 0);
  originMarker.renderOrder = 1001;
  gridGroup.add(originMarker);

  // Position grid at origin (0, 0, 0) - grid elements are positioned relative to this
  // The grid will be positioned at world Y = -2.0, which matches INTRO_POSITION_OFFSET.y
  // Since objects move relative to camera, the grid should cover a reasonable area
  gridGroup.position.set(0, 0, 0);

  scene.add(gridGroup);
  console.log("Intro grid guides created at Y position:", gridYPosition);
  console.log("Grid size:", gridSize, "Divisions:", gridDivisions);
  console.log("Grid group children count:", gridGroup.children.length);
}

function removeIntroGridGuides() {
  if (introGridGuides) {
    scene.remove(introGridGuides);
    introGridGuides = null;
    console.log("Intro grid guides removed");
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
          console.log("Intro scroll onEnter triggered");
          isIntroScrollActive = true;
          resetIntroScrollCache();
          setIntroScrollLocked(true);
          createIntroGridGuides();
        },
        onEnterBack: () => {
          console.log("Intro scroll onEnterBack triggered");
          isIntroScrollActive = true;
          resetIntroScrollCache();
          setIntroScrollLocked(true);
          createIntroGridGuides();
        },
        onLeave: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);
          removeIntroGridGuides();
        },
        onLeaveBack: () => {
          isIntroScrollActive = false;
          resetIntroScrollCache();
          restoreFloor();
          setIntroScrollLocked(false);
          removeIntroGridGuides();
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
      const object = key === "pill" ? pill : ghosts[key];
      if (!object) return;

      const zBounce =
        key === "pacman" || key === "pill"
          ? 0
          : Math.sin(normalizedProgress * Math.PI * 2 * 20 + zPhase) * 0.01;
      const animatedYOffset =
        key === "pacman" || key === "pill" ? 0 : zBounce * 1.5;
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

      if (key === "pill") {
        object.scale.set(0.05, 0.05, 0.05);
      } else {
        setObjectScale(object, key, "intro");
      }
      object.visible = true;

      const targetOpacity =
        key === "pacman" || key === "pill" ? OPACITY.FULL : baseGhostOpacity;

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
    }
  );
}
