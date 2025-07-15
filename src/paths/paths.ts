import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import {
  homePaths,
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
      const zigZagGroup = findZigZagGroup(typedPathPoints, i);

      if (zigZagGroup) {
        const startPoint = zigZagGroup.start;
        const endPoint = zigZagGroup.end;
        const midPoint = createNormalCurveMidPoint(startPoint, endPoint);

        console.log(
          `S-CURVE: i=${i}, endIndex=${zigZagGroup.endIndex}, next i will be ${
            zigZagGroup.endIndex + 1
          }`
        );

        const control1 = startPoint.pos.clone().lerp(midPoint, 0.6);
        const control2 = endPoint.pos.clone().lerp(midPoint, 0.6);
        path.add(
          new THREE.CubicBezierCurve3(
            startPoint.pos,
            control1,
            control2,
            endPoint.pos
          )
        );

        i = zigZagGroup.endIndex;
      } else {
        const midPoint = createNormalCurveMidPoint(current, next);
        path.add(
          new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
        );
      }
    }
  }
  return path;
}

function findZigZagGroup(
  pathPoints: Array<{
    pos: THREE.Vector3;
    type: "straight" | "curve";
    curveType?: string;
  }>,
  currentIndex: number
): { start: any; end: any; endIndex: number } | null {
  if (pathPoints[currentIndex].type !== "curve") {
    return null;
  }

  let zigZagStartIndex = currentIndex;
  let previousCurveType = pathPoints[currentIndex].curveType;
  let consecutiveZigZagCount = 0;

  for (let i = currentIndex + 1; i < pathPoints.length; i++) {
    const point = pathPoints[i];

    if (point.type === "curve") {
      if (point.curveType !== previousCurveType) {
        consecutiveZigZagCount++;
        previousCurveType = point.curveType;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (consecutiveZigZagCount >= 1) {
    const endIndex = currentIndex + consecutiveZigZagCount + 1; // Add +1 back
    return {
      start: pathPoints[zigZagStartIndex],
      end: pathPoints[endIndex],
      endIndex: endIndex,
    };
  }

  return null;
}

function createNormalCurveMidPoint(
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
