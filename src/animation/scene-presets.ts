import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import {
  slerpToLayDown,
  applyRotations,
  OBJECT_KEYS,
  isCurrencySymbol,
  isPacmanPart,
} from "./util";
import {
  setMaterialOpacity,
  setMaterialTransparent,
  resetGhostMaterialsToFullOpacity,
  forEachMaterial,
} from "../core/material-utils";
import {
  setFloorPlane,
  setObjectScale,
  killObjectAnimations,
} from "./scene-utils";
import { SCALE, OPACITY, INTRO_POSITION_OFFSET } from "./constants";
import { quaternionPool } from "../core/object-pool";

const ghostKeys = Object.keys(ghosts);

export function applyHomeLoopPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  ghostKeys.forEach((key) => {
    const object = ghosts[key as keyof typeof ghosts];
    if (!object) return;
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
    ghostKeys.forEach((key) => {
      const object = ghosts[key as keyof typeof ghosts];
      if (!object) return;
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

export function applyIntroScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  if (!pacmanTargetQuaternion || !ghostTargetQuaternion) {
    const pacmanObj = ghosts.pacman;
    if (pacmanObj) {
      const tempQuat = quaternionPool.acquire();
      if (!introInitialRotations["pacman"]) {
        tempQuat.copy(pacmanObj.quaternion);
        introInitialRotations["pacman"] = tempQuat.clone();
      }

      tempQuat.copy(introInitialRotations["pacman"]);
      slerpToLayDown(pacmanObj, tempQuat, OPACITY.FULL);
      tempQuat.copy(pacmanObj.quaternion);

      const resultQuat = applyRotations(tempQuat, [
        { axis: "x", angle: Math.PI / 2 },
        { axis: "y", angle: Math.PI },
        { axis: "y", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "y", angle: Math.PI },
      ]);

      pacmanTargetQuaternion = resultQuat.clone();
      quaternionPool.release(tempQuat);
      pacmanObj.quaternion.copy(introInitialRotations["pacman"]);
    }

    const ghostObj = ghosts.ghost1;
    if (ghostObj) {
      const tempQuat = quaternionPool.acquire();
      if (!introInitialRotations["ghost1"]) {
        tempQuat.copy(ghostObj.quaternion);
        introInitialRotations["ghost1"] = tempQuat.clone();
      }

      tempQuat.copy(introInitialRotations["ghost1"]);
      slerpToLayDown(ghostObj, tempQuat, OPACITY.FULL);
      tempQuat.copy(ghostObj.quaternion);

      const resultQuat = applyRotations(tempQuat, [
        { axis: "x", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "y", angle: Math.PI },
        { axis: "y", angle: Math.PI },
        { axis: "x", angle: Math.PI },
        { axis: "x", angle: Math.PI },
      ]);

      ghostTargetQuaternion = resultQuat.clone();
      quaternionPool.release(tempQuat);
      ghostObj.quaternion.copy(introInitialRotations["ghost1"]);
    }

    const tempQuat = quaternionPool.acquire();
    OBJECT_KEYS.forEach((key) => {
      const obj = ghosts[key];
      if (obj && !introInitialRotations[key]) {
        tempQuat.copy(obj.quaternion);
        introInitialRotations[key] = tempQuat.clone();
      }
    });
    quaternionPool.release(tempQuat);
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

  ghostKeys.forEach((key) => {
    if (key === "pacman") return;
    const object = ghosts[key as keyof typeof ghosts];
    if (!object) return;
    gsap.set(object, { visible: false });
    setObjectScale(object, key, "pov");

    forEachMaterial(
      object,
      (mat: any) => {
        setMaterialOpacity(mat, 1, true);
      },
      { skipCurrencySymbols: false }
    );
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
