import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";
import { slerpToLayDown } from "./util";

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

  console.log("🎬 Applying HOME LOOP preset");

  // Home loop uses paths, so positions/rotations are handled by home-loop.ts
  // Here we just ensure visibility and scale settings
  // Pacman scale should be 0.05 (original model size), ghosts are 1.0
  Object.entries(ghosts).forEach(([key, object]) => {
    gsap.set(object, { visible: true });

    if (key === "pacman") {
      // CRITICAL: Pacman default scale is 0.05 (from model loading)
      // Kill any GSAP animations that might interfere
      gsap.killTweensOf(object.scale);
      object.scale.set(0.05, 0.05, 0.05);
      object.updateMatrixWorld(true);
    } else {
      gsap.set(object.scale, { x: 1, y: 1, z: 1 });
    }

    // Ensure all meshes are visible and opaque (except currencies)
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        const childName = child.name || "";

        // Keep currency symbols hidden in all scenes - check both exact match and includes
        if (
          ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
          childName.includes("EUR") ||
          childName.includes("CHF") ||
          childName.includes("YEN") ||
          childName.includes("USD") ||
          childName.includes("GBP")
        ) {
          mesh.visible = false;
          return;
        }

        mesh.visible = true;

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            mat.opacity = 1;
            mat.transparent = false;
          });
        } else {
          (mesh.material as any).opacity = 1;
          (mesh.material as any).transparent = false;
        }
      }
    });
  });

  // Floor plane visible
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.transparent = false;
      }
    }
  });
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

  console.log("🎬 Applying HOME SCROLL preset", { scrollDirection });

  // Use paused positions/rotations if provided (from home-loop)
  if (pausedPositions && pausedRotations) {
    Object.entries(ghosts).forEach(([key, object]) => {
      if (pausedPositions[key]) {
        gsap.set(object.position, {
          x: pausedPositions[key].x,
          y: pausedPositions[key].y,
          z: pausedPositions[key].z,
        });
      }

      if (pausedRotations[key]) {
        object.quaternion.copy(pausedRotations[key]);
      }

      gsap.set(object, { visible: true });

      // CRITICAL: Set correct scales - pacman should be 0.05 (original size), ghosts 1.0
      if (key === "pacman") {
        // Kill any GSAP animations that might interfere
        gsap.killTweensOf(object.scale);
        object.scale.set(0.05, 0.05, 0.05);
        object.updateMatrixWorld(true);
      } else {
        gsap.set(object.scale, { x: 1, y: 1, z: 1 });
      }

      // Set opacity to 1 initially (will be animated by home-scroll.ts)
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          const childName = child.name || "";

          // Keep currency symbols hidden in all scenes
          if (["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName)) {
            mesh.visible = false;
            return;
          }

          mesh.visible = true;

          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = 1;
              mat.transparent = true;
            });
          } else {
            (mesh.material as any).opacity = 1;
            (mesh.material as any).transparent = true;
          }
        }
      });
    });
  }

  // Floor plane visible
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.transparent = false;
      }
    }
  });
}

// ============================================================================
// INTRO SCROLL PRESET
// ============================================================================

