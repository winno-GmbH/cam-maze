import * as THREE from "three";
import { ghosts } from "../core/objects";

/**
 * UNIFIED OBJECT STATE MANAGER
 * 
 * Single source of truth for all object positions, rotations, and states.
 * This ensures consistency across all scenes (home-loop, home-scroll, intro-scroll, pov-scroll).
 */

export interface ObjectState {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  visible: boolean;
}

// Current state - always reflects actual object positions
export const currentObjectStates: Record<string, ObjectState> = {};

// Initialize state for all objects
export function initializeObjectStates() {
  Object.entries(ghosts).forEach(([key, object]) => {
    currentObjectStates[key] = {
      position: object.position.clone(),
      rotation: object.quaternion.clone(),
      scale: object.scale.clone(),
      visible: object.visible,
    };
  });
}

// Update state from actual object positions (call this when objects move)
export function syncStateFromObjects() {
  Object.entries(ghosts).forEach(([key, object]) => {
    if (currentObjectStates[key]) {
      currentObjectStates[key].position.copy(object.position);
      currentObjectStates[key].rotation.copy(object.quaternion);
      currentObjectStates[key].scale.copy(object.scale);
      currentObjectStates[key].visible = object.visible;
    } else {
      currentObjectStates[key] = {
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
        visible: object.visible,
      };
    }
  });
}

// Apply state to objects
export function applyStateToObjects() {
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    const object = ghosts[key];
    if (object) {
      object.position.copy(state.position);
      object.quaternion.copy(state.rotation);
      object.scale.copy(state.scale);
      object.visible = state.visible;
    }
  });
}

// Get current positions (for home-scroll)
export function getCurrentPositions(): Record<string, THREE.Vector3> {
  const positions: Record<string, THREE.Vector3> = {};
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    positions[key] = state.position.clone();
  });
  return positions;
}

// Get current rotations (for home-scroll)
export function getCurrentRotations(): Record<string, THREE.Quaternion> {
  const rotations: Record<string, THREE.Quaternion> = {};
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    rotations[key] = state.rotation.clone();
  });
  return rotations;
}

// Update position for a specific object
export function updateObjectPosition(key: string, position: THREE.Vector3) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].position.copy(position);
  }
}

// Update rotation for a specific object
export function updateObjectRotation(key: string, rotation: THREE.Quaternion) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].rotation.copy(rotation);
  }
}

// Update scale for a specific object
export function updateObjectScale(key: string, scale: THREE.Vector3) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].scale.copy(scale);
  }
}

// Update visibility for a specific object
export function updateObjectVisibility(key: string, visible: boolean) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].visible = visible;
  }
}

