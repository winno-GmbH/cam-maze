import * as THREE from "three";
import { MazePathPoint, PathPoint } from "../types/types";
import { pathPoints, cameraScrollPathPoints } from "./pathpoints";

export function createHomeScrollPaths(
  pacman: THREE.Object3D,
  ghosts: Record<string, THREE.Object3D>
): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const paths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  const objects = { pacman, ...ghosts };

  Object.entries(objects).forEach(([key, obj]) => {
    if (!obj) return;

    const path = new THREE.CurvePath<THREE.Vector3>();
    paths[key] = path;
  });

  return paths;
}

function createMazePath(
  pathPoints: MazePathPoint[]
): THREE.CurvePath<THREE.Vector3> {
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
  current: MazePathPoint,
  next: MazePathPoint
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
  current: MazePathPoint,
  next: MazePathPoint,
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

function createPath(pathPoints: PathPoint[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  // Create a quadratic Bezier curve from the 3 points
  const curve = new THREE.QuadraticBezierCurve3(
    pathPoints[0].pos, // Start point
    pathPoints[1].pos, // Mid point
    pathPoints[2].pos // End point
  );

  path.add(curve);
  return path;
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

export const cameraHomePath = new THREE.CubicBezierCurve3(
  cameraScrollPathPoints.start,
  cameraScrollPathPoints.second,
  cameraScrollPathPoints.highPoint,
  cameraScrollPathPoints.end
);

export const paths = {
  pacmanHome: createMazePath(pathPoints.pacmanHome),
  ghost1Home: createMazePath(pathPoints.ghost1Home),
  ghost2Home: createMazePath(pathPoints.ghost2Home),
  ghost3Home: createMazePath(pathPoints.ghost3Home),
  ghost4Home: createMazePath(pathPoints.ghost4Home),
  ghost5Home: createMazePath(pathPoints.ghost5Home),
  pacmanHomeScroll: createPath(pathPoints.pacmanHomeScroll),
  ghost1HomeScroll: createPath(pathPoints.ghost1HomeScroll),
  ghost2HomeScroll: createPath(pathPoints.ghost2HomeScroll),
  ghost3HomeScroll: createPath(pathPoints.ghost3HomeScroll),
  ghost4HomeScroll: createPath(pathPoints.ghost4HomeScroll),
  ghost5HomeScroll: createPath(pathPoints.ghost5Scroll),
  cameraPOV: createMazePath(pathPoints.cameraPOV),
  ghost1POV: createMazePath(pathPoints.ghost1POV),
  ghost2POV: createMazePath(pathPoints.ghost2POV),
  ghost3POV: createMazePath(pathPoints.ghost3POV),
  ghost4POV: createMazePath(pathPoints.ghost4POV),
  ghost5POV: createMazePath(pathPoints.ghost5POV),
};
