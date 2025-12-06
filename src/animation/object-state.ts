import * as THREE from "three";
import { ghosts } from "../core/objects";
import {
  setObjectOpacity,
  forEachMaterial,
  getObjectOpacity,
} from "../core/material-utils";
import { vector3Pool, quaternionPool } from "../core/object-pool";

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

const ghostKeys = Object.keys(ghosts);

export function initializeObjectStates() {
  ghostKeys.forEach((key) => {
    const object = ghosts[key as keyof typeof ghosts];
    if (!object) return;
    const initialOpacity = getObjectOpacity(object);

    currentObjectStates[key] = {
      position: object.position.clone(),
      rotation: object.quaternion.clone(),
      scale: object.scale.clone(),
      visible: object.visible,
      opacity: initialOpacity,
    };
  });
}

export function getCurrentPositions(): Record<string, THREE.Vector3> {
  const positions: Record<string, THREE.Vector3> = {};
  ghostKeys.forEach((key) => {
    const state = currentObjectStates[key];
    if (state) {
      positions[key] = state.position.clone();
    }
  });
  return positions;
}

export function getCurrentRotations(): Record<string, THREE.Quaternion> {
  const rotations: Record<string, THREE.Quaternion> = {};
  ghostKeys.forEach((key) => {
    const state = currentObjectStates[key];
    if (state) {
      rotations[key] = state.rotation.clone();
    }
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
    homeLoopStartPositions[key] = position.clone();
  }
}

export function getHomeLoopStartPositions(): Record<string, THREE.Vector3> {
  return { ...homeLoopStartPositions };
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
    homeLoopStartRotations[key] = rotation.clone();
  }
}

export function getHomeLoopStartRotations(): Record<string, THREE.Quaternion> {
  const rotations: Record<string, THREE.Quaternion> = {};
  Object.keys(homeLoopStartRotations).forEach((key) => {
    rotations[key] = homeLoopStartRotations[key].clone();
  });
  return rotations;
}

export function setHomeLoopStartT(t: number): void {
  homeLoopStartT = t;
}

export function getHomeLoopStartT(): number | null {
  return homeLoopStartT;
}
