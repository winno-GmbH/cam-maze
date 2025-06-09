import * as THREE from "three";
import { ASSETS, SHADER_CONFIG } from "./config";
import { MaterialMap } from "./types";

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Load Textures with debugging
console.log("Loading maze texture from:", ASSETS.mazeTexture);
export const mazeTexture = textureLoader.load(
  ASSETS.mazeTexture,
  (texture) => {
    console.log("Maze texture loaded successfully:", texture);
  },
  (progress) => {
    console.log("Maze texture loading progress:", progress);
  },
  (error) => {
    console.error("Failed to load maze texture:", error);
  }
);

// Basic Materials with fallbacks
export const mazeMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00, // Bright green fallback
  map: mazeTexture,
});

// Also create a simple fallback material
export const mazeFallbackMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00, // Bright green
  wireframe: false,
});

console.log("Maze material created:", mazeMaterial);

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

// Shader Material
export const pacmanShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: SHADER_CONFIG.vertexShader,
  fragmentShader: SHADER_CONFIG.fragmentShader,
  uniforms: {
    mixValue: { value: 0.0 },
  },
});

// Pacman Materials
export const pacmanMaterials = {
  blue: new THREE.MeshBasicMaterial({ color: 0x1469d3 }),
  white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  default: new THREE.MeshBasicMaterial({ color: 0x1469d3 }),
};

// Material Mapping for Pacman Parts
export const materialMap: MaterialMap = {
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

// Ghost Cover Materials
export const ghostCoverMaterials = Array(5).fill(ghostMaterial);
