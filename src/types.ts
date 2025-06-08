import * as THREE from "three";

export interface PathPoint {
  pos: THREE.Vector3;
  type: "straight" | "curve";
  curveType?: "upperArc" | "lowerArc" | "forwardDownArc";
}

export interface PathData {
  points: PathPoint[];
  color: number;
}

export interface GhostContainer {
  [key: string]: THREE.Mesh | THREE.Group;
}

export interface TriggerPosition {
  triggerPos: THREE.Vector3;
  ghostTextPos: THREE.Vector3;
  camTextPos: THREE.Vector3;
  endPosition: THREE.Vector3;
  parent: Element;
  active: boolean;
  hasBeenTriggered?: boolean;
  hasBeenDeactivated?: boolean;
  triggerCameraProgress?: number | null;
  ghostTextCameraProgress?: number | null;
  camTextCameraProgress?: number | null;
  endCameraProgress?: number | null;
  currentPathT?: number;
  ghostTextOpacity?: number;
  camTextOpacity?: number;
  lastProgress?: number;
  currentRotation?: THREE.Quaternion;
}

export interface AnimationPosition {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  rotation: THREE.Euler;
}

export interface MaterialMap {
  [key: string]: THREE.Material;
}

export interface PathMapping {
  [key: string]: string;
}

export interface AnimationState {
  animationRunning: boolean;
  savedPositions: { [key: string]: any };
  timeOffset: number;
  oldTop: number;
  scrollTimeout: NodeJS.Timeout | null;
  homePositionsSaved: boolean;
  homeAnimationPositions: { [key: string]: AnimationPosition };
  isInPovSection: boolean;
  isMovingForward: boolean;
  previousCameraPosition: THREE.Vector3 | null;
  cachedStartYAngle: number | null;
  animationStarted: boolean;
  rotationStarted: boolean;
  startedInitEndScreen: boolean;
  endScreenPassed: boolean;
  startEndProgress: number;
  cachedHomeEndRotation: THREE.Quaternion | null;
}
