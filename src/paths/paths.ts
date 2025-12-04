import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import {
  homePaths,
  povPaths,
  createHomeScrollPathPoints,
  getCameraHomeScrollPathPoints,
} from "./pathpoints";

const pathCache = new Map<string, THREE.CurvePath<THREE.Vector3>>();

export class TangentSmoother {
  private currentTangent: THREE.Vector3;
  private smoothing: number;

  constructor(initialTangent: THREE.Vector3, smoothing: number = 0.06) {
    this.currentTangent = initialTangent.clone();
    this.smoothing = smoothing;
  }

  update(targetTangent: THREE.Vector3): THREE.Vector3 {
    this.currentTangent.lerp(targetTangent, this.smoothing);
    return this.currentTangent.normalize();
  }

  reset(newTangent: THREE.Vector3): void {
    this.currentTangent.copy(newTangent);
  }

  getCurrentTangent(): THREE.Vector3 {
    return this.currentTangent.clone();
  }

  setSmoothingFactor(smoothing: number): void {
    this.smoothing = Math.max(0.001, Math.min(1, smoothing));
  }
}

function createMazePath(
  pathPoints: MazePathPoint[],
  pathName?: string
): THREE.CurvePath<THREE.Vector3> {
  const cacheKey = pathPoints
    .map((p) => `${p.pos.x},${p.pos.y},${p.pos.z},${p.type},${p.arc || ""}`)
    .join("|");

  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey)!;
  }

  const path = new THREE.CurvePath<THREE.Vector3>();

  let i = 0;
  while (i < pathPoints.length - 1) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.curveCheckPoints && current.curveCheckPoints.length > 0) {
      const catmullPoints = [
        current.pos,
        ...current.curveCheckPoints,
        next.pos,
      ];
      path.add(
        new THREE.CatmullRomCurve3(catmullPoints, false, "centripetal", 0)
      );
    } else if (current.type === "straight") {
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    } else {
      const midPoint = createNormalCurveMidPoint(current, next);
      path.add(
        new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
      );
    }

    i++;
  }

  pathCache.set(cacheKey, path);
  return path;
}

function createNormalCurveMidPoint(
  current: MazePathPoint,
  next: MazePathPoint
): THREE.Vector3 {
  if (current.arc) {
    const curveType = current.arc;

    if (curveType === "upperArc") {
      return new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
    } else if (curveType === "lowerArc") {
      return new THREE.Vector3(next.pos.x, current.pos.y, current.pos.z);
    } else if (curveType === "forwardDownArc") {
      return new THREE.Vector3(current.pos.x, next.pos.y, current.pos.z);
    }
  }

  return new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
}

function createHomeScrollPath(
  pathPoints: PathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  if (pathPoints.length === 3) {
    const curve = new THREE.QuadraticBezierCurve3(
      pathPoints[0].pos,
      pathPoints[1].pos,
      pathPoints[2].pos
    );
    path.add(curve);
  }

  return path;
}

function createCameraHomeScrollPath(
  pathPoints: CameraPathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  if (pathPoints.length === 4) {
    const curve = new THREE.CubicBezierCurve3(
      pathPoints[0].pos,
      pathPoints[1].pos,
      pathPoints[2].pos,
      pathPoints[3].pos
    );
    path.add(curve);
  }

  return path;
}

function createCameraPath(
  pathPoints: CameraPathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if ("type" in current && current.type === "straight") {
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    } else if (
      "type" in current &&
      current.type === "curve" &&
      "arc" in current
    ) {
      const midPoint = createCameraCurveMidPoint(current, next);
      path.add(
        new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
      );
    } else {
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    }
  }

  return path;
}

function createCameraCurveMidPoint(
  current: CameraPathPoint,
  next: CameraPathPoint
): THREE.Vector3 {
  if ("arc" in current && current.arc) {
    const curveType = current.arc;

    if (curveType === "upperArc") {
      return new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
    } else if (curveType === "lowerArc") {
      return new THREE.Vector3(next.pos.x, current.pos.y, current.pos.z);
    } else if (curveType === "forwardDownArc") {
      return new THREE.Vector3(current.pos.x, next.pos.y, current.pos.z);
    }
  }

  return new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
}

export function getHomePaths(): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  Object.entries(homePaths).forEach(([key, pathPoints]) => {
    paths[key] = createMazePath(pathPoints, key);
  });

  return paths;
}

export function getHomeScrollPaths(
  pausedPositions: Record<string, THREE.Vector3>
): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const scrollPathPoints = createHomeScrollPathPoints(pausedPositions);
  const cameraPathPoints = getCameraHomeScrollPathPoints();

  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {
    camera: createCameraHomeScrollPath(cameraPathPoints),
  };

  Object.entries(scrollPathPoints).forEach(([key, pathPoints]) => {
    paths[key] = createHomeScrollPath(pathPoints);
  });

  return paths;
}

export function getPovPaths(): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  Object.entries(povPaths).forEach(([key, pathPoints]) => {
    if (key === "camera") {
      paths[key] = createMazePath(pathPoints as MazePathPoint[], key);
    } else {
      paths[key] = createMazePath(pathPoints as MazePathPoint[], key);
    }
  });

  return paths;
}
