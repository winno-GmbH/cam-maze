import * as THREE from "three";
import { isCurrencySymbol } from "../animation/util";

/**
 * MATERIAL UTILITIES
 * 
 * Centralized functions for managing material properties consistently across the codebase.
 * This prevents bugs where material properties (especially opacity/transparent) are set
 * inconsistently in different places.
 * 
 * CRITICAL RULES:
 * - Ghost materials (MeshPhysicalMaterial with transmission) MUST always have transparent=true
 *   to preserve the glow effect, even at opacity 1.0
 * - Always use these utility functions instead of directly setting material properties
 */

/**
 * Set opacity on all materials of an object
 * CRITICAL: For ghost materials with transmission, transparent is always kept true
 */
export function setObjectOpacity(
  object: THREE.Object3D,
  opacity: number,
  options?: {
    preserveTransmission?: boolean; // If true, keeps transparent=true for ghost materials (default: true)
    skipCurrencySymbols?: boolean; // If true, skips currency symbol meshes (default: true)
  }
): void {
  const preserveTransmission = options?.preserveTransmission !== false; // Default: true
  const skipCurrencySymbols = options?.skipCurrencySymbols !== false; // Default: true

  object.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      const childName = child.name || "";

      // Skip currency symbols if requested
      if (skipCurrencySymbols && isCurrencySymbol(childName)) {
        return;
      }

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: any) => {
          setMaterialOpacity(mat, opacity, preserveTransmission);
        });
      } else {
        setMaterialOpacity(mesh.material as any, opacity, preserveTransmission);
      }
    }
  });
}

/**
 * Set opacity on a single material
 * CRITICAL: For MeshPhysicalMaterial with transmission, transparent is always kept true
 */
export function setMaterialOpacity(
  material: THREE.Material,
  opacity: number,
  preserveTransmission: boolean = true
): void {
  const mat = material as any;
  mat.opacity = opacity;

  // CRITICAL: For MeshPhysicalMaterial with transmission, always keep transparent=true
  // This preserves the glow effect even at opacity 1.0
  // Three.js treats opacity 1.0 as non-transparent even with transparent=true,
  // but we need transparent=true to maintain the transmission glow effect
  if (preserveTransmission && mat.transmission !== undefined && mat.transmission > 0) {
    mat.transparent = true;
  } else {
    // For other materials, set transparent based on opacity
    mat.transparent = opacity < 1.0;
  }

  // Force material update
  if (mat.needsUpdate !== undefined) {
    mat.needsUpdate = true;
  }
}

/**
 * Set transparent property on a single material
 * CRITICAL: For MeshPhysicalMaterial with transmission, transparent is always kept true
 * NOTE: This is used internally by setMaterialOpacity, but can be used directly if needed
 */
export function setMaterialTransparent(
  material: THREE.Material,
  transparent: boolean,
  preserveTransmission: boolean = true
): void {
  const mat = material as any;

  // CRITICAL: For MeshPhysicalMaterial with transmission, always keep transparent=true
  // This preserves the glow effect
  if (preserveTransmission && mat.transmission !== undefined && mat.transmission > 0) {
    mat.transparent = true;
  } else {
    mat.transparent = transparent;
  }

  // Force material update
  if (mat.needsUpdate !== undefined) {
    mat.needsUpdate = true;
  }
}

/**
 * Get opacity from the first material found in an object
 */
export function getObjectOpacity(object: THREE.Object3D): number {
  let opacity = 1.0;

  object.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        if (mesh.material.length > 0) {
          opacity = (mesh.material[0] as any).opacity ?? 1.0;
        }
      } else {
        opacity = (mesh.material as any).opacity ?? 1.0;
      }
      return; // Only need first material
    }
  });

  return opacity;
}

/**
 * Check if a material is a ghost material (has transmission)
 * NOTE: Currently not used, but kept for potential future use
 */
export function isGhostMaterial(material: THREE.Material): boolean {
  const mat = material as any;
  return mat.transmission !== undefined && mat.transmission > 0;
}

/**
 * Set all ghost materials to full opacity and ensure transparent=true
 * Use this when resetting objects to their default state
 */
export function resetGhostMaterialsToFullOpacity(object: THREE.Object3D): void {
  setObjectOpacity(object, 1.0, {
    preserveTransmission: true, // Keep transparent=true for glow effect
    skipCurrencySymbols: true,
  });
}

/**
 * Set ghost color on all materials of an object
 * Used to colorize ghosts (e.g., red for ghost1, green for ghost2, etc.)
 */
export function setGhostColor(
  object: THREE.Object3D,
  color: number,
  options?: {
    skipCurrencySymbols?: boolean; // If true, skips currency symbol meshes (default: true)
  }
): void {
  const skipCurrencySymbols = options?.skipCurrencySymbols !== false; // Default: true

  object.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      const childName = child.name || "";

      // Skip currency symbols if requested
      if (skipCurrencySymbols && isCurrencySymbol(childName)) {
        return;
      }

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: any) => {
          if (mat.color && mat.color.getHex() !== color) {
            mat.color.setHex(color);
          }
        });
      } else {
        const mat = mesh.material as any;
        if (mat.color && mat.color.getHex() !== color) {
          mat.color.setHex(color);
        }
      }
    }
  });
}

