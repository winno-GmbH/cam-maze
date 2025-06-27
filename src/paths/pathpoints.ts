import * as THREE from "three";
import { MazePathPoint, PathPoint } from "../types/types";
import { isMobile } from "../config/config";

const mazeCenterPathPoint = new THREE.Vector3(0.45175, 0.5, 0.55675);

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
    type: "straight",
  },
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

const pacmanScrollPathPoints: PathPoint[] = [
  { pos: getPausedPathPoints().pacman },
  { pos: generateArcPathPoints().pacman },
  { pos: mazeCenterPathPoint },
];

const ghost1ScrollPathPoints: PathPoint[] = [
  { pos: getPausedPathPoints().ghost1 },
  { pos: generateArcPathPoints().ghost1 },
  { pos: mazeCenterPathPoint },
];

const ghost2ScrollPathPoints: PathPoint[] = [
  { pos: getPausedPathPoints().ghost2 },
  { pos: generateArcPathPoints().ghost2 },
  { pos: mazeCenterPathPoint },
];

const ghost3ScrollPathPoints: PathPoint[] = [
  { pos: getPausedPathPoints().ghost3 },
  { pos: generateArcPathPoints().ghost3 },
  { pos: mazeCenterPathPoint },
];

const ghost4ScrollPathPoints: PathPoint[] = [
  { pos: getPausedPathPoints().ghost4 },
  { pos: generateArcPathPoints().ghost4 },
  { pos: mazeCenterPathPoint },
];

const ghost5ScrollPathPoints: PathPoint[] = [
  { pos: getPausedPathPoints().ghost5 },
  { pos: generateArcPathPoints().ghost5 },
  { pos: mazeCenterPathPoint },
];

const cameraPOVPathPoints: MazePathPoint[] = [
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
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.85375), type: "straight" },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.15525),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.9085, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(0.808, 0.55, 1.2055),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.15525), type: "straight" },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.7075, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.205, 0.55, 1.0045),
    type: "curve",
    curveType: "lowerArc",
  },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    type: "curve",
    curveType: "upperArc",
  },
  { pos: new THREE.Vector3(0.205, 0.55, 1.2055), type: "straight" },
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
  { pos: new THREE.Vector3(-0.44825, 1, 2.0095), type: "straight" },
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

function getPausedPathPoints(): Record<string, THREE.Vector3> {
  const pausedPathPoints: Record<string, THREE.Vector3> = {};
  return pausedPathPoints;
}

function generateArcPathPoints(): Record<string, THREE.Vector3> {
  const pausedPathPoints = getPausedPathPoints();
  const arcPathPoints: Record<string, THREE.Vector3> = {};

  Object.entries(pausedPathPoints).forEach(([key, pausedPos]) => {
    arcPathPoints[key] = new THREE.Vector3(
      (pausedPos.x + mazeCenterPathPoint.x) / 2,
      1,
      (pausedPos.z + mazeCenterPathPoint.z) / 2
    );
  });

  return arcPathPoints;
}

export const pathPoints = {
  pacmanHome: pacmanHomePathPoints,
  ghost1Home: ghost1HomePathPoints,
  ghost2Home: ghost2HomePathPoints,
  ghost3Home: ghost3HomePathPoints,
  ghost4Home: ghost4HomePathPoints,
  ghost5Home: ghost5HomePathPoints,
  pacmanHomeScroll: pacmanScrollPathPoints,
  ghost1HomeScroll: ghost1ScrollPathPoints,
  ghost2HomeScroll: ghost2ScrollPathPoints,
  ghost3HomeScroll: ghost3ScrollPathPoints,
  ghost4HomeScroll: ghost4ScrollPathPoints,
  ghost5HomeScroll: ghost5ScrollPathPoints,
  cameraPOV: cameraPOVPathPoints,
  ghost1POV: ghost1POVPathPoints,
  ghost2POV: ghost2POVPathPoints,
  ghost3POV: ghost3POVPathPoints,
  ghost4POV: ghost4POVPathPoints,
  ghost5POV: ghost5POVPathPoints,
};

export const cameraScrollPathPoints = {
  start: startPosition,
  second: secondPosition,
  highPoint: new THREE.Vector3(0.55675, 3, 0.45175),
  end: mazeCenterPathPoint,
};

export const cameraPositions = {
  startPosition,
  secondPosition,
  lookAtPosition,
};
