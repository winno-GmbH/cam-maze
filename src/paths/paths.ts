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

  let i = 0;
  while (i < pathPoints.length - 1) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    // === STRAIGHT ===
    if (current.type === "straight" && next) {
      console.log(`Line: ${i} → ${i + 1}`);
      path.add(new THREE.LineCurve3(current.pos, next.pos));
      i++;
      continue;
    }

    // === ARC HANDLING ===
    if (
      current.type === "curve" &&
      (current.curveType === "upperArc" || current.curveType === "lowerArc")
    ) {
      const arcType = current.curveType!;
      const sequence: THREE.Vector3[] = [current.pos];
      let alternating = false;
      let j = i + 1;
      let prevType = arcType;

      console.log(`Arc sequence started at ${i} (${arcType})`);

      while (
        j < pathPoints.length &&
        pathPoints[j].type === "curve" &&
        pathPoints[j].curveType
      ) {
        const nextType = pathPoints[j].curveType!;
        sequence.push(pathPoints[j].pos);

        if (nextType !== prevType) {
          alternating = true;
        } else if (alternating) {
          // stop if alternation breaks after it has started
          console.log(`Alternation stopped at ${j} (duplicate ${nextType})`);
          sequence.pop();
          break;
        }

        prevType = nextType;
        j++;
      }

      if (alternating && sequence.length >= 2) {
        console.log(
          `CatmullRomCurve from points ${i} to ${
            i + sequence.length - 1
          } (alternating)`
        );
        path.add(new THREE.CatmullRomCurve3(sequence));
      } else {
        for (let k = 0; k < sequence.length - 1; k++) {
          const from = sequence[k];
          const to = sequence[k + 1];
          const mid = from.clone().add(to).multiplyScalar(0.5);
          mid.y += arcType === "upperArc" ? 0.5 : -0.5;
          console.log(
            `QuadraticBezier from ${i + k} to ${i + k + 1} (${arcType})`
          );
          path.add(new THREE.QuadraticBezierCurve3(from, mid, to));
        }
      }

      i += sequence.length - 1;
      continue;
    }

    // fallback
    console.log(`Unhandled point at ${i}:`, current);
    i++;
  }

  return path;
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