// Position offsets (hardcoded from previous adjuster values)
// Export for use in intro-scroll updates
export const INTRO_POSITION_OFFSET = {
  x: 4.3,
  y: -2.0,
  z: 0.0,
};

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

  console.log("🎬 Applying INTRO SCROLL preset", { scrollDirection });

  // CRITICAL: Rotate camera 180 degrees on Y-axis for intro-scroll
  // This ensures objects are visible and walk in the correct direction
  const currentRotation = camera.rotation.clone();
  camera.rotation.y = currentRotation.y + Math.PI; // Rotate 180 degrees on Y-axis
  camera.updateProjectionMatrix();

  // Calculate target quaternions ONCE (they don't change during scroll)
  // Rotate objects 180 degrees to match camera rotation
  if (!pacmanTargetQuaternion || !ghostTargetQuaternion) {
    const pacmanObj = ghosts.pacman;
    if (pacmanObj) {
      if (!introInitialRotations["pacman"]) {
        introInitialRotations["pacman"] = pacmanObj.quaternion.clone();
      }

      pacmanTargetQuaternion = introInitialRotations["pacman"].clone();
      slerpToLayDown(pacmanObj, introInitialRotations["pacman"], 1.0);
      // Add +90 degrees rotation on X-axis
      const pacmanRotation90 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
      pacmanObj.quaternion.multiply(pacmanRotation90);
      // Rotate 180 degrees on Y-axis to match camera rotation
      const pacmanRotationY180 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, Math.PI, 0)
      );
      pacmanObj.quaternion.multiply(pacmanRotationY180);
      pacmanTargetQuaternion = pacmanObj.quaternion.clone();
      pacmanObj.quaternion.copy(introInitialRotations["pacman"]);
    }

    const ghostObj = ghosts.ghost1;
    if (ghostObj) {
      if (!introInitialRotations["ghost1"]) {
        introInitialRotations["ghost1"] = ghostObj.quaternion.clone();
      }

      ghostTargetQuaternion = introInitialRotations["ghost1"].clone();
      slerpToLayDown(ghostObj, introInitialRotations["ghost1"], 1.0);
      // Apply 180 degrees on X-axis (current rotation that makes heads face down)
      const xRotation180 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.PI, 0, 0)
      );
      ghostObj.quaternion.multiply(xRotation180);
      // Add another 180 degrees on X-axis to flip them up
      ghostObj.quaternion.multiply(xRotation180);
      // Rotate 180 degrees on Y-axis to match camera rotation
      const ghostRotationY180 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, Math.PI, 0)
      );
      ghostObj.quaternion.multiply(ghostRotationY180);
      ghostTargetQuaternion = ghostObj.quaternion.clone();
      ghostObj.quaternion.copy(introInitialRotations["ghost1"]);
    }

    // Store initial rotations for all objects
    ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(
      (key) => {
        const obj = ghosts[key];
        if (obj && !introInitialRotations[key]) {
          introInitialRotations[key] = obj.quaternion.clone();
        }
      }
    );
  }

  // Calculate start position (far left)
  const baseX = camera.position.x - 5.0;
  const startPosition = new THREE.Vector3(
    baseX + INTRO_POSITION_OFFSET.x,
    camera.position.y + INTRO_POSITION_OFFSET.y,
    camera.position.z + INTRO_POSITION_OFFSET.z
  );

  const objectsToAnimate = [
    "pacman",
    "ghost1",
    "ghost2",
    "ghost3",
    "ghost4",
    "ghost5",
  ];

  // Ghost colors for testing
  const ghostColors: Record<string, number> = {
    ghost1: 0xff0000, // Red
    ghost2: 0x00ff00, // Green
    ghost3: 0x0000ff, // Blue
    ghost4: 0xffff00, // Yellow
    ghost5: 0xff00ff, // Magenta
  };

  // Use gsap.set to immediately set all properties
  objectsToAnimate.forEach((key, index) => {
    const object = ghosts[key];
    if (!object) return;

    // CRITICAL: For pacman, kill ALL GSAP animations first to prevent interference
    if (key === "pacman") {
      gsap.killTweensOf(object);
      gsap.killTweensOf(object.scale);
      gsap.killTweensOf(object.position);
      gsap.killTweensOf(object.quaternion);
    }

    // Calculate position with stagger
    const behindOffset = index === 0 ? 0 : -0.5 * index;
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

    // CRITICAL: Set pacman scale BEFORE any other operations
    // Must be 0.1 for intro-scroll - set directly and kill any tweens
    if (key === "pacman") {
      // Force set scale immediately
      object.scale.set(0.1, 0.1, 0.1);
      object.updateMatrixWorld(true);
      // Use gsap.set as backup
      gsap.set(object.scale, { x: 0.1, y: 0.1, z: 0.1 });
    } else {
      object.scale.set(1.0, 1.0, 1.0);
      object.updateMatrixWorld(true);
      gsap.set(object.scale, { x: 1.0, y: 1.0, z: 1.0 });
    }

    gsap.set(object, { visible: true });

    // Set opacity and visibility for all meshes
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        const childName = child.name || "";

        // Keep currency symbols hidden - check both exact match and includes
        if (
          ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
          childName.includes("EUR") ||
          childName.includes("CHF") ||
          childName.includes("YEN") ||
          childName.includes("USD") ||
          childName.includes("GBP")
        ) {
          mesh.visible = false;
          return;
        }

        // For pacman: hide Shell and Bitcoin parts
        if (
          key === "pacman" &&
          (childName.includes("Shell") ||
            childName.includes("Bitcoin_1") ||
            childName.includes("Bitcoin_2"))
        ) {
          mesh.visible = false;
          return;
        }

        mesh.visible = true;

        // Set opacity
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            mat.opacity = 1;
            mat.transparent = true;
          });
        } else {
          (mesh.material as any).opacity = 1;
          (mesh.material as any).transparent = true;
        }

        // Set ghost colors
        if (ghostColors[key] && key !== "pacman") {
          const newColor = ghostColors[key];
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.color.setHex(newColor);
            });
          } else {
            (mesh.material as any).color.setHex(newColor);
          }
        }
      }
    });

    object.updateMatrixWorld(true);
  });

  // Hide floor plane (white with opacity 0)
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = 0;
        material.transparent = true;
      }
    }
  });
}

// ============================================================================
// POV SCROLL PRESET
// ============================================================================
export function applyPovScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  console.log("🎬 Applying POV SCROLL preset", { scrollDirection });

  // Hide pacman during POV section
  if (ghosts.pacman) {
    gsap.set(ghosts.pacman, { visible: false });
  }

  // Ghosts are positioned by pov-scroll.ts, but set initial visibility
  Object.entries(ghosts).forEach(([key, object]) => {
    if (key !== "pacman") {
      // Initially invisible, will be shown by pov-scroll.ts when triggered
      gsap.set(object, { visible: false });
      gsap.set(object.scale, { x: 0.5, y: 0.5, z: 0.5 });

      // Reset opacity
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = 1;
              mat.transparent = true;
            });
          } else {
            (mesh.material as any).opacity = 1;
            (mesh.material as any).transparent = true;
          }
        }
      });
    }
  });

  // Floor plane visible
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.transparent = false;
      }
    }
  });
}

// ============================================================================
// OUTRO SCROLL PRESET
// ============================================================================
export function applyOutroScrollPreset(
  isEntering: boolean,
  scrollDirection?: "up" | "down"
) {
  if (!isEntering) return;

  console.log("🎬 Applying OUTRO SCROLL preset", { scrollDirection });

  // Outro scroll doesn't manipulate 3D objects directly
  // This is where you can add any outro-specific object settings

  // Floor plane visible
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff);
        material.opacity = 1;
        material.transparent = false;
      }
    }
  });
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
