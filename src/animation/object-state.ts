import * as THREE from "three";
import { ghosts } from "../core/objects";
import {
  setObjectOpacity,
  forEachMaterial,
  getObjectOpacity,
} from "../core/material-utils";

export interface ObjectState {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  visible: boolean;
  opacity: number;
}

export interface HomeLoopState {
  t: number;
  pausedT: number;
  animationTime: number;
}

export const homeLoopState: HomeLoopState = {
  t: 0,
  pausedT: 0,
  animationTime: 0,
};

export const currentObjectStates: Record<string, ObjectState> = {};

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

export function updateHomeLoopPausedT(pausedT: number) {
  homeLoopState.pausedT = pausedT;
}

export function getHomeLoopT(): number {
  return homeLoopState.t;
}

export function getHomeLoopPausedT(): number {
  return homeLoopState.pausedT;
}

export function getHomeLoopAnimationTime(): number {
  return homeLoopState.animationTime;
}

export function initializeObjectStates() {
  Object.entries(ghosts).forEach(([key, object]) => {
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

export function syncStateFromObjects(force: boolean = false) {
  if (!isHomeLoopActive && !force) {
    return;
  }

  Object.entries(ghosts).forEach(([key, object]) => {
    if (currentObjectStates[key]) {
      currentObjectStates[key].position.copy(object.position);
      currentObjectStates[key].rotation.copy(object.quaternion);
      currentObjectStates[key].scale.copy(object.scale);
      currentObjectStates[key].visible = object.visible;
    } else {
      const initialOpacity = getObjectOpacity(object);

      currentObjectStates[key] = {
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
        visible: object.visible,
        opacity: initialOpacity,
      };
    }
  });
}

export function applyStateToObjects() {
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    const object = ghosts[key];
    if (object) {
      object.position.copy(state.position);
      object.quaternion.copy(state.rotation);
      object.scale.copy(state.scale);
      object.visible = state.visible;

      setObjectOpacity(object, state.opacity, {
        preserveTransmission: true,
        skipCurrencySymbols: true,
      });
    }
  });
}

export function getCurrentPositions(): Record<string, THREE.Vector3> {
  const positions: Record<string, THREE.Vector3> = {};
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    positions[key] = state.position.clone();
  });
  return positions;
}

export function getCurrentRotations(): Record<string, THREE.Quaternion> {
  const rotations: Record<string, THREE.Quaternion> = {};
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    rotations[key] = state.rotation.clone();
  });
  return rotations;
}

export function updateObjectPosition(key: string, position: THREE.Vector3) {
  if (!isHomeLoopActive) {
    return;
  }

  if (currentObjectStates[key]) {
    currentObjectStates[key].position.copy(position);
  }
}

export function updateObjectRotation(key: string, rotation: THREE.Quaternion) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].rotation.copy(rotation);
  }
}

export function updateObjectScale(key: string, scale: THREE.Vector3) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].scale.copy(scale);
  }
}

export function updateObjectVisibility(key: string, visible: boolean) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].visible = visible;
  }
}
