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
  opacity: number; // Material opacity (0-1)
}

// Home-loop specific state - stores the t-value used for path calculations
// This ensures home-scroll uses the exact same positions as home-loop
export interface HomeLoopState {
  t: number; // Current t-value (0-1) for home-loop paths
  pausedT: number; // Last paused t-value when home-loop stopped
  animationTime: number; // Current animation time
}

export const homeLoopState: HomeLoopState = {
  t: 0,
  pausedT: 0,
  animationTime: 0,
};

// Current state - always reflects actual object positions
export const currentObjectStates: Record<string, ObjectState> = {};

// Flag to track if home-loop is active (only home-loop should update positions)
let isHomeLoopActive = false;

export function setHomeLoopActive(active: boolean) {
  isHomeLoopActive = active;
}

export function getIsHomeLoopActive(): boolean {
  return isHomeLoopActive;
}

// Update home-loop t-value (called by home-loop every frame)
export function updateHomeLoopT(t: number, animationTime: number) {
  homeLoopState.t = t;
  homeLoopState.animationTime = animationTime;
}

// Update paused t-value (called when home-loop stops)
export function updateHomeLoopPausedT(pausedT: number) {
  homeLoopState.pausedT = pausedT;
}

// Get current home-loop t-value (for active loop)
export function getHomeLoopT(): number {
  return homeLoopState.t;
}

// Get paused t-value (for when loop is stopped)
export function getHomeLoopPausedT(): number {
  return homeLoopState.pausedT;
}

// Get current home-loop animation time
export function getHomeLoopAnimationTime(): number {
  return homeLoopState.animationTime;
}

// Initialize state for all objects
export function initializeObjectStates() {
  Object.entries(ghosts).forEach(([key, object]) => {
    // Get initial opacity from first material found
    let initialOpacity = 1.0;
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          if (mesh.material.length > 0) {
            initialOpacity = (mesh.material[0] as any).opacity ?? 1.0;
          }
        } else {
          initialOpacity = ((mesh.material as any).opacity ?? 1.0);
        }
        return; // Only need first material
      }
    });

    currentObjectStates[key] = {
      position: object.position.clone(),
      rotation: object.quaternion.clone(),
      scale: object.scale.clone(),
      visible: object.visible,
      opacity: initialOpacity,
    };
  });
}

// Update state from actual object positions
// CRITICAL: This should ONLY be called by home-loop when it's active
// Other parts should only READ positions, not write them
export function syncStateFromObjects() {
  // Only allow syncing if home-loop is active
  // This ensures positions are only updated by home-loop
  if (!isHomeLoopActive) {
    return;
  }

  Object.entries(ghosts).forEach(([key, object]) => {
    if (currentObjectStates[key]) {
      // Fast path: just update position/rotation/scale/visible
      currentObjectStates[key].position.copy(object.position);
      currentObjectStates[key].rotation.copy(object.quaternion);
      currentObjectStates[key].scale.copy(object.scale);
      currentObjectStates[key].visible = object.visible;
      // Opacity is managed separately via updateObjectOpacity() - don't sync it here
      // This avoids expensive traverse() calls on every position update
    } else {
      // Initial state creation: get opacity from first material
      let initialOpacity = 1.0;
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            if (mesh.material.length > 0) {
              initialOpacity = (mesh.material[0] as any).opacity ?? 1.0;
            }
          } else {
            initialOpacity = ((mesh.material as any).opacity ?? 1.0);
          }
          return; // Only need first material
        }
      });

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

// Apply state to objects
export function applyStateToObjects() {
  Object.entries(currentObjectStates).forEach(([key, state]) => {
    const object = ghosts[key];
    if (object) {
      object.position.copy(state.position);
      object.quaternion.copy(state.rotation);
      object.scale.copy(state.scale);
      object.visible = state.visible;
      
      // Apply opacity to all materials
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = state.opacity;
              mat.transparent = state.opacity < 1.0;
            });
          } else {
            (mesh.material as any).opacity = state.opacity;
            (mesh.material as any).transparent = state.opacity < 1.0;
          }
        }
      });
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
// CRITICAL: This should ONLY be called by home-loop
// Other parts should NOT update positions - they should only read them
export function updateObjectPosition(key: string, position: THREE.Vector3) {
  // Only allow position updates if home-loop is active
  if (!isHomeLoopActive) {
    return;
  }

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

// Update opacity for a specific object (and apply to materials)
export function updateObjectOpacity(key: string, opacity: number) {
  if (currentObjectStates[key]) {
    currentObjectStates[key].opacity = opacity;
    
    // Apply to actual object materials
    const object = ghosts[key];
    if (object) {
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = opacity;
              mat.transparent = opacity < 1.0;
            });
          } else {
            (mesh.material as any).opacity = opacity;
            (mesh.material as any).transparent = opacity < 1.0;
          }
        }
      });
    }
  }
}

// Get current opacity for a specific object
export function getObjectOpacity(key: string): number {
  return currentObjectStates[key]?.opacity ?? 1.0;
}

