import * as THREE from "three";

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
