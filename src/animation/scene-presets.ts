import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import {
  slerpToLayDown,
  rotateQuaternionAroundAxis,
  applyRotations,
  OBJECT_KEYS,
  GHOST_COLORS,
  isCurrencySymbol,
  isPacmanPart,
} from "./util";
import {
  setMaterialOpacity,
  setMaterialTransparent,
  resetGhostMaterialsToFullOpacity,
  setGhostColor,
  forEachMaterial,
} from "../core/material-utils";
import {
  updateObjectRotation,
  syncStateFromObjects,
} from "./object-state";
import { setFloorPlane, setObjectScale, killObjectAnimations } from "./scene-utils";
import {
  SCALE,
  COLOR,
  OPACITY,
  INTRO_POSITION_OFFSET,
  INTRO_BASE_X_OFFSET,
  INTRO_BEHIND_OFFSET_STEP,
} from "./constants";

/**
 * SCENE PRESETS
 *
 * This file contains preset functions for each scene that set all object properties
 * when entering a scene. Modify these functions to adjust how objects appear in each scene.
 *
 * Each preset function receives:
 * - isEntering: true when entering the scene, false when leaving
 * - scrollDirection: "up" | "down" - helps determine behavior when scenes overlap
 *
 * ============================================================================
 * WHERE TO CHANGE SETTINGS:
 * ============================================================================
 *
 * 1. INTRO SCROLL PRESET (applyIntroScrollPreset):
 *    - Position offsets: INTRO_POSITION_OFFSET (lines 142-145)
 *    - Ghost colors: ghostColors object (lines 268-274)
 *    - Scale: pacman 0.1, ghosts 1.0 (lines 286-290)
 *    - Rotation: pacman uses laying down, ghosts use laying down + 180° X (lines 190-231)
 *    - Floor plane: opacity 0 (hidden) (lines 343-353)
 *
 * 2. HOME SCROLL PRESET (applyHomeScrollPreset):
 *    - Uses paused positions/rotations from home-loop
 *    - Floor plane: visible with opacity 1 (lines 79-89)
 *
 * 3. HOME LOOP PRESET (applyHomeLoopPreset):
 *    - Scale: all objects 1.0 (lines 24-29)
 *    - Floor plane: visible with opacity 1 (lines 50-60)
 *
 * 4. POV SCROLL PRESET (applyPovScrollPreset):
 *    - Pacman: hidden (lines 300-302)
 *    - Ghost scale: 0.5 (lines 307-309)
 *    - Ghost visibility: initially false (controlled by pov-scroll.ts triggers)
 *    - Floor plane: visible with opacity 1 (lines 321-331)
 *
 * 5. OUTRO SCROLL PRESET (applyOutroScrollPreset):
 *    - Currently minimal setup (add your outro-specific settings here)
 *    - Floor plane: visible with opacity 1 (lines 378-388)
 */

// ============================================================================
// HOME LOOP PRESET
// ============================================================================
export function applyHomeLoopPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  // Home loop uses paths, so positions/rotations are handled by home-loop.ts
  // Here we just ensure visibility and scale settings
  Object.entries(ghosts).forEach(([key, object]) => {
    gsap.set(object, { visible: true });
    setObjectScale(object, key, "home");

    // Ensure all meshes are visible (except currencies) using centralized utility
    forEachMaterial(
      object,
      (mat: any, mesh: THREE.Mesh, childName: string) => {
        // Keep currency symbols hidden in all scenes
        if (isCurrencySymbol(childName)) {
          mesh.visible = false;
          return;
        }
        mesh.visible = true;
      },
      { skipCurrencySymbols: false } // We handle this in the callback
    );

    // Use centralized material utility to set opacity consistently
    // This ensures ghost materials with transmission always have transparent=true
    resetGhostMaterialsToFullOpacity(object);
  });

  // Floor plane visible
  setFloorPlane(true, OPACITY.FULL, false);
}

