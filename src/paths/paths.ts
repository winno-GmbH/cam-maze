import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import {
  homePaths,
  povPaths,
  createHomeScrollPathPoints,
  getCameraHomeScrollPathPoints,
} from "./pathpoints";

export { PathWithMetadata, PathSegment };

interface PathSegment {
  type: "straight" | "curve" | "multiCurve";
  startIndex: number;
  endIndex: number;
  curveCount?: number;
  directionChanges?: number;
  rotationAngle?: number;
}

interface PathWithMetadata {
  path: THREE.CurvePath<THREE.Vector3>;
  segments: PathSegment[];
}

function analyzePathSegments(
  pathPoints: (MazePathPoint | CameraPathPoint)[]
): PathSegment[] {
  const segments: PathSegment[] = [];
  const typedPathPoints = pathPoints.filter(
    (point) => "type" in point
  ) as Array<{
    pos: THREE.Vector3;
    type: "straight" | "curve";
    curveType?: "upperArc" | "lowerArc" | "forwardDownArc";
  }>;

  let currentSegment: PathSegment | null = null;
  let curveSequence: number[] = [];

  for (let i = 0; i < typedPathPoints.length; i++) {
    const point = typedPathPoints[i];

    if (point.type === "straight") {
      // End current segment if it exists
      if (currentSegment) {
        currentSegment.endIndex = i - 1;
        segments.push(currentSegment);
        currentSegment = null;
        curveSequence = [];
      }

      // Start new straight segment
      currentSegment = {
        type: "straight",
        startIndex: i,
        endIndex: i,
      };
    } else if (point.type === "curve") {
      curveSequence.push(i);

      if (!currentSegment) {
        currentSegment = {
          type: "curve",
          startIndex: i,
          endIndex: i,
        };
      } else if (currentSegment.type === "straight") {
        // End straight segment and start curve segment
        currentSegment.endIndex = i - 1;
        segments.push(currentSegment);

        currentSegment = {
          type: "curve",
          startIndex: i,
          endIndex: i,
        };
      } else {
        // Continue curve segment
        currentSegment.endIndex = i;
      }
    }
  }

  // Add final segment
  if (currentSegment) {
    currentSegment.endIndex = typedPathPoints.length - 1;
    segments.push(currentSegment);
  }

  // Analyze curve sequences for multi-curve segments
  const finalSegments: PathSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.type === "curve") {
      // Count consecutive curves
      let curveCount = 1;
      let directionChanges = 0;

      // Look ahead for consecutive curves
      for (let j = i + 1; j < segments.length; j++) {
        if (segments[j].type === "curve") {
          curveCount++;
        } else {
          break;
        }
      }

      // Analyze direction changes in curve sequence
      if (curveCount > 1) {
        const curveIndices = [];
        for (let j = i; j < i + curveCount; j++) {
          curveIndices.push(segments[j].startIndex);
        }

        // Check for direction changes
        for (let k = 0; k < curveIndices.length - 1; k++) {
          const currentCurve = typedPathPoints[curveIndices[k]];
          const nextCurve = typedPathPoints[curveIndices[k + 1]];

          if (currentCurve.curveType !== nextCurve.curveType) {
            directionChanges++;
          }
        }

        // If multiple curves with direction changes, mark as multiCurve
        if (directionChanges > 0) {
          segment.type = "multiCurve";
          segment.curveCount = curveCount;
          segment.directionChanges = directionChanges;
          segment.rotationAngle = 75; // Use 75° instead of 90°

          // Skip the next curveCount-1 segments since we've merged them
          i += curveCount - 1;
        }
      }
    }

    finalSegments.push(segment);
  }

  return finalSegments;
}

function createMazePath(
  pathPoints: (MazePathPoint | CameraPathPoint)[]
): PathWithMetadata {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const segments = analyzePathSegments(pathPoints);

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

  return { path, segments };
}

function createCameraPath(pathPoints: CameraPathPoint[]): PathWithMetadata {
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

export function getHomePaths(): Record<string, PathWithMetadata> {
  const paths: Record<string, PathWithMetadata> = {};

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

export function getPOVPaths(): Record<string, PathWithMetadata> {
  const paths: Record<string, PathWithMetadata> = {};

  Object.entries(povPaths).forEach(([key, pathPoints]) => {
    if (key === "camera") {
      paths[key] = createCameraPath(pathPoints as CameraPathPoint[]);
    } else {
      paths[key] = createMazePath(pathPoints as MazePathPoint[]);
    }
  });

  return paths;
}
