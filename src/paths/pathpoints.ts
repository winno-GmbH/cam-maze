import * as THREE from "three";
import { MazePathPoint, PathPoint, CameraPathPoint } from "../types/types";
import { isMobile } from "../config/config";
import { getCoord, X, Y, Z } from "./coordinates";

// TODO - add curveCheckPoints to all curves where needed

export const objectHomeScrollEndPathPoint = new THREE.Vector3(
  0.55675,
  0.35,
  0.45175
);

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
  { pos: getCoord("8", "9"), type: "straight" },
  {
    pos: getCoord("8", "6"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("9", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("10", "4"), type: "straight" },
  {
    pos: getCoord("10", "2"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("9", "1"), type: "straight" },
  {
    pos: getCoord("7", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("5", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("4", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("3", "1"),
    type: "straight",
    curveCheckPoints: [
      getCoord("2", "1"),
      getCoord("1", "2"),
      getCoord("1", "2.5"),
      getCoord("1.5", "3"),
      getCoord("2", "3.5"),
    ],
  },
  {
    pos: getCoord("2", "4"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("3", "5"), type: "straight" },
  {
    pos: getCoord("5", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "6"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("5", "7"), type: "straight" },
  {
    pos: getCoord("4", "7"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("3", "8"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("4", "9"), type: "straight" },
  {
    pos: getCoord("5", "9"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "10"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("5", "11"),
    type: "straight",
    curveCheckPoints: [
      getCoord("3", "11"),
      getCoord("2", "12"),
      getCoord("1.5", "13"),
      getCoord("1", "14"),
      getCoord("2", "15"),
      getCoord("3", "15"),
      getCoord("4", "14"),
      getCoord("5", "13"),
    ],
  },
  {
    pos: getCoord("6", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("7", "14"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("6", "15"), type: "straight" },
  {
    pos: getCoord("5", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("4", "14"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("5", "13"),
    type: "straight",
    curveCheckPoints: [
      getCoord("12", "13"),
      getCoord("13", "12"),
      getCoord("12.5", "11"),
      getCoord("12", "10.5"),
      getCoord("11", "10"),
      getCoord("10", "10.5"),
      getCoord("9", "11"),
      getCoord("8", "10"),
      getCoord("8", "9.5"),
    ],
  },
  {
    pos: getCoord("8", "9"),
    type: "straight",
  },
];

const ghost1HomePathPoints: MazePathPoint[] = [
  { pos: getCoord("1", "10"), type: "straight" },
  {
    pos: getCoord("1", "6"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("2", "5"), type: "straight" },
  {
    pos: getCoord("3", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("4", "4"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("5", "3"), type: "straight" },
  {
    pos: getCoord("9", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("10", "4"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("9", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("8", "6"),
    type: "straight",
    curveCheckPoints: [
      getCoord("8", "10"),
      getCoord("9", "11"),
      getCoord("10", "10.5"),
      getCoord("11", "10"),
      getCoord("12", "10.5"),
      getCoord("13", "11"),
      getCoord("15", "11"),
      getCoord("16", "10.5"),
      getCoord("17", "10"),
      getCoord("18", "10.5"),
      getCoord("19", "11"),
      getCoord("20", "10"),
    ],
  },
  {
    pos: getCoord("20", "6"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("19", "5"), type: "straight" },
  {
    pos: getCoord("9", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("8", "6"),
    type: "straight",
    curveCheckPoints: [
      getCoord("8", "8"),
      getCoord("7", "9"),
      getCoord("6", "10"),
      getCoord("5.5", "11"),
      getCoord("5", "12"),
      getCoord("6", "13"),
      getCoord("7", "14"),
      getCoord("6", "15"),
      getCoord("5", "15"),
      getCoord("4", "14"),
      getCoord("4.5", "13"),
      getCoord("5", "12"),
      getCoord("4", "11"),
    ],
  },
  { pos: getCoord("1", "10"), type: "straight" },
];

const ghost2HomePathPoints: MazePathPoint[] = [
  {
    pos: getCoord("5", "12"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [getCoord("5.5", "11")],
  },
  {
    pos: getCoord("6", "10"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("5", "9"), type: "straight" },
  {
    pos: getCoord("4", "9"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("3", "8"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("4", "7"), type: "straight" },
  {
    pos: getCoord("7", "7"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("8", "8"), type: "straight" },
  {
    pos: getCoord("8", "10"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [getCoord("8.5", "11"), getCoord("9", "12")],
  },
  { pos: getCoord("10", "13"), type: "straight" },
  {
    pos: getCoord("12", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("13", "14"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("14", "15"), type: "straight" },
  {
    pos: getCoord("19", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("20", "14"), type: "straight" },
  {
    pos: getCoord("20", "4"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("19", "3"), type: "straight" },
  {
    pos: getCoord("17", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("16", "4"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("15", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("14", "4"), type: "straight" },
  {
    pos: getCoord("14", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("13", "1"),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [getCoord("12", "1.5")],
  },
  {
    pos: getCoord("11", "2"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("10", "3"), type: "straight" },
  {
    pos: getCoord("10", "4"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("9", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("8", "6"), type: "straight" },
  {
    pos: getCoord("8", "10"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [getCoord("8.5", "11")],
  },
  {
    pos: getCoord("9", "12"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("8", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("7", "14"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("6", "15"), type: "straight" },
  {
    pos: getCoord("5", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("4", "14"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [getCoord("4.5", "13"), getCoord("5", "12")],
  },
];

const ghost3HomePathPoints: MazePathPoint[] = [
  { pos: getCoord("14", "10.5"), type: "straight" },
  {
    pos: getCoord("14", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("13", "1"),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [
      getCoord("12", "1.5"),
      getCoord("11", "2"),
      getCoord("10", "1.5"),
    ],
  },
  { pos: getCoord("9", "1"), type: "straight" },
  {
    pos: getCoord("7", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "2"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("7", "3"), type: "straight" },
  {
    pos: getCoord("9", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("10", "4"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("11", "5"), type: "straight" },
  {
    pos: getCoord("19", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("20", "6"), type: "straight" },
  {
    pos: getCoord("20", "10"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("19", "11"),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [
      getCoord("18", "10.5"),
      getCoord("17", "10"),
      getCoord("16", "10.5"),
      getCoord("15.5", "11"),
    ],
  },
  { pos: getCoord("15", "12"), type: "straight" },
  {
    pos: getCoord("15", "14"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("14", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("13", "14"), type: "straight" },
  {
    pos: getCoord("13", "12"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      getCoord("12.5", "11"),
      getCoord("12", "10.5"),
      getCoord("10", "10.5"),
    ],
  },
  {
    pos: getCoord("9", "11"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("8", "10"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("7", "9"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "10"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [getCoord("5.5", "11")],
  },
  {
    pos: getCoord("5", "12"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("6", "13"), type: "straight" },
  {
    pos: getCoord("12", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("13", "12"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("13.5", "11"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("14", "10.5"), type: "straight" },
];

const ghost4HomePathPoints: MazePathPoint[] = [
  { pos: getCoord("16", "7"), type: "straight" },
  {
    pos: getCoord("16", "10"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("15", "11"), type: "straight" },
  {
    pos: getCoord("14", "11"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("13", "12"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("12", "13"), type: "straight" },
  {
    pos: getCoord("8", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("7", "14"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("6", "15"), type: "straight" },
  {
    pos: getCoord("2", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("1", "14"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      getCoord("1.5", "13"),
      getCoord("2", "12"),
      getCoord("1.5", "11"),
    ],
  },
  { pos: getCoord("1", "10"), type: "straight" },
  {
    pos: getCoord("1", "6"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("2", "5"), type: "straight" },
  {
    pos: getCoord("5", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "6"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("7", "7"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("8", "6"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("9", "5"), type: "straight" },
  {
    pos: getCoord("13", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("14", "4"), type: "straight" },
  {
    pos: getCoord("14", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("15", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("16", "2"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("17", "3"), type: "straight" },
  {
    pos: getCoord("19", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("20", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("19", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("18", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("19", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("20", "4"), type: "straight" },
  {
    pos: getCoord("20", "10"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("19", "11"),
    type: "curve",
    arc: "lowerArc",
    curveCheckPoints: [getCoord("18", "10.5")],
  },
  {
    pos: getCoord("17", "10"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("16", "9"), type: "straight" },
  { pos: getCoord("16", "7"), type: "straight" },
];

const ghost5HomePathPoints: MazePathPoint[] = [
  {
    pos: getCoord("10", "3.5"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("9", "3"), type: "straight" },
  {
    pos: getCoord("5", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("4", "2"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("3", "1"), type: "straight" },
  {
    pos: getCoord("2", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("1", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("1.5", "3"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("2", "4"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("3", "5"), type: "straight" },
  {
    pos: getCoord("5", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("6", "6"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("5", "7"), type: "straight" },
  {
    pos: getCoord("4", "7"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("3", "8"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("4", "9"), type: "straight" },
  {
    pos: getCoord("7", "9"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("8", "10"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("8.5", "11"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("9", "12"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("10", "13"), type: "straight" },
  {
    pos: getCoord("12", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("13", "12"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("14", "11"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("15", "12"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("15", "14"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("16", "15"), type: "straight" },
  {
    pos: getCoord("19", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("20", "14"), type: "straight" },
  {
    pos: getCoord("20", "2"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("19", "1"), type: "straight" },
  {
    pos: getCoord("17", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("16", "2"), type: "straight" },
  {
    pos: getCoord("16", "4"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("15", "5"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("14", "4"), type: "straight" },
  {
    pos: getCoord("14", "2"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("13", "1"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("12", "1.5"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("11", "2"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("10", "3.5"),
    type: "curve",
    arc: "lowerArc",
  },
];

const cameraHomeScrollPathPoints: CameraPathPoint[] = [
  { pos: startPosition, lookAt: lookAtPosition },
  // { pos: thirdPosition, lookAt: cameraHomeScrollEndLookAt },
  { pos: secondPosition, lookAt: cameraLookAtSecondPosition },
  { pos: thirdPosition, lookAt: cameraHomeScrollEndLookAt },
  { pos: cameraHomeScrollEndPathPoint, lookAt: cameraHomeScrollEndLookAt },
];

const cameraPOVPathPoints: MazePathPoint[] = [
  {
    pos: new THREE.Vector3(X["11"], 0.40625, Z["7.5"]),
    type: "straight",
    lookAtSequence: [
      new THREE.Vector3(X["11"], 0.2, Z["8"]), // Look forward first
      new THREE.Vector3(X["11"], 1.2, Z["16"]), // Look up
      new THREE.Vector3(X["11"], 0.55, Z["16"]), // Look forward again
    ],
  },
  {
    pos: getCoord("11", "7.5"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("11", "9"),
    type: "curve",
    arc: "upperArc",
    curveCheckPoints: [
      new THREE.Vector3(X["11"], Y, 0.6525),
      getCoord("11.5", "10"),
      getCoord("12", "10.5"),
      getCoord("12.5", "11"),
    ],
  },
  {
    pos: getCoord("13", "11"),
    type: "straight",
  },
  {
    pos: getCoord("14.5", "11"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("15", "11.5"),
    type: "straight",
  },
  {
    pos: getCoord("15", "14.5"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("14.5", "15"),
    type: "straight",
  },
  {
    pos: getCoord("13.5", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("13", "14.5"),
    type: "straight",
  },
  {
    pos: getCoord("13", "13.5"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("12.5", "13"),
    type: "straight",
  },
  {
    pos: getCoord("7.5", "13"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("7", "13.5"),
    type: "straight",
  },
  {
    pos: getCoord("7", "14.5"),
    type: "curve",
    arc: "upperArc",
  },
  {
    pos: getCoord("7.5", "15"),
    type: "straight",
  },
  {
    pos: getCoord("10.5", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  {
    pos: getCoord("11", "16"),
    type: "curve",
    arc: "upperArc",
  },
];

const ghost1POVPathPoints: MazePathPoint[] = [
  { pos: getCoord("16", "10"), type: "straight" },
  {
    pos: getCoord("16", "10.5"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("15.5", "11"), type: "straight" },
  { pos: getCoord("14.5", "11"), type: "straight" },
];

const ghost2POVPathPoints: MazePathPoint[] = [
  { pos: getCoord("16", "15"), type: "straight" },
  {
    pos: getCoord("15.5", "15"),
    type: "curve",
    arc: "lowerArc",
  },
  { pos: getCoord("15", "14.5"), type: "straight" },
  { pos: getCoord("15", "13.5"), type: "straight" },
];

const ghost3POVPathPoints: MazePathPoint[] = [
  { pos: getCoord("9", "12"), type: "straight" },
  {
    pos: getCoord("9", "12.5"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("9.5", "13"), type: "straight" },
  { pos: getCoord("10.5", "13"), type: "straight" },
];

const ghost4POVPathPoints: MazePathPoint[] = [
  { pos: getCoord("7", "14"), type: "straight" },
  {
    pos: getCoord("7", "13.5"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("7.5", "13"), type: "straight" },
  { pos: getCoord("8.5", "13"), type: "straight" },
];

const ghost5POVPathPoints: MazePathPoint[] = [
  { pos: getCoord("11", "16"), type: "straight" },
  {
    pos: getCoord("11", "15.5"),
    type: "curve",
    arc: "upperArc",
  },
  { pos: getCoord("10.5", "15"), type: "straight" },
  { pos: getCoord("9.5", "15"), type: "straight" },
];

// start position, end position, ghost fade: 10, 20, cam fade: 50, 60, text start fade out: 90

// @philipp - check ghost 3 - 5

export const povTriggerPositions = {
  ghost1: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325), // start ghost path
    ghostStartFadeIn: new THREE.Vector3(0.7075, 0.55, 0.8035), // start ghost text fade in
    ghostEndFadeIn: new THREE.Vector3(0.725, 0.55, 0.8035), // end ghost text fade in
    ghostStartFadeOut: new THREE.Vector3(0.75, 0.55, 0.8035), // start ghost text fade out
    camStartFadeIn: new THREE.Vector3(0.75775, 0.55, 0.8035), // start cam fade in
    camEndFadeIn: new THREE.Vector3(0.775, 0.55, 0.8035), // end cam fade in
    camStartFadeOut: new THREE.Vector3(0.84, 0.55, 0.8035), // start cam fade out
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035), // end of path
    forceEndProgress: {
      start: 0.1, // start of force end
      end: 0.16, // end of force end
    },
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
    forceEndProgress: {
      start: 0.17,
      end: 0.22,
    },
  },
  ghost3: {
    triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    ghostStartFadeIn: new THREE.Vector3(0.7075, 0.55, 1.0045),
    ghostEndFadeIn: new THREE.Vector3(0.7075, 0.55, 1.0045),
    ghostStartFadeOut: new THREE.Vector3(0.6825, 0.55, 1.0045),
    camStartFadeIn: new THREE.Vector3(0.65725, 0.55, 1.0045),
    camEndFadeIn: new THREE.Vector3(0.65725, 0.55, 1.0045),
    camStartFadeOut: new THREE.Vector3(0.6065, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
    forceEndProgress: {
      start: 0.23,
      end: 0.33,
    },
  },
  ghost4: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    ghostStartFadeIn: new THREE.Vector3(0.5565, 0.55, 1.0045),
    ghostEndFadeIn: new THREE.Vector3(0.5065, 0.55, 1.0045),
    ghostStartFadeOut: new THREE.Vector3(0.4815, 0.55, 1.0045),
    camStartFadeIn: new THREE.Vector3(0.45625, 0.55, 1.0045),
    camEndFadeIn: new THREE.Vector3(0.45625, 0.55, 1.0045),
    camStartFadeOut: new THREE.Vector3(0.4065, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
    forceEndProgress: {
      start: 0.38,
      end: 0.47,
    },
  },
  ghost5: {
    triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    ghostStartFadeIn: new THREE.Vector3(0.1795, 0.55, 1.18),
    ghostEndFadeIn: new THREE.Vector3(0.205, 0.55, 1.2055),
    ghostStartFadeOut: new THREE.Vector3(0.23025, 0.55, 1.2055),
    camStartFadeIn: new THREE.Vector3(0.25525, 0.55, 1.2055),
    camEndFadeIn: new THREE.Vector3(0.25525, 0.55, 1.2055),
    camStartFadeOut: new THREE.Vector3(0.3055, 0.55, 1.2055),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
    forceEndProgress: {
      start: 0.52,
      end: 0.59,
    },
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