// ============================================================================
// HOME SCROLL PRESET
// ============================================================================
export function applyHomeScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down",
  pausedPositions?: Record<string, THREE.Vector3>,
  pausedRotations?: Record<string, THREE.Quaternion>
) {
  if (!isEntering) return;

  // Use paused positions/rotations if provided (from home-loop)
  if (pausedPositions && pausedRotations) {
    Object.entries(ghosts).forEach(([key, object]) => {
      if (pausedPositions[key]) {
        // CRITICAL: Set position directly for visual update
        // Do NOT update state position here - only home-loop should update positions
        object.position.set(
          pausedPositions[key].x,
          pausedPositions[key].y,
          pausedPositions[key].z
        );
        
        // Also use gsap.set for any GSAP tracking
        gsap.set(object.position, {
          x: pausedPositions[key].x,
          y: pausedPositions[key].y,
          z: pausedPositions[key].z,
        });
      }

      if (pausedRotations[key]) {
        // CRITICAL: Do NOT set rotation here - it will be set by updateScrollAnimation
        // Setting it here would interfere with the scroll-based rotation animation
        // The rotation will be animated during scroll based on progress
        // We just ensure the object is visible and positioned correctly
      }

      gsap.set(object, { visible: true });

      // CRITICAL: Set correct scales using centralized utility
      setObjectScale(object, key, "home");

      // Set visibility but DON'T change opacity here - opacity is managed individually per object in home-scroll.ts
      // Use centralized utility to ensure materials are transparent-capable
      forEachMaterial(
        object,
        (mat: any, mesh: THREE.Mesh, childName: string) => {
          // Keep currency symbols hidden in all scenes
          if (isCurrencySymbol(childName)) {
            mesh.visible = false;
            return;
          }

          mesh.visible = true;

          // Don't set opacity here - let home-scroll.ts handle it per object
          // Just ensure materials are transparent-capable using centralized utility
          setMaterialTransparent(mat, true, true);
        },
        { skipCurrencySymbols: false } // We handle this in the callback
      );
    });
  }

  // Floor plane visible
  setFloorPlane(true, OPACITY.FULL, false);
}

// ============================================================================
// INTRO SCROLL PRESET
// ============================================================================

// Position offsets are now in constants.ts (INTRO_POSITION_OFFSET)
// Re-export for backward compatibility
export { INTRO_POSITION_OFFSET };

// Store target quaternions for intro (calculated once)
let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;
let introInitialRotations: Record<string, THREE.Quaternion> = {};

// Export getters for quaternions (used by intro-scroll animation updates)
export function getPacmanTargetQuaternion(): THREE.Quaternion | null {
  return pacmanTargetQuaternion;
}

export function getGhostTargetQuaternion(): THREE.Quaternion | null {
  return ghostTargetQuaternion;
}

