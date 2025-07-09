import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import { isMobile } from "../config/config";

const mazeCenterPathPoint = new THREE.Vector3(0.575, 0.5, 0.425);

const cameraStartPoints = {
  startMobile: new THREE.Vector3(0.5, 2.5, 2.5),
  startDesktop: new THREE.Vector3(-2, 2.5, 2),
  secondMobile: new THREE.Vector3(0.5, 2.5, 2),
  secondDesktop: new THREE.Vector3(-1.5, 3, 2),
  mobileLookAt: new THREE.Vector3(0.5, 0.5, -1.5),
  desktopLookAt: new THREE.Vector3(-1.25, 0.5, 0.25),
};

const startPosition = isMobile
  ? cameraStartPoints.startMobile
  : cameraStartPoints.startDesktop;
const secondPosition = isMobile
  ? cameraStartPoints.secondMobile
  : cameraStartPoints.secondDesktop;
const lookAtPosition = isMobile
  ? cameraStartPoints.mobileLookAt
  : cameraStartPoints.desktopLookAt;

const lookAtIntermediate1 = lookAtPosition
  .clone()
  .lerp(mazeCenterPathPoint, 1 / 3);
const lookAtIntermediate2 = lookAtPosition
  .clone()
  .lerp(mazeCenterPathPoint, 2 / 3);

const pacmanHomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, -0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.398, 0.55, -0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.4015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.502),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.6025),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.398, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.34775, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.0045),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
];

const ghost1HomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, -0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.15975, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.26025, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.502),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.6025),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.004, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.0965, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
];

const ghost2HomePathPoints: MazePathPoint[] = [
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.004, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.6025),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.502),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.4015),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.502), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.3055, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(1.15975, 0.55, -0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, -0.15125),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, -0.101),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.3055, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.0965, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
];

const ghost3HomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.85825, 0.55, 0.75325), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, -0.15125),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, -0.101),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.15125),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, -0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.26025, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.15975, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.009, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.904), type: "straight" },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.85825, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.6025),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.004, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.808, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.75325), type: "straight" },
];

const ghost4HomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.398, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.398, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.4015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.05925, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.46125, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.26025, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.26025, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.15975, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
];

const ghost5HomePathPoints: MazePathPoint[] = [
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.04975),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.398, 0.55, 0.0005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.301),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.4015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.502),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.6025),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.3055, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.85825, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.904),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.105),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(1.15975, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(1.05925, 0.55, -0.101), type: "straight" },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.1),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.2005),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, -0.2015),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, -0.15125),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, -0.101),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.04975),
    type: "curve",
    curveType: "lowerArc",
  },
];

const cameraHomeScrollPathPoints: CameraPathPoint[] = [
  { pos: startPosition, lookAt: lookAtPosition },
  { pos: secondPosition, lookAt: lookAtIntermediate1 },
  { pos: new THREE.Vector3(0.55675, 3, 0.45175), lookAt: lookAtIntermediate2 },
  { pos: mazeCenterPathPoint, lookAt: mazeCenterPathPoint },
];

const cameraPOVPathPoints: CameraPathPoint[] = [
  {
    pos: new THREE.Vector3(0.55675, -0.5, 0.45175),
    type: "curve",
    curveType: "forwardDownArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 0.6025),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.607, 0.55, 0.703),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.85375),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.15525),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.9085, 0.55, 1.2055),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.808, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.15525),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.7075, 0.55, 1.0045),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.205, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.05475),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.205, 0.55, 1.2055),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.5065, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 1.306),
    type: "curve",
    curveType: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 1, 2.0095),
    type: "straight",
  },
];

const ghost1POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.75325),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "straight" },
];

const ghost2POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.009, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.05475), type: "straight" },
];

const ghost3POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.95425),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.406, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.0045), type: "straight" },
];

const ghost4POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.05475),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.3055, 0.55, 1.0045), type: "straight" },
];

const ghost5POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "straight" },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 1.25575),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.2055), type: "straight" },
];

export const povTriggerPositions = {
  ghost1: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    camTextPos: new THREE.Vector3(0.75775, 0.55, 0.8035),
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
  },
  ghost2: {
    triggerPos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    ghostTextPos: new THREE.Vector3(0.95875, 0.55, 0.85375),
    camTextPos: new THREE.Vector3(0.95875, 0.55, 0.904),
    endPosition: new THREE.Vector3(0.95875, 0.55, 1.0045),
  },
  ghost3: {
    triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
  },
  ghost4: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    ghostTextPos: new THREE.Vector3(0.5065, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.45625, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
  },
  ghost5: {
    triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    ghostTextPos: new THREE.Vector3(0.205, 0.55, 1.2055),
    camTextPos: new THREE.Vector3(0.25525, 0.55, 1.2055),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
  },
};

export function getStartPosition() {
  return startPosition;
}

export function getSecondPosition() {
  return secondPosition;
}

export function getLookAtPosition() {
  return lookAtPosition;
}

export const homePaths = {
  pacman: pacmanHomePathPoints,
  ghost1: ghost1HomePathPoints,
  ghost2: ghost2HomePathPoints,
  ghost3: ghost3HomePathPoints,
  ghost4: ghost4HomePathPoints,
  ghost5: ghost5HomePathPoints,
} as const;

export const povPaths = {
  camera: cameraPOVPathPoints,
  ghost1: ghost1POVPathPoints,
  ghost2: ghost2POVPathPoints,
  ghost3: ghost3POVPathPoints,
  ghost4: ghost4POVPathPoints,
  ghost5: ghost5POVPathPoints,
} as const;

export function createHomeScrollPathPoints(
  pausedPositions: Record<string, THREE.Vector3>
): Record<string, PathPoint[]> {
  const scrollPaths: Record<string, PathPoint[]> = {};

  Object.entries(pausedPositions).forEach(([key, pausedPos]) => {
    const arcPoint = new THREE.Vector3(
      (pausedPos.x + mazeCenterPathPoint.x) / 2,
      2,
      (pausedPos.z + mazeCenterPathPoint.z) / 2
    );

    scrollPaths[key] = [
      { pos: pausedPos.clone() },
      { pos: arcPoint },
      { pos: mazeCenterPathPoint },
    ];
  });

  return scrollPaths;
}

export function getCameraHomeScrollPathPoints(): CameraPathPoint[] {
  return cameraHomeScrollPathPoints;
}
