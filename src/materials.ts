import * as THREE from "three";
import { ASSETS } from "./config";

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Load maze texture like in backup.js
export const mazeTexture = textureLoader.load(ASSETS.mazeTexture);

// Materials exactly like backup.js
export const mazeMaterial = new THREE.MeshMatcapMaterial({
  matcap: mazeTexture,
});

export const topMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2f9f9,
  metalness: 0.4,
  roughness: 0,
  envMapIntensity: 10,
});

// Glass Transmission Material for Ghosts - inspired by MeshTransmissionMaterial
export const ghostMaterial = new THREE.MeshPhysicalMaterial({
  // Base properties
  color: 0xffffff,
  transparent: true,
  opacity: 1,

  // Glass properties
  transmission: 1.0, // Full transmission for glass effect
  thickness: 0.2, // Thickness for refraction
  roughness: 0.0, // Smooth glass surface
  metalness: 0.0, // No metallic properties for pure glass

  // Index of refraction (glass-like)
  ior: 1.2, // Similar to glass

  // Advanced glass effects
  clearcoat: 1.0, // Clear coating on surface
  clearcoatRoughness: 0.0, // Smooth clear coat

  // Rendering properties
  side: THREE.DoubleSide, // Render both sides
  depthWrite: false, // Allow transparency sorting
  depthTest: true,

  // Environment interaction
  envMapIntensity: 1.0, // Environment reflections
});

export const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  opacity: 0.8,
  transparent: true,
  roughness: 0.5,
  metalness: 0.1,
});

// Pacman materials with transparency for opacity changes
const pacmanMaterials = {
  blue: new THREE.MeshBasicMaterial({
    color: 0x1469d3,
    transparent: true,
    opacity: 1,
  }),
  white: new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
  }),
  default: new THREE.MeshBasicMaterial({
    color: 0x1469d3,
    transparent: true,
    opacity: 1,
  }),
};

export const materialMap = {
  CAM_Pacman_Backframe: pacmanMaterials.blue,
  "CAM-Pacman_Bitcoin_1": pacmanMaterials.white,
  "CAM-Pacman_Bitcoin_2": pacmanMaterials.white,
  "CAM-Pacman_Bottom": pacmanMaterials.blue,
  "CAM-Pacman_Top": pacmanMaterials.blue,
  "CAM-Pacman_Eye": pacmanMaterials.white,
  CAM_Pacman_Logo_1: pacmanMaterials.white,
  CAM_Pacman_Logo_2: pacmanMaterials.white,
  "CAM-Pacman_Shell_Boolean": pacmanMaterials.blue,
  "CAM-Pacman_Shell": pacmanMaterials.blue,
  "CAM-Pacman_Bottom_electronic": pacmanMaterials.white,
  "CAM-Pacman_Top_electronic": pacmanMaterials.white,
  "CAM-Pacman_Bottom_Text": pacmanMaterials.white,
  "CAM-Pacman_Top_Text": pacmanMaterials.white,
  default: pacmanMaterials.blue,
};

// Glass Transmission Material Variations for different ghost types
export const createGlassGhostMaterial = (
  options: {
    color?: number;
    transmission?: number;
    thickness?: number;
    roughness?: number;
    ior?: number;
  } = {}
) => {
  return new THREE.MeshPhysicalMaterial({
    // Base properties
    color: options.color || 0xffffff,
    transparent: true,
    opacity: 1,

    // Glass properties
    transmission: options.transmission || 1.0,
    thickness: options.thickness || 0.2,
    roughness: options.roughness || 0.0,
    metalness: 0.0,

    // Index of refraction
    ior: options.ior || 1.2,

    // Advanced glass effects
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,

    // Rendering properties
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,

    // Environment interaction
    envMapIntensity: 1.0,
  });
};

// Different ghost material variations
export const ghostMaterials = {
  ghost1: createGlassGhostMaterial({ color: 0xffffff, thickness: 0.15 }), // Pure glass
  ghost2: createGlassGhostMaterial({ color: 0xf0f8ff, thickness: 0.2 }), // Slight blue tint
  ghost3: createGlassGhostMaterial({ color: 0xf8f8ff, thickness: 0.25 }), // Slight purple tint
  ghost4: createGlassGhostMaterial({ color: 0xfffafa, thickness: 0.18 }), // Slight pink tint
  ghost5: createGlassGhostMaterial({ color: 0xf5fffa, thickness: 0.22 }), // Slight green tint
};

// Ghost Cover Materials - keep backwards compatibility
export const ghostCoverMaterials = Array(5).fill(ghostMaterial);