export function applyIntroScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  // Calculate target quaternions ONCE (they don't change during scroll)
  // Rotate objects 180 degrees to match camera rotation
  if (!pacmanTargetQuaternion || !ghostTargetQuaternion) {
    const pacmanObj = ghosts.pacman;
    if (pacmanObj) {
      if (!introInitialRotations["pacman"]) {
        introInitialRotations["pacman"] = pacmanObj.quaternion.clone();
      }

      // Start with laydown rotation
      let quat = introInitialRotations["pacman"].clone();
      slerpToLayDown(pacmanObj, quat, OPACITY.FULL);
      quat = pacmanObj.quaternion.clone();

      // Apply rotations in sequence using helper function
      // This makes it much clearer what rotations are being applied
      quat = applyRotations(quat, [
        { axis: "x", angle: Math.PI / 2 }, // +90° X-axis
        { axis: "y", angle: Math.PI }, // +180° Y-axis
        { axis: "y", angle: Math.PI }, // +180° Y-axis (again, total 360° = 0°)
        { axis: "x", angle: Math.PI }, // +180° X-axis (fix upside-down)
      ]);

      pacmanTargetQuaternion = quat;
      pacmanObj.quaternion.copy(introInitialRotations["pacman"]);
    }

    const ghostObj = ghosts.ghost1;
    if (ghostObj) {
      if (!introInitialRotations["ghost1"]) {
        introInitialRotations["ghost1"] = ghostObj.quaternion.clone();
      }

      // Start with laydown rotation
      let quat = introInitialRotations["ghost1"].clone();
      slerpToLayDown(ghostObj, quat, OPACITY.FULL);
      quat = ghostObj.quaternion.clone();

      // Apply rotations in sequence using helper function
      // Much clearer than multiple multiply() calls
      quat = applyRotations(quat, [
        { axis: "x", angle: Math.PI }, // +180° X-axis (heads face down)
        { axis: "x", angle: Math.PI }, // +180° X-axis (flip them up)
        { axis: "y", angle: Math.PI }, // +180° Y-axis (match camera)
        { axis: "y", angle: Math.PI }, // +180° Y-axis (again, total 360° = 0°)
        { axis: "x", angle: Math.PI }, // +180° X-axis (fix upside-down)
      ]);

      ghostTargetQuaternion = quat;
      ghostObj.quaternion.copy(introInitialRotations["ghost1"]);
    }

    // Store initial rotations for all objects
    OBJECT_KEYS.forEach((key) => {
      const obj = ghosts[key];
      if (obj && !introInitialRotations[key]) {
        introInitialRotations[key] = obj.quaternion.clone();
      }
    });
  }

  // Calculate start position (far left)
  const baseX = camera.position.x + INTRO_BASE_X_OFFSET;
  const startPosition = new THREE.Vector3(
    baseX + INTRO_POSITION_OFFSET.x,
    camera.position.y + INTRO_POSITION_OFFSET.y,
    camera.position.z + INTRO_POSITION_OFFSET.z
  );

  const objectsToAnimate = OBJECT_KEYS;

  // Use gsap.set to immediately set all properties
  objectsToAnimate.forEach((key, index) => {
    const object = ghosts[key];
    if (!object) return;

    // CRITICAL: Kill all GSAP animations first to prevent interference
    killObjectAnimations(object);

    // Calculate position with stagger
    const behindOffset = index === 0 ? 0 : INTRO_BEHIND_OFFSET_STEP * index;
    const pos = new THREE.Vector3(
      startPosition.x + behindOffset,
      startPosition.y,
      startPosition.z
    );

    // Set position, rotation, scale, visibility using gsap.set
    gsap.set(object.position, {
      x: pos.x,
      y: pos.y,
      z: pos.z,
    });

    // Set rotation quaternion directly
    if (key === "pacman" && pacmanTargetQuaternion) {
      object.quaternion.copy(pacmanTargetQuaternion);
    } else if (ghostTargetQuaternion) {
      object.quaternion.copy(ghostTargetQuaternion);
    }

    // CRITICAL: Set scale using centralized utility
    setObjectScale(object, key, "intro");

    gsap.set(object, { visible: true });

    // CRITICAL: Set opacity and visibility for all meshes IMMEDIATELY and EXPLICITLY
    // Use centralized utility for consistency
    forEachMaterial(
      object,
      (mat: any, mesh: THREE.Mesh, childName: string) => {
        // Keep currency symbols and pacman parts hidden
        if (
          isCurrencySymbol(childName) ||
          (key === "pacman" && isPacmanPart(childName))
        ) {
          mesh.visible = false;
          return;
        }

        // CRITICAL: Force visibility and opacity IMMEDIATELY
        mesh.visible = true;

        // Set opacity using centralized utility (not via GSAP to ensure immediate effect)
        setMaterialOpacity(mat, 1, true);
      },
      {
        skipCurrencySymbols: false, // We handle this in the callback
        skipPacmanParts: false, // We handle this in the callback
        objectKey: key,
      }
    );

    // Set ghost colors using centralized utility (only if needed)
    if (GHOST_COLORS[key] && key !== "pacman") {
      setGhostColor(object, GHOST_COLORS[key]);
    }

    object.updateMatrixWorld(true);
  });

  // Hide floor plane (white with opacity 0)
  setFloorPlane(true, OPACITY.HIDDEN, true);
}

// ============================================================================
// POV SCROLL PRESET
// ============================================================================
export function applyPovScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  // Hide pacman during POV section
  if (ghosts.pacman) {
    gsap.set(ghosts.pacman, { visible: false });
  }

  // Ghosts are positioned by pov-scroll.ts, but set initial visibility
  Object.entries(ghosts).forEach(([key, object]) => {
    if (key !== "pacman") {
      // Initially invisible, will be shown by pov-scroll.ts when triggered
      gsap.set(object, { visible: false });
      setObjectScale(object, key, "pov");

      // Reset opacity using centralized utility
      forEachMaterial(
        object,
        (mat: any) => {
          setMaterialOpacity(mat, 1, true);
        },
        { skipCurrencySymbols: false }
      );
    }
  });

  // Floor plane visible
  setFloorPlane(true, OPACITY.FULL, false);
}

// ============================================================================
// OUTRO SCROLL PRESET
// ============================================================================
export function applyOutroScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  // Outro scroll doesn't manipulate 3D objects directly
  // This is where you can add any outro-specific object settings

  // Floor plane visible
  setFloorPlane(true, OPACITY.FULL, false);
}

// ============================================================================
// UTILITY: Get scroll direction
// ============================================================================
let lastScrollY = window.scrollY;
export function getScrollDirection(): "up" | "down" {
  const currentScrollY = window.scrollY;
  const direction = currentScrollY > lastScrollY ? "down" : "up";
  lastScrollY = currentScrollY;
  return direction;
}

// ============================================================================
// UTILITY: Reset all preset caches (call when needed)
// ============================================================================
export function resetPresetCaches() {
  pacmanTargetQuaternion = null;
  ghostTargetQuaternion = null;
  introInitialRotations = {};
}
