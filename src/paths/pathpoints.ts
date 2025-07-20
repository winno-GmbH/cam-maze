import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import { isMobile } from "../config/config";

// TODO - add curveCheckPoints to all curves where needed

const objectHomeScrollEndPathPoint = new THREE.Vector3(0.55675, 0.35, 0.45175);

const cameraPathPointsConfig = {
  startMobile: new THREE.Vector3(0.5, 2.5, 2.5),
  startDesktop: new THREE.Vector3(-2, 2.5, 2),
  secondMobile: new THREE.Vector3(0.5, 2.5, 2),
  secondDesktop: new THREE.Vector3(-1.5, 3, 0.75),
  mobileLookAt: new THREE.Vector3(0.5, 0.5, -1.5),
  desktopLookAt: new THREE.Vector3(-1.25, 0.5, 0.25),
  cameraLookAtSecondDesktop: new THREE.Vector3(-0.75, 0.5, -0.75),
  cameraLookAtSecondMobile: new THREE.Vector3(-0.75, 0.5, -0.75), // TODO

  cameraHomeScrollEndLookAt: new THREE.Vector3(0.55675, -5, 0.35),
  thirdPosition: new THREE.Vector3(0.55675, 3, 0.45175),

  cameraHomeScrollEndPathPoint: new THREE.Vector3(0.55675, 0.5, 0.45175),
};

// determine positions and look at - changed if is mobile
const startPosition = isMobile
  ? cameraPathPointsConfig.startMobile
  : cameraPathPointsConfig.startDesktop;
const secondPosition = isMobile
  ? cameraPathPointsConfig.secondMobile
  : cameraPathPointsConfig.secondDesktop;
const lookAtPosition = isMobile
  ? cameraPathPointsConfig.mobileLookAt
  : cameraPathPointsConfig.desktopLookAt;
const cameraLookAtSecondPosition = isMobile
  ? cameraPathPointsConfig.cameraLookAtSecondMobile
  : cameraPathPointsConfig.cameraLookAtSecondDesktop;

const thirdPosition = cameraPathPointsConfig.thirdPosition;
const cameraHomeScrollEndLookAt =
  cameraPathPointsConfig.cameraHomeScrollEndLookAt;
const cameraHomeScrollEndPathPoint =
  cameraPathPointsConfig.cameraHomeScrollEndPathPoint;

const pacmanHomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, -0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(-0.44825, 0.55, -0.05),
      new THREE.Vector3(-0.398, 0.55, -0.0005),
      new THREE.Vector3(-0.34775, 0.55, 0.05),
    ],
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.4015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.502),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.6025),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(-0.34775, 0.55, 0.95),
      new THREE.Vector3(-0.398, 0.55, 1.0045),
      new THREE.Vector3(-0.44825, 0.55, 1.05),
    ],
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.34775, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.0045),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(0.75775, 0.55, 0.854),
      new THREE.Vector3(0.7075, 0.55, 0.8035),
      new THREE.Vector3(0.65725, 0.55, 0.75325),
      new THREE.Vector3(0.55675, 0.55, 0.703),
      new THREE.Vector3(0.45625, 0.55, 0.75325),
      new THREE.Vector3(0.35575, 0.55, 0.8035),
      new THREE.Vector3(0.25525, 0.55, 0.753),
    ],
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
];

const ghost1HomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, -0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [
      new THREE.Vector3(0.40575, 0.55, 0.8035),
      new THREE.Vector3(0.45625, 0.55, 0.75325),
      new THREE.Vector3(0.55675, 0.55, 0.703),
      new THREE.Vector3(0.65725, 0.55, 0.75325),
      new THREE.Vector3(0.70775, 0.55, 0.8035),
    ],
  },

  { pos: new THREE.Vector3(0.75775, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [
      new THREE.Vector3(1.00875, 0.55, 0.8035),
      new THREE.Vector3(1.05925, 0.55, 0.75325),
      new THREE.Vector3(1.15975, 0.55, 0.703),
      new THREE.Vector3(1.26025, 0.55, 0.75325),
      new THREE.Vector3(1.31075, 0.55, 0.8035),
    ],
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.502),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.6025),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [new THREE.Vector3(0.004, 0.55, 0.8035)],
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.0965, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
];

