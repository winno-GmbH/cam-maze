import * as THREE from "three";
import { ghosts } from "../core/objects";
import {
  setObjectOpacity,
  forEachMaterial,
  getObjectOpacity,
} from "../core/material-utils";
import { vector3PoolTemp, quaternionPoolTemp } from "../core/object-pool";

export interface ObjectState {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  visible: boolean;
  opacity: number;
}

export interface HomeLoopState {
  t: number;
  animationTime: number;
}

export const homeLoopState: HomeLoopState = {
  t: 0,
  animationTime: 0,
};

export const currentObjectStates: Record<string, ObjectState> = {};

export let homeLoopStartPositions: Record<string, THREE.Vector3> = {};
export let homeLoopStartRotations: Record<string, THREE.Quaternion> = {};
export let homeLoopStartT: number | null = null;

let isHomeLoopActive = false;

export function setHomeLoopActive(active: boolean) {
  isHomeLoopActive = active;
}

export function getIsHomeLoopActive(): boolean {
  return isHomeLoopActive;
}

export function updateHomeLoopT(t: number, animationTime: number) {
  homeLoopState.t = t;
  homeLoopState.animationTime = animationTime;
}

export function initializeObjectStates() {
  Object.entries(ghosts).forEach(([key, object]) => {
    const initialOpacity = getObjectOpacity(object);

    const pos = vector3PoolTemp.acquire();
    pos.copy(object.position);
    const rot = quaternionPoolTemp.acquire();
    rot.copy(object.quaternion);
    const scale = vector3PoolTemp.acquire();
    scale.copy(object.scale);

    currentObjectStates[key] = {
      position: pos,
      rotation: rot,
      scale: scale,
      visible: object.visible,
      opacity: initialOpacity,
    };
  });
}

export function getCurrentPositions(): Record<string, THREE.Vector3> {
  const positions: Record<string, THREE.Vector3> = {};
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    const tempPos = vector3PoolTemp.acquire();
    tempPos.copy(state.position);
    positions[key] = tempPos;
  });
  return positions;
}

export function getCurrentRotations(): Record<string, THREE.Quaternion> {
  const rotations: Record<string, THREE.Quaternion> = {};
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    const tempRot = quaternionPoolTemp.acquire();
    tempRot.copy(state.rotation);
    rotations[key] = tempRot;
  });
  return rotations;
}

export function updateObjectPosition(
  key: string,
  position: THREE.Vector3,
  force: boolean = false,
  preserveHomeLoopStart: boolean = false
) {
  if (!isHomeLoopActive && !force) {
    return;
  }

  if (currentObjectStates[key]) {
    currentObjectStates[key].position.copy(position);
  }

  if (preserveHomeLoopStart) {
    const tempPos = vector3PoolTemp.acquire();
    tempPos.copy(position);
    homeLoopStartPositions[key] = tempPos;
  }
}

export function getHomeLoopStartPositions(): Record<string, THREE.Vector3> {
  const result: Record<string, THREE.Vector3> = {};
  Object.entries(homeLoopStartPositions).forEach(([key, pos]) => {
    const tempPos = vector3PoolTemp.acquire();
    tempPos.copy(pos);
    result[key] = tempPos;
  });
  return result;
}

export function updateObjectRotation(
  key: string,
  rotation: THREE.Quaternion,
  preserveHomeLoopStart: boolean = false
) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].rotation.copy(rotation);
  }

  if (preserveHomeLoopStart) {
    const tempRot = quaternionPoolTemp.acquire();
    tempRot.copy(rotation);
    homeLoopStartRotations[key] = tempRot;
  }
}

export function getHomeLoopStartRotations(): Record<string, THREE.Quaternion> {
  const result: Record<string, THREE.Quaternion> = {};
  Object.entries(homeLoopStartRotations).forEach(([key, rot]) => {
    const tempRot = quaternionPoolTemp.acquire();
    tempRot.copy(rot);
    result[key] = tempRot;
  });
  return result;
}

export function setHomeLoopStartT(t: number): void {
  homeLoopStartT = t;
}

export function getHomeLoopStartT(): number | null {
  return homeLoopStartT;
}
