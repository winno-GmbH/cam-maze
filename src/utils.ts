import * as THREE from 'three';

// Math Utilities
export function smoothStep(x: number): number {
  return x * x * (3 - 2 * x);
}

// Path Utilities
export function findClosestProgressOnPath(
  path: THREE.CurvePath<THREE.Vector3>, 
  targetPoint: THREE.Vector3, 
  samples: number = 2000
): number {
  if (!path || !targetPoint) return 0;

  let closestProgress = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < samples; i++) {
    try {
      const t = i / (samples - 1);
      const pointOnPath = path.getPointAt(t);
      if (!pointOnPath) continue;

      const distance = pointOnPath.distanceTo(targetPoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProgress = t;
      }
    } catch (error) {}
  }

  return closestProgress;
}

// Animation Position Utilities
export function getCurrentPacmanPosition(): { position: THREE.Vector3; tangent: THREE.Vector3 } | null {
  // This would need to be implemented based on current animation state
  // Placeholder implementation
  return null;
}

// Debugging Utilities
export function debugGhosts(ghosts: any, scene: THREE.Scene): void {
  console.log("=== GHOST DEBUG ===");
  
  Object.entries(ghosts).forEach(([key, ghost]: [string, any]) => {
    console.log(`${key}:`, {
      exists: !!ghost,
      visible: ghost?.visible,
      inScene: scene.children.includes(ghost),
      position: ghost?.position,
      hasChildren: ghost?.children?.length || 0,
      hasGeometry: !!ghost?.geometry,
      material: !!ghost?.material
    });
  });
  
  console.log("Scene children count:", scene.children.length);
  console.log("Scene children:", scene.children.map(child => child.type + " - " + (child.name || "unnamed")));
}

// Ensure ghosts are in scene
export function ensureGhostsInScene(ghosts: any, scene: THREE.Scene): void {
  Object.entries(ghosts).forEach(([key, ghost]: [string, any]) => {
    if (ghost && !scene.children.includes(ghost)) {
      console.log(`Adding ${key} back to scene`);
      scene.add(ghost);
    }
  });
}

// Rotation utilities
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

// Vector utilities
export function lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3().lerpVectors(a, b, t);
}

// Time utilities
export function debounce(func: Function, wait: number): Function {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}