const ghost2HomePathPoints: MazePathPoint[] = [
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [new THREE.Vector3(0.004, 0.55, 0.8035)],
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.6025),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.502),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.4015),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.502), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(0.3055, 0.55, 0.8035),
      new THREE.Vector3(0.35575, 0.55, 0.904),
    ],
  },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(1.15975, 0.55, -0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [new THREE.Vector3(0.65725, 0.55, -0.15125)],
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, -0.101),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [new THREE.Vector3(0.3055, 0.55, 0.8035)],
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(-0.0965, 0.55, 1.0045),
      new THREE.Vector3(-0.04625, 0.55, 0.904),
    ],
  },
];

const ghost3HomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.85825, 0.55, 0.75325), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [
      new THREE.Vector3(0.65725, 0.55, -0.15125),
      new THREE.Vector3(0.55675, 0.55, -0.101),
      new THREE.Vector3(0.45625, 0.55, -0.15125),
    ],
  },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, -0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.301), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [
      new THREE.Vector3(1.26025, 0.55, 0.75325),
      new THREE.Vector3(1.15975, 0.55, 0.703),
      new THREE.Vector3(1.05925, 0.55, 0.75325),
      new THREE.Vector3(1.009, 0.55, 0.8035),
    ],
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.904), type: "straight" },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.85825, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(0.7075, 0.55, 0.8035),
      new THREE.Vector3(0.65725, 0.55, 0.75325),
      new THREE.Vector3(0.45625, 0.55, 0.75325),
    ],
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.6025),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [new THREE.Vector3(0.004, 0.55, 0.8035)],
  },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.808, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.75325), type: "straight" },
];

const ghost4HomePathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.8035), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(-0.398, 0.55, 1.0045),
      new THREE.Vector3(-0.34775, 0.55, 0.904),
      new THREE.Vector3(-0.398, 0.55, 0.8035),
    ],
  },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.4015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.05925, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.46125, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(1.26025, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [new THREE.Vector3(1.26025, 0.55, 0.75325)],
  },
  {
    pos: new THREE.Vector3(1.15975, 0.55, 0.703),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
];

const ghost5HomePathPoints: MazePathPoint[] = [
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.04975),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.0005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.44825, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(-0.398, 0.55, 0.0005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.34775, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  {
    pos: new THREE.Vector3(-0.04625, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.05425, 0.55, 0.301),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  {
    pos: new THREE.Vector3(-0.14675, 0.55, 0.4015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(-0.24725, 0.55, 0.502),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 0.6025),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.25525, 0.55, 0.703),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.3055, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  {
    pos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.85825, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.904),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.105),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.36075, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(1.46125, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.2015), type: "straight" },
  {
    pos: new THREE.Vector3(1.15975, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(1.05925, 0.55, -0.101), type: "straight" },
  {
    pos: new THREE.Vector3(1.05925, 0.55, 0.1),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.2005),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  {
    pos: new THREE.Vector3(0.85825, 0.55, -0.101),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, -0.2015),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.65725, 0.55, -0.15125),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, -0.101),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.45625, 0.55, -0.04975),
    type: "curve",
    arc: "lowerArc",
  },
];

const cameraHomeScrollPathPoints: CameraPathPoint[] = [
  //{ pos: startPosition, lookAt: lookAtPosition },
  { pos: thirdPosition, lookAt: cameraHomeScrollEndLookAt },
  { pos: secondPosition, lookAt: cameraLookAtSecondPosition },
  { pos: thirdPosition, lookAt: cameraHomeScrollEndLookAt },
  { pos: cameraHomeScrollEndPathPoint, lookAt: cameraHomeScrollEndLookAt },
];

