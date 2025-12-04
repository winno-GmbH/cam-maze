import gsap from "gsap";
import * as THREE from "three";
import { scene } from "../core/scene";
import { SCALE, COLOR, OPACITY } from "./constants";

/**
 * SCENE UTILITIES
 * 
 * Centralized utility functions for common scene operations.
 * This prevents code duplication and ensures consistency.
 */

/**
 * Set floor plane visibility, opacity, and transparency
 * Used across all scene presets to manage the floor plane consistently
 */
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
        material.color.setHex(COLOR.WHITE);
        material.opacity = opacity;
        material.transparent = transparent;
      }
    }
  });
}

/**
 * Set object scale based on object key and scene type
 * Ensures consistent scaling across all scenes
 */
export function setObjectScale(
  object: THREE.Object3D,
  key: string,
  sceneType: "home" | "intro" | "pov" | "outro"
): void {
  let scale: number;

  if (key === "pacman") {
    scale = sceneType === "intro" ? SCALE.PACMAN_INTRO : SCALE.PACMAN_HOME;
  } else {
    scale = sceneType === "pov" ? SCALE.GHOST_POV : SCALE.GHOST_NORMAL;
  }

  // Set scale directly
  object.scale.set(scale, scale, scale);
  object.updateMatrixWorld(true);

  // Also set via GSAP for consistency
  gsap.set(object.scale, { x: scale, y: scale, z: scale });
}

/**
 * Kill all GSAP animations for an object and its materials
 * Useful when transitioning between scenes to prevent animation conflicts
 */
export function killObjectAnimations(object: THREE.Object3D): void {

  // Kill object animations
  gsap.killTweensOf(object);
  gsap.killTweensOf(object.scale);
  gsap.killTweensOf(object.position);
  gsap.killTweensOf(object.rotation);
  gsap.killTweensOf(object.quaternion);

  // Kill material animations
  object.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: any) => {
          gsap.killTweensOf(mat);
          gsap.killTweensOf(mat.opacity);
        });
      } else {
        gsap.killTweensOf(mesh.material);
        gsap.killTweensOf((mesh.material as any).opacity);
      }
    }
  });
}

