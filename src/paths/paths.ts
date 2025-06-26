import * as THREE from "three";
import { PathPoint } from "../types/types";
import { startPosition, secondPosition } from "../config/config";
import {
  pacmanHomePathPoints,
  ghost1HomePathPoints,
  ghost2HomePathPoints,
  ghost3HomePathPoints,
  ghost4HomePathPoints,
  ghost5HomePathPoints,
  cameraPOVPathPoints,
  ghost1POVPathPoints,
  ghost2POVPathPoints,
  ghost3POVPathPoints,
  ghost4POVPathPoints,
  ghost5POVPathPoints,
} from "./pathpoints";

export const cameraHomePath = new THREE.CubicBezierCurve3(
  startPosition,
  secondPosition,
  new THREE.Vector3(0.55675, 3, 0.45175),
  new THREE.Vector3(0.55675, 0.5, 0.45175)
);

export const paths = {
  pacmanHome: createPath(pacmanHomePathPoints),
  ghost1Home: createPath(ghost1HomePathPoints),
  ghost2Home: createPath(ghost2HomePathPoints),
  ghost3Home: createPath(ghost3HomePathPoints),
  ghost4Home: createPath(ghost4HomePathPoints),
  ghost5Home: createPath(ghost5HomePathPoints),
  cameraPOV: createPath(cameraPOVPathPoints),
  ghost1POV: createPath(ghost1POVPathPoints),
  ghost2POV: createPath(ghost2POVPathPoints),
  ghost3POV: createPath(ghost3POVPathPoints),
  ghost4POV: createPath(ghost4POVPathPoints),
  ghost5POV: createPath(ghost5POVPathPoints),
};

function createPath(pathPoints: PathPoint[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.type === "straight") {
      const line = new THREE.LineCurve3(current.pos, next.pos);
      path.add(line);
    } else if (current.type === "curve") {
      let midPoint: THREE.Vector3;

      // Check if we have consecutive curves that might create an S-shape
      const hasPrevCurve = i > 0 && pathPoints[i - 1].type === "curve";
      const hasNextCurve =
        i < pathPoints.length - 2 && pathPoints[i + 1].type === "curve";

      if (hasPrevCurve || hasNextCurve) {
        // We have consecutive curves - create smoother transitions
        midPoint = createSmoothMidPoint(
          current,
          next,
          hasPrevCurve,
          hasNextCurve,
          pathPoints,
          i
        );
      } else {
        // Single curve - use original logic
        if (current.curveType === "upperArc") {
          midPoint = new THREE.Vector3(
            current.pos.x,
            current.pos.y,
            next.pos.z
          );
        } else if (current.curveType === "lowerArc") {
          midPoint = new THREE.Vector3(
            next.pos.x,
            current.pos.y,
            current.pos.z
          );
        } else if (current.curveType === "forwardDownArc") {
          midPoint = new THREE.Vector3(
            current.pos.x,
            next.pos.y,
            current.pos.z
          );
        } else {
          midPoint = new THREE.Vector3(
            current.pos.x,
            current.pos.y,
            next.pos.z
          );
        }
      }

      const curve = new THREE.QuadraticBezierCurve3(
        current.pos,
        midPoint,
        next.pos
      );
      path.add(curve);
    }
  }
  return path;
}

function createSmoothMidPoint(
  current: PathPoint,
  next: PathPoint,
  hasPrevCurve: boolean,
  hasNextCurve: boolean,
  pathPoints: PathPoint[],
  currentIndex: number
): THREE.Vector3 {
  const smoothingFactor = 0.3; // How much to stretch the curve (0 = original, 1 = very stretched)

  // Calculate the original midpoint based on curve type
  let originalMidPoint: THREE.Vector3;
  if (current.curveType === "upperArc") {
    originalMidPoint = new THREE.Vector3(
      current.pos.x,
      current.pos.y,
      next.pos.z
    );
  } else if (current.curveType === "lowerArc") {
    originalMidPoint = new THREE.Vector3(
      next.pos.x,
      current.pos.y,
      current.pos.z
    );
  } else if (current.curveType === "forwardDownArc") {
    originalMidPoint = new THREE.Vector3(
      current.pos.x,
      next.pos.y,
      current.pos.z
    );
  } else {
    originalMidPoint = new THREE.Vector3(
      current.pos.x,
      current.pos.y,
      next.pos.z
    );
  }

  // Calculate the straight line midpoint (for stretching)
  const straightMidPoint = current.pos.clone().lerp(next.pos, 0.5);

  // If we have both previous and next curves, stretch more
  if (hasPrevCurve && hasNextCurve) {
    // This is a middle curve in a sequence - stretch it significantly
    return originalMidPoint.clone().lerp(straightMidPoint, smoothingFactor * 2);
  } else if (hasPrevCurve || hasNextCurve) {
    // This is an end curve in a sequence - stretch it moderately
    return originalMidPoint.clone().lerp(straightMidPoint, smoothingFactor);
  }

  // Fallback to original
  return originalMidPoint;
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
