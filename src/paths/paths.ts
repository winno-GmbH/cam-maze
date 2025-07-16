import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import {
  homePaths,
  createHomeScrollPathPoints,
  getCameraHomeScrollPathPoints,
} from "./pathpoints";

// Cache for created paths
const pathCache = new Map<string, THREE.CurvePath<THREE.Vector3>>();

function createMazePath(
  pathPoints: MazePathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const cacheKey = pathPoints
    .map(
      (p) => `${p.pos.x},${p.pos.y},${p.pos.z},${p.type},${p.curveType || ""}`
    )
    .join("|");

  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey)!;
  }

  console.log("Creating new path with", pathPoints.length, "points");
  const path = new THREE.CurvePath<THREE.Vector3>();
  let catmullPoints: THREE.Vector3[] = [];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.type === "straight") {
      if (catmullPoints.length >= 2) {
        console.log(
          "Creating CatmullRomCurve3 with points:",
          catmullPoints.map((p) => `(${p.x}, ${p.y}, ${p.z})`)
        );
        path.add(new THREE.CatmullRomCurve3(catmullPoints));
        catmullPoints = [];
      }
      console.log(
        "Creating LineCurve3 from",
        `(${current.pos.x}, ${current.pos.y}, ${current.pos.z})`,
        "to",
        `(${next.pos.x}, ${next.pos.y}, ${next.pos.z})`
      );
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    } else if (
      current.type === "curve" &&
      next.type === "curve" &&
      current.curveType !== next.curveType
    ) {
      catmullPoints.push(current.pos);
    } else {
      const midPoint = createNormalCurveMidPoint(current, next);
      if (catmullPoints.length >= 2) {
        console.log(
          "Creating CatmullRomCurve3 with points:",
          catmullPoints.map((p) => `(${p.x}, ${p.y}, ${p.z})`)
        );
        path.add(new THREE.CatmullRomCurve3(catmullPoints));
        catmullPoints = [];
      }
      console.log(
        "Creating QuadraticBezierCurve3 from",
        `(${current.pos.x}, ${current.pos.y}, ${current.pos.z})`,
        "via",
        `(${midPoint.x}, ${midPoint.y}, ${midPoint.z})`,
        "to",
        `(${next.pos.x}, ${next.pos.y}, ${next.pos.z})`
      );
      path.add(
        new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
      );
    }
  }

  // Store the created path in cache
  pathCache.set(cacheKey, path);
  return path;
}

function createNormalCurveMidPoint(
  current: MazePathPoint,
  next: MazePathPoint
): THREE.Vector3 {
  if (current.curveType) {
    const curveType = current.curveType;

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
