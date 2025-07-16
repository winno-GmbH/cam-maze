import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import {
  homePaths,
  createHomeScrollPathPoints,
  getCameraHomeScrollPathPoints,
} from "./pathpoints";

function createMazePath(
  pathPoints: MazePathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let catmullPoints: THREE.Vector3[] = [];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (!current || !next || !current.pos || !next.pos) {
      continue;
    }

    if (current.type === "straight") {
      if (catmullPoints.length > 0) {
        path.add(new THREE.CatmullRomCurve3(catmullPoints));
        catmullPoints = [];
      }
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    } else if (
      current.type === "curve" &&
      next.type === "curve" &&
      current.curveType !== next.curveType
    ) {
      catmullPoints.push(current.pos);
    } else {
      const midPoint = createNormalCurveMidPoint(current, next);
      if (catmullPoints.length > 0) {
        // Only create curve if we have enough points
        if (catmullPoints.length >= 2) {
          path.add(new THREE.CatmullRomCurve3(catmullPoints));
        }
        catmullPoints = [];
      }
      path.add(
        new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
      );
    }
  }

  return path;
}

function createNormalCurveMidPoint(
  current: MazePathPoint,
  next: MazePathPoint
): THREE.Vector3 {
  // Safety check for undefined positions
  if (!current?.pos || !next?.pos) {
    return new THREE.Vector3(0, 0, 0);
  }

  return new THREE.Vector3(
    (current.pos.x + next.pos.x) / 2,
    (current.pos.y + next.pos.y) / 2,
    (current.pos.z + next.pos.z) / 2
  );
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

export function getHomePaths(): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  Object.entries(homePaths).forEach(([key, pathPoints]) => {
    paths[key] = createMazePath(pathPoints);
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