const cameraPOVPathPoints: MazePathPoint[] = [
  {
    pos: new THREE.Vector3(0.55675, 0.5, 0.45175),
    type: "curve",
    arc: "forwardDownArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 0.6025),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(0.55675, 0.55, 0.6525),
      new THREE.Vector3(0.607, 0.55, 0.703),
      new THREE.Vector3(0.65725, 0.55, 0.75325),
      new THREE.Vector3(0.7075, 0.55, 0.8035),
    ],
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 0.8035),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 0.85375),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.95875, 0.55, 1.15525),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.9085, 0.55, 1.2055),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.808, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.15525),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.7075, 0.55, 1.0045),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.205, 0.55, 1.0045),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.05475),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: new THREE.Vector3(0.205, 0.55, 1.2055),
    type: "straight",
  },
  {
    pos: new THREE.Vector3(0.5065, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 1.306),
    type: "curve",
    arc: "upperArc",
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
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "straight" },
];

const ghost2POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  {
    pos: new THREE.Vector3(1.009, 0.55, 1.2055),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.05475), type: "straight" },
];

const ghost3POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "straight" },
  {
    pos: new THREE.Vector3(0.35575, 0.55, 0.95425),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.406, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.0045), type: "straight" },
];

const ghost4POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "straight" },
  {
    pos: new THREE.Vector3(0.15475, 0.55, 1.05475),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.3055, 0.55, 1.0045), type: "straight" },
];

const ghost5POVPathPoints: MazePathPoint[] = [
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "straight" },
  {
    pos: new THREE.Vector3(0.55675, 0.55, 1.25575),
    type: "curve",
    arc: "upperArc",
  },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.2055), type: "straight" },
];

// start position, end position, ghost fade: 10, 20, cam fade: 50, 60, text start fade out: 90

export const povTriggerPositions = {
  ghost1: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    ghostStartFadeIn: new THREE.Vector3(0.7075, 0.55, 0.8035),
    ghostEndFadeIn: new THREE.Vector3(0.725, 0.55, 0.8035),
    ghostStartFadeOut: new THREE.Vector3(0.75, 0.55, 0.8035),
    camStartFadeIn: new THREE.Vector3(0.75775, 0.55, 0.8035),
    camEndFadeIn: new THREE.Vector3(0.775, 0.55, 0.8035),
    camStartFadeOut: new THREE.Vector3(0.84, 0.55, 0.8035),
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
  },
  ghost2: {
    triggerPos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    ghostStartFadeIn: new THREE.Vector3(0.95875, 0.55, 0.85375),
    ghostEndFadeIn: new THREE.Vector3(0.95875, 0.55, 0.875),
    ghostStartFadeOut: new THREE.Vector3(0.95875, 0.55, 0.89),
    camStartFadeIn: new THREE.Vector3(0.95875, 0.55, 0.904),
    camEndFadeIn: new THREE.Vector3(0.95875, 0.55, 0.93),
    camStartFadeOut: new THREE.Vector3(0.95875, 0.55, 0.9975),
    endPosition: new THREE.Vector3(0.95875, 0.55, 1.0045),
  },
  // ghost3: {
  //   triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
  //   ghostTextPos: new THREE.Vector3(0.7075, 0.55, 1.0045),
  //   camTextPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
  //   endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
  // },
  // ghost4: {
  //   triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
  //   ghostTextPos: new THREE.Vector3(0.5065, 0.55, 1.0045),
  //   camTextPos: new THREE.Vector3(0.45625, 0.55, 1.0045),
  //   endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
  // },
  // ghost5: {
  //   triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
  //   ghostTextPos: new THREE.Vector3(0.205, 0.55, 1.2055),
  //   camTextPos: new THREE.Vector3(0.25525, 0.55, 1.2055),
  //   endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
  // },
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
      pausedPos.x * (1 / 4) + objectHomeScrollEndPathPoint.x * (3 / 4),
      1.5,
      pausedPos.z * (1 / 4) + objectHomeScrollEndPathPoint.z * (3 / 4)
    );

    scrollPaths[key] = [
      { pos: pausedPos.clone() },
      { pos: arcPoint },
      { pos: objectHomeScrollEndPathPoint },
    ];
  });

  return scrollPaths;
}

export function getCameraHomeScrollPathPoints(): CameraPathPoint[] {
  return cameraHomeScrollPathPoints;
}
