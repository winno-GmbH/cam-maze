import * as THREE from "three";
import { ASSETS } from "../config/config";

const textureLoader = new THREE.TextureLoader();

const mazeTexture = textureLoader.load(ASSETS.mazeTexture);

export const mazeMaterial = new THREE.MeshMatcapMaterial({
  matcap: mazeTexture,
});

export const topMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2f9f9,
  metalness: 0.4,
  roughness: 0,
  envMapIntensity: 10,
});

export const ghostMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  opacity: 0.9999,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.NormalBlending,
  side: THREE.DoubleSide,
  roughness: 0.75,
  metalness: 0.2,
  transmission: 0.5,
});

export const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  opacity: 0.8,
  transparent: true,
  roughness: 0.5,
  metalness: 0.1,
});

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

// High-quality orange glass material for pill shell with reflections and realistic glass properties
const pillOrangeGlass = new THREE.MeshPhysicalMaterial({
  color: 0xff6600, // Orange
  opacity: 0.85, // Visible but still transparent
  transparent: true,
  transmission: 0.9, // High transmission for glass effect, but not 1.0 to keep some color
  roughness: 0.05, // Very smooth for reflections, but slight roughness prevents complete invisibility
  metalness: 0.0,
  clearcoat: 1.0, // High clearcoat for glossy finish
  clearcoatRoughness: 0.05, // Very smooth clearcoat
  ior: 1.5, // Index of refraction for realistic glass (typical glass value)
  thickness: 0.5, // Thickness for realistic glass refraction
  side: THREE.DoubleSide,
  envMapIntensity: 2.0, // Higher intensity for stronger reflections if envMap is available
  reflectivity: 0.9, // High reflectivity for mirror-like reflections
});

// Orange material for Bitcoin in center
const pillBitcoinOrange = new THREE.MeshStandardMaterial({
  color: 0xff6600, // Orange - same as glass
  roughness: 0.3,
  metalness: 0.2,
});

// Black material for inner elements (will appear orange-tinted through the glass)
const pillInnerBlack = new THREE.MeshStandardMaterial({
  color: 0x000000, // Black
  roughness: 0.5,
  metalness: 0.1,
});

const pillMaterials = {
  shell: pillOrangeGlass,
  bitcoin: pillBitcoinOrange, // Bitcoin is fully orange
  default: pillInnerBlack, // Inner elements are black
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

export const pillMaterialMap = {
  shell: pillMaterials.shell,
  default: pillMaterials.default,
};
