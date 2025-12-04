import * as THREE from "three";
import { isCurrencySymbol, isPacmanPart } from "../animation/util";

export function setObjectOpacity(
  object: THREE.Object3D,
  opacity: number,
  options?: {
    preserveTransmission?: boolean;
    skipCurrencySymbols?: boolean;
  }
): void {
  const preserveTransmission = options?.preserveTransmission !== false;
  const skipCurrencySymbols = options?.skipCurrencySymbols !== false;

  object.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      const childName = child.name || "";

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

export function setMaterialOpacity(
  material: THREE.Material,
  opacity: number,
  preserveTransmission: boolean = true
): void {
  const mat = material as any;
  mat.opacity = opacity;

  if (preserveTransmission && mat.transmission !== undefined && mat.transmission > 0) {
    mat.transparent = true;
  } else {
    mat.transparent = opacity < 1.0;
  }

  if (mat.needsUpdate !== undefined) {
    mat.needsUpdate = true;
  }
}

export function setMaterialTransparent(
  material: THREE.Material,
  transparent: boolean,
  preserveTransmission: boolean = true
): void {
  const mat = material as any;

  if (preserveTransmission && mat.transmission !== undefined && mat.transmission > 0) {
    mat.transparent = true;
  } else {
    mat.transparent = transparent;
  }

  if (mat.needsUpdate !== undefined) {
    mat.needsUpdate = true;
  }
}

export function getObjectOpacity(object: THREE.Object3D): number {
  let opacity = 1.0;
  let found = false;

  forEachMaterial(
    object,
    (mat: any) => {
      if (!found) {
        opacity = mat.opacity ?? 1.0;
        found = true;
      }
    },
    { skipCurrencySymbols: false }
  );

  return opacity;
}

export function resetGhostMaterialsToFullOpacity(object: THREE.Object3D): void {
  setObjectOpacity(object, 1.0, {
    preserveTransmission: true,
    skipCurrencySymbols: true,
  });
}

export function setGhostColor(
  object: THREE.Object3D,
  color: number,
  options?: {
    skipCurrencySymbols?: boolean;
  }
): void {
  const skipCurrencySymbols = options?.skipCurrencySymbols !== false;

  forEachMaterial(
    object,
    (mat: any) => {
      if (mat.color && mat.color.getHex() !== color) {
        mat.color.setHex(color);
      }
    },
    { skipCurrencySymbols }
  );
}

export function forEachMaterial(
  object: THREE.Object3D,
  callback: (material: THREE.Material, mesh: THREE.Mesh, childName: string) => void,
  options?: {
    skipCurrencySymbols?: boolean;
    skipPacmanParts?: boolean;
    objectKey?: string;
  }
): void {
  const skipCurrencySymbols = options?.skipCurrencySymbols === true;
  const skipPacmanParts = options?.skipPacmanParts === true;
  const objectKey = options?.objectKey;

  object.traverse((child) => {
    if ((child as any).isMesh && (child as any).material) {
      const mesh = child as THREE.Mesh;
      const childName = child.name || "";

      if (skipCurrencySymbols && isCurrencySymbol(childName)) {
        return;
      }

      if (skipPacmanParts && objectKey === "pacman" && isPacmanPart(childName)) {
        return;
      }

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: any) => {
          callback(mat, mesh, childName);
        });
      } else {
        callback(mesh.material as any, mesh, childName);
      }
    }
  });
}
