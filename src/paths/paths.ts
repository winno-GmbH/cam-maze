import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import { getPathPointsWithScroll } from "./pathpoints";

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

function createPath(pathPoints: PathPoint[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  const curve = new THREE.QuadraticBezierCurve3(
    pathPoints[0].pos,
    pathPoints[1].pos,
    pathPoints[2].pos
  );

  path.add(curve);
  return path;
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

export function updateObjectHomeScrollPaths(
  pacman: THREE.Object3D,
  ghosts: Record<string, THREE.Object3D>
): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const allPathPoints = getPathPointsWithScroll(pacman, ghosts) as Record<
    string,
    any
  >;

  const scrollPaths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

  scrollPaths.pacmanHomeScroll = createPath(allPathPoints.pacmanHomeScroll);
  scrollPaths.ghost1HomeScroll = createPath(allPathPoints.ghost1HomeScroll);
  scrollPaths.ghost2HomeScroll = createPath(allPathPoints.ghost2HomeScroll);
  scrollPaths.ghost3HomeScroll = createPath(allPathPoints.ghost3HomeScroll);
  scrollPaths.ghost4HomeScroll = createPath(allPathPoints.ghost4HomeScroll);
  scrollPaths.ghost5HomeScroll = createPath(allPathPoints.ghost5HomeScroll);

  return scrollPaths;
}

export function createScrollPaths(
  pathPoints: PathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  const curve = new THREE.QuadraticBezierCurve3(
    pathPoints[0].pos,
    pathPoints[1].pos,
    pathPoints[2].pos
  );

  path.add(curve);
  return path;
}

export function getPathsForSection(
  section: string,
  pacman: THREE.Object3D,
  ghosts: Record<string, THREE.Object3D>
) {
  const allPaths = getAllPaths(pacman, ghosts);

  if (section === "home") {
    return {
      pacman: allPaths.pacmanHome,
      ghost1: allPaths.ghost1Home,
      ghost2: allPaths.ghost2Home,
      ghost3: allPaths.ghost3Home,
      ghost4: allPaths.ghost4Home,
      ghost5: allPaths.ghost5Home,
    };
  } else if (section === "pov") {
    return {
      pacman: allPaths.cameraPOV,
      ghost1: allPaths.ghost1POV,
      ghost2: allPaths.ghost2POV,
      ghost3: allPaths.ghost3POV,
      ghost4: allPaths.ghost4POV,
      ghost5: allPaths.ghost5POV,
    };
  }
  return {};
}

function createCameraPath(
  pathPoints: CameraPathPoint[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    path.add(new THREE.LineCurve3(current.pos, next.pos));
  }
  return path;
}

export function getAllPaths(
  pacman: THREE.Object3D,
  ghosts: Record<string, THREE.Object3D>
): Record<string, THREE.CurvePath<THREE.Vector3>> {
  const allPathPoints = getPathPointsWithScroll(pacman, ghosts) as Record<
    string,
    any
  >;

  return {
    pacmanHome: createMazePath(allPathPoints.pacmanHome),
    ghost1Home: createMazePath(allPathPoints.ghost1Home),
    ghost2Home: createMazePath(allPathPoints.ghost2Home),
    ghost3Home: createMazePath(allPathPoints.ghost3Home),
    ghost4Home: createMazePath(allPathPoints.ghost4Home),
    ghost5Home: createMazePath(allPathPoints.ghost5Home),

    cameraPOV: createCameraPath(allPathPoints.cameraPOV),
    ghost1POV: createMazePath(allPathPoints.ghost1POV),
    ghost2POV: createMazePath(allPathPoints.ghost2POV),
    ghost3POV: createMazePath(allPathPoints.ghost3POV),
    ghost4POV: createMazePath(allPathPoints.ghost4POV),
    ghost5POV: createMazePath(allPathPoints.ghost5POV),

    cameraHomeScroll: createCameraHomeScrollPath(
      allPathPoints.cameraHomeScroll
    ),
    pacmanHomeScroll: createPath(allPathPoints.pacmanHomeScroll),
    ghost1HomeScroll: createPath(allPathPoints.ghost1HomeScroll),
    ghost2HomeScroll: createPath(allPathPoints.ghost2HomeScroll),
    ghost3HomeScroll: createPath(allPathPoints.ghost3HomeScroll),
    ghost4HomeScroll: createPath(allPathPoints.ghost4HomeScroll),
    ghost5HomeScroll: createPath(allPathPoints.ghost5HomeScroll),
  };
}

function createCameraHomeScrollPath(
  pathPoints: any
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  const curve = new THREE.CubicBezierCurve3(
    pathPoints.start,
    pathPoints.second,
    pathPoints.highPoint,
    pathPoints.end
  );

  path.add(curve);
  return path;
}

export function getCameraPositionAndRotation(
  pathPoints: CameraPathPoint[],
  t: number
): { position: THREE.Vector3; rotation: THREE.Euler } {
  const path = createCameraPath(pathPoints);
  const position = path.getPointAt(t);

  const totalPoints = pathPoints.length;
  const currentIndex = Math.floor(t * (totalPoints - 1));
  const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
  const localT = t * (totalPoints - 1) - currentIndex;

  const currentPoint = pathPoints[currentIndex];
  const nextPoint = pathPoints[nextIndex];

  let rotation: THREE.Euler;

  // Type guards to determine rotation method
  const isTangentPoint = (
    point: CameraPathPoint
  ): point is {
    pos: THREE.Vector3;
    type: "straight" | "curve";
    curveType?: "upperArc" | "lowerArc" | "forwardDownArc";
  } => {
    return "type" in point;
  };

  const isLookAtPoint = (
    point: CameraPathPoint
  ): point is { pos: THREE.Vector3; lookAt: THREE.Vector3 } => {
    return "lookAt" in point;
  };

  const isRotationPoint = (
    point: CameraPathPoint
  ): point is { pos: THREE.Vector3; rotation: THREE.Euler } => {
    return "rotation" in point;
  };

  // Handle different rotation methods
  if (isTangentPoint(currentPoint) && isTangentPoint(nextPoint)) {
    // Use path tangent for rotation
    const tangent = path.getTangentAt(t);
    rotation = new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);
  } else if (isLookAtPoint(currentPoint) && isLookAtPoint(nextPoint)) {
    // Interpolate lookAt points and calculate rotation
    const currentLookAt = currentPoint.lookAt;
    const nextLookAt = nextPoint.lookAt;
    const interpolatedLookAt = currentLookAt.clone().lerp(nextLookAt, localT);

    // Calculate rotation from position to lookAt
    const direction = interpolatedLookAt.clone().sub(position).normalize();
    rotation = new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0);
  } else if (isRotationPoint(currentPoint) && isRotationPoint(nextPoint)) {
    const currentRotation = currentPoint.rotation;
    const nextRotation = nextPoint.rotation;
    rotation = new THREE.Euler(
      THREE.MathUtils.lerp(currentRotation.x, nextRotation.x, localT),
      THREE.MathUtils.lerp(currentRotation.y, nextRotation.y, localT),
      THREE.MathUtils.lerp(currentRotation.z, nextRotation.z, localT)
    );
  } else {
    // Fallback: use tangent
    const tangent = path.getTangentAt(t);
    rotation = new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);
  }

  return { position, rotation };
}
