import * as THREE from "three";

export interface PathPoint {
  pos: THREE.Vector3;
  curveCheckPoints?: THREE.Vector3[];
}

export type MazePathPoint = PathPoint & {
  type: "straight" | "curve";
  arc?: "upperArc" | "lowerArc" | "forwardDownArc";
  lookAtSequence?: THREE.Vector3[];
};

export type CameraPathPoint =
  | {
      pos: THREE.Vector3;
      type: "straight" | "curve";
      arc?: "upperArc" | "lowerArc" | "forwardDownArc";
    }
  | {
      pos: THREE.Vector3;
      lookAt: THREE.Vector3;
    }
  | {
      pos: THREE.Vector3;
      rotation: THREE.Euler;
    }
  | {
      pos: THREE.Vector3;
    };

export interface PathData {
  points: MazePathPoint[];
  color: number;
}

export interface GhostContainer {
  [key: string]: THREE.Mesh | THREE.Group;
}
