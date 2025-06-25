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
      if (current.curveType === "upperArc") {
        midPoint = new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
      } else if (current.curveType === "lowerArc") {
        midPoint = new THREE.Vector3(next.pos.x, current.pos.y, current.pos.z);
      } else if (current.curveType === "forwardDownArc") {
        midPoint = new THREE.Vector3(current.pos.x, next.pos.y, current.pos.z);
      } else {
        midPoint = new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
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
