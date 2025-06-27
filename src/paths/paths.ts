import * as THREE from "three";
import { PathPoint } from "../types/types";
import { startPosition, secondPosition } from "../config/config";
import { MAZE_CENTER, pathPoints } from "./pathpoints";

// Convert PathPoint[] to Vector3[] for camera path
const cameraPathPoints = pathPoints.cameraPOV.map((point) => point.pos);
export const cameraHomePath = new THREE.CatmullRomCurve3(cameraPathPoints);

export const paths = {
  pacmanHome: createPath(pathPoints.pacmanHome),
  ghost1Home: createPath(pathPoints.ghost1Home),
  ghost2Home: createPath(pathPoints.ghost2Home),
  ghost3Home: createPath(pathPoints.ghost3Home),
  ghost4Home: createPath(pathPoints.ghost4Home),
  ghost5Home: createPath(pathPoints.ghost5Home),
  cameraPOV: createPath(pathPoints.cameraPOV),
  ghost1POV: createPath(pathPoints.ghost1POV),
  ghost2POV: createPath(pathPoints.ghost2POV),
  ghost3POV: createPath(pathPoints.ghost3POV),
  ghost4POV: createPath(pathPoints.ghost4POV),
  ghost5POV: createPath(pathPoints.ghost5POV),
};

export function createHomeScrollPaths(
  pacman: THREE.Object3D,
  ghosts: Record<string, THREE.Object3D>
): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  // Create paths for each object
  const objects = { pacman, ...ghosts };

  Object.entries(objects).forEach(([key, obj]) => {
    if (!obj) return;

    const path = new THREE.CurvePath<THREE.Vector3>();

    // Get current position
    const startPos = obj.position.clone();

    // Create midpoint that arcs up to y=1
    const midPoint = new THREE.Vector3(
      (startPos.x + MAZE_CENTER.x) / 2,
      1,
      (startPos.z + MAZE_CENTER.z) / 2
    );

    // Create Bezier curve from current position through midpoint to maze center
    const curve = new THREE.QuadraticBezierCurve3(
      startPos,
      midPoint,
      new THREE.Vector3(MAZE_CENTER.x, MAZE_CENTER.y, MAZE_CENTER.z)
    );

    path.add(curve);
    paths[key] = path;
  });

  return paths;
}

function createPath(pathPoints: PathPoint[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.type === "straight") {
      path.add(new THREE.LineCurve3(current.pos, next.pos));
    } else if (current.type === "curve") {
      const hasPrevCurve = i > 0 && pathPoints[i - 1].type === "curve";
      const hasNextCurve =
        i < pathPoints.length - 2 && pathPoints[i + 1].type === "curve";

      const midPoint =
        hasPrevCurve || hasNextCurve
          ? createSmoothMidPoint(current, next, hasPrevCurve, hasNextCurve)
          : createSimpleMidPoint(current, next);

      path.add(
        new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos)
      );
    }
  }
  return path;
}

function createSimpleMidPoint(
  current: PathPoint,
  next: PathPoint
): THREE.Vector3 {
  const { curveType } = current;

  if (curveType === "upperArc") {
    return new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
  } else if (curveType === "lowerArc") {
    return new THREE.Vector3(next.pos.x, current.pos.y, current.pos.z);
  } else if (curveType === "forwardDownArc") {
    return new THREE.Vector3(current.pos.x, next.pos.y, current.pos.z);
  } else {
    return new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
  }
}

function createSmoothMidPoint(
  current: PathPoint,
  next: PathPoint,
  hasPrevCurve: boolean,
  hasNextCurve: boolean
): THREE.Vector3 {
  const smoothingFactor = 0.3;
  const originalMidPoint = createSimpleMidPoint(current, next);
  const straightMidPoint = current.pos.clone().lerp(next.pos, 0.5);

  const stretchFactor =
    hasPrevCurve && hasNextCurve ? smoothingFactor * 2 : smoothingFactor;
  return originalMidPoint.clone().lerp(straightMidPoint, stretchFactor);
}

export function getPathsForSection(section: string) {
  if (section === "home") {
    return {
      pacman: paths.pacmanHome,
      ghost1: paths.ghost1Home,
      ghost2: paths.ghost2Home,
      ghost3: paths.ghost3Home,
      ghost4: paths.ghost4Home,
      ghost5: paths.ghost5Home,
    };
  } else if (section === "pov") {
    return {
      pacman: paths.cameraPOV,
      ghost1: paths.ghost1POV,
      ghost2: paths.ghost2POV,
      ghost3: paths.ghost3POV,
      ghost4: paths.ghost4POV,
      ghost5: paths.ghost5POV,
    };
  }
  return {};
}
