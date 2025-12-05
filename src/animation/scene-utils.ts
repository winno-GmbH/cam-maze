import gsap from "gsap";
import * as THREE from "three";
import { scene } from "../core/scene";
import { SCALE, OPACITY } from "./constants";
import { forEachMaterial } from "../core/material-utils";

export function setFloorPlane(
  visible: boolean,
  opacity: number = OPACITY.FULL,
  transparent: boolean = false
): void {
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = visible;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = opacity;
        material.transparent = transparent;
      }
    }
  });
}

const scaleCache: Record<string, number> = {};

export function setObjectScale(
  object: THREE.Object3D,
  key: string,
  sceneType: "home" | "intro" | "pov" | "outro"
): void {
  let scale: number;

  if (key === "pacman") {
    scale = sceneType === "intro" ? SCALE.PACMAN_INTRO : SCALE.PACMAN_HOME;
  } else {
    if (sceneType === "intro") {
      scale = SCALE.GHOST_INTRO;
    } else if (sceneType === "pov") {
      scale = SCALE.GHOST_POV;
    } else {
      scale = SCALE.GHOST_NORMAL;
    }
  }

  const cacheKey = `${key}-${sceneType}`;
  if (scaleCache[cacheKey] === scale && object.scale.x === scale) {
    return;
  }

  object.scale.set(scale, scale, scale);
  scaleCache[cacheKey] = scale;
  
  if (sceneType === "intro") {
    object.updateMatrixWorld(false);
  } else {
    object.updateMatrixWorld(true);
  }
  gsap.set(object.scale, { x: scale, y: scale, z: scale });
}

export function killObjectAnimations(object: THREE.Object3D): void {
  if (!object) return;

  gsap.killTweensOf(object);
  gsap.killTweensOf(object.scale);
  gsap.killTweensOf(object.position);
  gsap.killTweensOf(object.rotation);
  gsap.killTweensOf(object.quaternion);

  forEachMaterial(
    object,
    (mat: any) => {
      gsap.killTweensOf(mat);
      gsap.killTweensOf(mat.opacity);
    },
    { skipCurrencySymbols: false }
  );
}
