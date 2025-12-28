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

// Simple semi-transparent orange material for pill shell (no glass properties)
const pillOrangeGlass = new THREE.MeshStandardMaterial({
  color: 0xff6600, // Orange
  opacity: 0.6,
  transparent: true,
  roughness: 0.5,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

// Black material for inner elements (will appear orange-tinted through the glass)
const pillInnerBlack = new THREE.MeshStandardMaterial({
  color: 0x000000, // Black
  roughness: 0.5,
  metalness: 0.1,
});

const pillMaterials = {
  shell: pillOrangeGlass,
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
