import gsap from "gsap";
import * as THREE from "three";
import { scene } from "../core/scene";
import { SCALE, OPACITY } from "./constants";
import { forEachMaterial } from "../core/material-utils";

let cachedFloorObject: THREE.Object3D | null = null;

function findFloorObject(): THREE.Object3D | null {
  if (cachedFloorObject) return cachedFloorObject;
  scene.traverse((child) => {
    if (child.name === "CAM-Floor" && !cachedFloorObject) {
      cachedFloorObject = child;
    }
  });
  return cachedFloorObject;
}

export function setFloorPlane(
  visible: boolean,
  opacity: number = OPACITY.FULL,
  transparent: boolean = false
): void {
  const floorObject = findFloorObject();
  if (!floorObject) return;
  
  floorObject.visible = visible;
  if (floorObject instanceof THREE.Mesh && floorObject.material) {
    const material = floorObject.material as THREE.MeshBasicMaterial;
    material.color.setHex(0xffffff);
    material.opacity = opacity;
    material.transparent = transparent;
  }
}

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

  if (object.scale.x !== scale || object.scale.y !== scale || object.scale.z !== scale) {
    object.scale.set(scale, scale, scale);
    object.updateMatrixWorld(true);
    gsap.set(object.scale, { x: scale, y: scale, z: scale });
  }
}

export function killObjectAnimations(object: THREE.Object3D): void {
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
