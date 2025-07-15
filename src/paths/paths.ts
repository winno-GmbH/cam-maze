import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import {
  homePaths,
  povPaths,
  createHomeScrollPathPoints,
  getCameraHomeScrollPathPoints,
} from "./pathpoints";

function createMazePath(
  pathPoints: (MazePathPoint | CameraPathPoint)[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  const typedPathPoints = pathPoints.filter(
    (point) => "type" in point
  ) as Array<{
    pos: THREE.Vector3;
    type: "straight" | "curve";
    curveType?: "upperArc" | "lowerArc" | "forwardDownArc";
  }>;

  for (let i = 0; i < typedPathPoints.length - 1; i++) {
    const current = typedPathPoints[i];
    const next = typedPathPoints[i + 1];

    if (current.type === "straight") {
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    } else if (current.type === "curve") {
      const hasPrevCurve = i > 0 && typedPathPoints[i - 1].type === "curve";
      const hasNextCurve =
        i < typedPathPoints.length - 2 &&
        typedPathPoints[i + 1].type === "curve";

      const midPoint =
        hasPrevCurve || hasNextCurve
          ? createDoubleCurveMidPoint(current, next, hasPrevCurve, hasNextCurve)
          : createSingleCurveMidPoint(current, next);

      path.add(
        new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
      );
    }
  }
  return path;
}

function createCameraPath(
  pathPoints: CameraPathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  // Use the same logic as createMazePath since they handle the same curve types
  return createMazePath(pathPoints);
}

function createSingleCurveMidPoint(
  current: { pos: THREE.Vector3; curveType?: string },
  next: { pos: THREE.Vector3; curveType?: string }
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

function createDoubleCurveMidPoint(
  current: { pos: THREE.Vector3; curveType?: string },
  next: { pos: THREE.Vector3; curveType?: string },
  hasPrevCurve: boolean,
  hasNextCurve: boolean
): THREE.Vector3 {
  const smoothingFactor = 0.12;
  const originalMidPoint = createSingleCurveMidPoint(current, next);
  const straightMidPoint = current.pos.clone().lerp(next.pos, 0.5);

  return originalMidPoint.clone().lerp(straightMidPoint, smoothingFactor);
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

  console.log("createCameraHomeScrollPath - pathPoints:", pathPoints);

  if (pathPoints.length === 4) {
    const curve = new THREE.CubicBezierCurve3(
      pathPoints[0].pos,
      pathPoints[1].pos,
      pathPoints[2].pos,
      pathPoints[3].pos
    );
    console.log(
      "createCameraHomeScrollPath - created curve with points:",
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

export function getPOVPaths(): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  Object.entries(povPaths).forEach(([key, pathPoints]) => {
    if (key === "camera") {
      paths[key] = createCameraPath(pathPoints as CameraPathPoint[]);
    } else {
      paths[key] = createMazePath(pathPoints as MazePathPoint[]);
    }
  });

  return paths;
}
