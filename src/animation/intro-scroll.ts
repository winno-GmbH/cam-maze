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

  const gridSize = 20;
  const gridDivisions = 40;
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x444444);
  gridGroup.add(gridHelper);

  // Create axes helper at origin
  const axesHelper = new THREE.AxesHelper(3);
  gridGroup.add(axesHelper);

  // Create a semi-transparent plane to show XZ plane at Y=0
  const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  gridGroup.add(plane);

  // Create colored lines along axes
  // X-axis line (red)
  const xLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-gridSize / 2, 0, 0),
    new THREE.Vector3(gridSize / 2, 0, 0),
  ]);
  const xLine = new THREE.Line(xLineGeometry, new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 }));
  gridGroup.add(xLine);

  // Y-axis line (green)
  const yLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -gridSize / 2, 0),
    new THREE.Vector3(0, gridSize / 2, 0),
  ]);
  const yLine = new THREE.Line(yLineGeometry, new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 }));
  gridGroup.add(yLine);

  // Z-axis line (blue)
  const zLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, -gridSize / 2),
    new THREE.Vector3(0, 0, gridSize / 2),
  ]);
  const zLine = new THREE.Line(zLineGeometry, new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 }));
  gridGroup.add(zLine);

  // Create marked reference positions
  const markerPositions = [
    { pos: new THREE.Vector3(0, 0, 0), color: 0xffff00, label: "Origin (0,0,0)" },
    { pos: new THREE.Vector3(4.3, -2.0, 0), color: 0x00ffff, label: "Maze Center (4.3,-2.0,0)" },
    { pos: new THREE.Vector3(0.5, 0.5, 0.5), color: 0xff00ff, label: "Pill Target (0.5,0.5,0.5)" },
  ];

  markerPositions.forEach(({ pos, color, label }) => {
    // Create a small sphere at the position
    const sphereGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(pos);
    gridGroup.add(sphere);

    // Create a wireframe box above the marker for visibility
    const boxGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const boxMaterial = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.7 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.copy(pos);
    box.position.y += 0.4;
    box.userData.labelText = label;
    gridGroup.add(box);
  });

  scene.add(gridGroup);
  console.log("Intro grid guides created");
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
          isIntroScrollActive = true;
          resetIntroScrollCache();
          setIntroScrollLocked(true);
          createIntroGridGuides();
        },
        onEnterBack: () => {
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
      behindOffset: -0.03,
      zOffset: 0.5,
      xOffset: -0.75,
      yOffset: 0.25,
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
