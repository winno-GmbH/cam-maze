import * as THREE from "three";
import { pill } from "./objects";

export interface PillDebugInfo {
  totalChildren: number;
  meshes: Array<{
    name: string;
    visible: boolean;
    materialType: string;
    materialColor?: number;
  }>;
}

export function getPillDebugInfo(): PillDebugInfo {
  const meshes: PillDebugInfo["meshes"] = [];


  const pillVisible = pill.visible;

  pill.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      let materialType = "unknown";
      let materialColor: number | undefined;

      if (mat) {
        if (Array.isArray(mat)) {
          materialType = mat[0]?.type || "multiple";
          if (mat[0] && (mat[0] as any).color) {
            materialColor = (mat[0] as any).color.getHex();
          }
        } else {
          materialType = mat.type;
          if ((mat as any).color) {
            materialColor = (mat as any).color.getHex();
          }
        }
      }


      let parentVisible = true;
      let parent = child.parent;
      while (parent && parent !== pill) {
        if (!parent.visible) {
          parentVisible = false;
          break;
        }
        parent = parent.parent;
      }

      const effectiveVisible = pillVisible && parentVisible && mesh.visible;

      meshes.push({
        name: child.name || "unnamed",
        visible: effectiveVisible,
        materialType,
        materialColor,
      });
    }
  });

  return {
    totalChildren: pill.children.length,
    meshes,
  };
}

export function setPillVisibility(visible: boolean): void {
  pill.visible = visible;
  pill.traverse((child) => {
    if ((child as any).isMesh) {
      (child as THREE.Mesh).visible = visible;
    }
  });
}

export function setPillMeshVisibility(namePattern: string, visible: boolean): void {
  pill.traverse((child) => {
    if ((child as any).isMesh) {
      const childName = child.name || "";
      if (childName.toLowerCase().includes(namePattern.toLowerCase())) {
        const mesh = child as THREE.Mesh;
        mesh.visible = visible;

        let parent = child.parent;
        while (parent && parent !== pill) {
          parent.visible = visible;
          parent = parent.parent;
        }
      }
    }
  });
}

export function setPillMaterialColor(color: number): void {
  pill.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      if (mat) {
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if ((m as any).color) {
              (m as any).color.setHex(color);
            }
          });
        } else {
          if ((mat as any).color) {
            (mat as any).color.setHex(color);
          }
        }
      }
    }
  });
}

export function setPillMeshMaterialColor(namePattern: string, color: number): void {
  pill.traverse((child) => {
    if ((child as any).isMesh) {
      const childName = child.name || "";
      if (childName.toLowerCase().includes(namePattern.toLowerCase())) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material;
        if (mat) {
          if (Array.isArray(mat)) {
            mat.forEach((m) => {
              if ((m as any).color) {
                (m as any).color.setHex(color);
              }
            });
          } else {
            if ((mat as any).color) {
              (mat as any).color.setHex(color);
            }
          }
        }
      }
    }
  });
}

export function resetPillMaterials(): void {

  const greenColor = 0x00ff00;
  pill.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      if (mat) {
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if ((m as any).color) {
              (m as any).color.setHex(greenColor);
            }
          });
        } else {
          if ((mat as any).color) {
            (mat as any).color.setHex(greenColor);
          }
        }
      }
    }
  });
}

