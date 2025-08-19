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
  opacity: 1,
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

// @philipp - comment out the comments to change colors

export const materialMap = {
  CAM_Pacman_Backframe: pacmanMaterials.blue,
  "CAM-Pacman_Bitcoin_1": pacmanMaterials.white,
  "CAM-Pacman_Bitcoin_2": pacmanMaterials.white,
  "CAM-Pacman_Bottom": pacmanMaterials.blue,
  "CAM-Pacman_Top": pacmanMaterials.blue,
  "CAM-Pacman_Eye": pacmanMaterials.white,
  // CAM_Pacman_Logo_1: pacmanMaterials.blue, // logo in the back, left side
  // CAM_Pacman_Logo_2: pacmanMaterials.blue, // logo in the back, right side
  CAM_Pacman_Logo_1: pacmanMaterials.white,
  CAM_Pacman_Logo_2: pacmanMaterials.white,
  "CAM-Pacman_Shell_Boolean": pacmanMaterials.blue,
  "CAM-Pacman_Shell": pacmanMaterials.blue,
  // "CAM-Pacman_Bottom_electronic": pacmanMaterials.blue,
  // "CAM-Pacman_Top_electronic": pacmanMaterials.blue,
  "CAM-Pacman_Bottom_electronic": pacmanMaterials.white, // bitcoin in the middle, left side
  "CAM-Pacman_Top_electronic": pacmanMaterials.white, // bitcoin in the middle, right side
  "CAM-Pacman_Bottom_Text": pacmanMaterials.white,
  "CAM-Pacman_Top_Text": pacmanMaterials.white,
  // "CAM-Pacman_Bottom_Text": pacmanMaterials.blue, // text on the bottom of pacman
  // "CAM-Pacman_Top_Text": pacmanMaterials.blue, // text on the top of pacman
  default: pacmanMaterials.blue,
};
