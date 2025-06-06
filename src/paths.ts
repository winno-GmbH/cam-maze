import * as THREE from 'three';
import { PathPoint, PathData, PathMapping } from './types';
import { CAMERA_POSITIONS, isMobile } from './config';

// Path Creation Utility
export function createPath(pathPoints: PathPoint[]): THREE.CurvePath<THREE.Vector3> {
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
      const curve = new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos);
      path.add(curve);
    }
  }
  return path;
}

// Path Points Definitions (shortened as requested)
const pacmanHomePathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
];

const ghost1HomePathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.502), type: "straight" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.004, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.0965, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.502), type: "straight" },
];

const ghost2HomePathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.004, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.502), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.3055, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(1.15975, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, -0.101), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.3055, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.0965, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
];

const ghost3HomePathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(0.808, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, -0.101), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.904), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.004, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.808, 0.55, 0.8035), type: "curve", curveType: "upperArc" },
];

const ghost4HomePathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.0005), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
];

const ghost5HomePathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(0.45625, 0.55, -0.04975), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.0005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.3055, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(1.15975, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, -0.101), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, -0.101), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.04975), type: "curve", curveType: "lowerArc" },
];

const cameraPOVPathPoints: PathPoint[] = [
  {
    pos: new THREE.Vector3(0.55675, 0.5, 0.45175),
    type: "curve",
    curveType: "forwardDownArc",
  },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.6025), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.607, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.85375), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.9085, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.808, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.05475), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.15525), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.205, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.44825, 1, 2.0095), type: "straight" },
];

const ghost1POVPathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "straight" },
];

const ghost2POVPathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(1.009, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.05475), type: "straight" },
];

const ghost3POVPathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.95425), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.0045), type: "straight" },
];

const ghost4POVPathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.3055, 0.55, 1.0045), type: "straight" },
];

const ghost5POVPathPoints: PathPoint[] = [
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "straight" },
  { pos: new THREE.Vector3(0.55675, 0.55, 1.25575), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.2055), type: "straight" },
];

// Camera Home Path - ensure it uses the correct positions based on device
const cameraStartPosition = isMobile ? CAMERA_POSITIONS.startMobile : CAMERA_POSITIONS.startDesktop;
const cameraSecondPosition = isMobile ? CAMERA_POSITIONS.secondMobile : CAMERA_POSITIONS.secondDesktop;

export const cameraHomePath = new THREE.CubicBezierCurve3(
  cameraStartPosition,
  cameraSecondPosition,
  new THREE.Vector3(0.55675, 3, 0.45175),
  new THREE.Vector3(0.55675, 0.5, 0.45175)
);

// Path Data Configuration
export const pathsData: { [key: string]: PathData } = {
  pacmanHomePath: {
    points: pacmanHomePathPoints,
    color: 0xffff00,
  },
  ghost1HomePath: {
    points: ghost1HomePathPoints,
    color: 0xff0000,
  },
  ghost2HomePath: {
    points: ghost2HomePathPoints,
    color: 0xffa500,
  },
  ghost3HomePath: {
    points: ghost3HomePathPoints,
    color: 0xff69b4,
  },
  ghost4HomePath: {
    points: ghost4HomePathPoints,
    color: 0x32cd32,
  },
  ghost5HomePath: {
    points: ghost5HomePathPoints,
    color: 0xffdab9,
  },
  cameraPOVPath: {
    points: cameraPOVPathPoints,
    color: 0xffffff,
  },
  ghost1POVPath: {
    points: ghost1POVPathPoints,
    color: 0xff0000,
  },
  ghost2POVPath: {
    points: ghost2POVPathPoints,
    color: 0xffa500,
  },
  ghost3POVPath: {
    points: ghost3POVPathPoints,
    color: 0xff69b4,
  },
  ghost4POVPath: {
    points: ghost4POVPathPoints,
    color: 0x32cd32,
  },
  ghost5POVPath: {
    points: ghost5POVPathPoints,
    color: 0xffdab9,
  },
};

// Path Mapping Functions
export function getPathsForSection(section: string): PathMapping {
  const mapping: PathMapping = {};

  if (section === "home") {
    mapping.pacman = "pacmanHomePath";
    mapping.ghost1 = "ghost1HomePath";
    mapping.ghost2 = "ghost2HomePath";
    mapping.ghost3 = "ghost3HomePath";
    mapping.ghost4 = "ghost4HomePath";
    mapping.ghost5 = "ghost5HomePath";
  } else if (section === "pov") {
    mapping.pacman = "cameraPOVPath";
    mapping.ghost1 = "ghost1POVPath";
    mapping.ghost2 = "ghost2POVPath";
    mapping.ghost3 = "ghost3POVPath";
    mapping.ghost4 = "ghost4POVPath";
    mapping.ghost5 = "ghost5POVPath";
  }
  return mapping;
}

// Create all paths
export const paths: { [key: string]: THREE.CurvePath<THREE.Vector3> } = {};

// Initialize paths
Object.entries(pathsData).forEach(([key, data]) => {
  paths[key] = createPath(data.points);
});