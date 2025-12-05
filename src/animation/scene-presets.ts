import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import {
  slerpToLayDown,
  applyRotations,
  OBJECT_KEYS,
  GHOST_COLORS,
  isCurrencySymbol,
  isPacmanPart,
} from "./util";
import {
  setMaterialOpacity,
  setMaterialTransparent,
  resetGhostMaterialsToFullOpacity,
  setGhostColor,
  forEachMaterial,
} from "../core/material-utils";
import { updateObjectRotation } from "./object-state";
import {
  setFloorPlane,
  setObjectScale,
  killObjectAnimations,
} from "./scene-utils";
import { SCALE, COLOR, OPACITY, INTRO_POSITION_OFFSET } from "./constants";

export function applyHomeLoopPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  Object.entries(ghosts).forEach(([key, object]) => {
    gsap.set(object, { visible: true });
    setObjectScale(object, key, "home");

    forEachMaterial(
      object,
      (mat: any, mesh: THREE.Mesh, childName: string) => {
        if (isCurrencySymbol(childName)) {
          mesh.visible = false;
          return;
        }
        mesh.visible = true;
      },
      { skipCurrencySymbols: false }
    );

    resetGhostMaterialsToFullOpacity(object);
  });

  setFloorPlane(true, OPACITY.FULL, false);
}

export function applyHomeScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down",
  pausedPositions?: Record<string, THREE.Vector3>,
  pausedRotations?: Record<string, THREE.Quaternion>
) {
  if (!isEntering) return;

  if (pausedPositions && pausedRotations) {
    Object.entries(ghosts).forEach(([key, object]) => {
      if (pausedPositions[key]) {
        object.position.set(
          pausedPositions[key].x,
          pausedPositions[key].y,
          pausedPositions[key].z
        );
        gsap.set(object.position, {
          x: pausedPositions[key].x,
          y: pausedPositions[key].y,
          z: pausedPositions[key].z,
        });
      }

      gsap.set(object, { visible: true });

      setObjectScale(object, key, "home");

      forEachMaterial(
        object,
        (mat: any, mesh: THREE.Mesh, childName: string) => {
          if (isCurrencySymbol(childName)) {
            mesh.visible = false;
            return;
          }

          mesh.visible = true;

          setMaterialTransparent(mat, true, true);
        },
        { skipCurrencySymbols: false }
      );
    });
  }

  setFloorPlane(true, OPACITY.FULL, false);
}

export { INTRO_POSITION_OFFSET };

let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};

export function getPacmanTargetQuaternion(): THREE.Quaternion | null {
  return pacmanTargetQuaternion;
}

export function getGhostTargetQuaternion(): THREE.Quaternion | null {
  return ghostTargetQuaternion;
}

export function applyIntroScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  if (!pacmanTargetQuaternion || !ghostTargetQuaternion) {
    const pacmanObj = ghosts.pacman;
    if (pacmanObj) {
      if (!introInitialRotations["pacman"]) {
        introInitialRotations["pacman"] = pacmanObj.quaternion.clone();
      }

      let quat = introInitialRotations["pacman"].clone();
      slerpToLayDown(pacmanObj, quat, OPACITY.FULL);
      quat = pacmanObj.quaternion.clone();

      quat = applyRotations(quat, [
        { axis: "x", angle: Math.PI / 2 },
        { axis: "y", angle: Math.PI },
        { axis: "y", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "y", angle: Math.PI },
      ]);

      pacmanTargetQuaternion = quat;
      pacmanObj.quaternion.copy(introInitialRotations["pacman"]);
    }

    const ghostObj = ghosts.ghost1;
    if (ghostObj) {
      if (!introInitialRotations["ghost1"]) {
        introInitialRotations["ghost1"] = ghostObj.quaternion.clone();
      }

      let quat = introInitialRotations["ghost1"].clone();
      slerpToLayDown(ghostObj, quat, OPACITY.FULL);
      quat = ghostObj.quaternion.clone();

      quat = applyRotations(quat, [
        { axis: "x", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "y", angle: Math.PI },
        { axis: "y", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "x", angle: Math.PI },
      ]);

      ghostTargetQuaternion = quat;
      ghostObj.quaternion.copy(introInitialRotations["ghost1"]);
    }

    OBJECT_KEYS.forEach((key) => {
      const obj = ghosts[key];
      if (obj && !introInitialRotations[key]) {
        introInitialRotations[key] = obj.quaternion.clone();
      }
    });
  }
}

export function applyPovScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  if (ghosts.pacman) {
    gsap.set(ghosts.pacman, { visible: false });
  }

  Object.entries(ghosts).forEach(([key, object]) => {
    if (key !== "pacman") {
      gsap.set(object, { visible: false });
      setObjectScale(object, key, "pov");

      forEachMaterial(
        object,
        (mat: any) => {
          setMaterialOpacity(mat, 1, true);
        },
        { skipCurrencySymbols: false }
      );
    }
  });

  setFloorPlane(true, OPACITY.FULL, false);
}

export function applyOutroScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  setFloorPlane(true, OPACITY.FULL, false);
}

let lastScrollY = window.scrollY;
export function getScrollDirection(): "up" | "down" {
  const currentScrollY = window.scrollY;
  const direction = currentScrollY > lastScrollY ? "down" : "up";
  lastScrollY = currentScrollY;
  return direction;
}

export function resetPresetCaches() {
  pacmanTargetQuaternion = null;
  ghostTargetQuaternion = null;
  introInitialRotations = {};
}
