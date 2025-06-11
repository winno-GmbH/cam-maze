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

// Advanced Glass Shader for Ghosts
const glassVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -modelViewPosition.xyz;
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const glassFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  uniform float time;
  uniform vec3 color;
  uniform float opacity;
  uniform float fresnelPower;
  uniform float refractionRatio;
  uniform samplerCube envMap;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vViewPosition);
    
    // Fresnel effect for glass-like appearance
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), fresnelPower);
    
    // Refraction effect
    vec3 refracted = refract(-viewDirection, normal, refractionRatio);
    vec4 refractedColor = textureCube(envMap, refracted);
    
    // Reflection effect
    vec3 reflected = reflect(-viewDirection, normal);
    vec4 reflectedColor = textureCube(envMap, reflected);
    
    // Animated shimmer effect
    float shimmer = sin(time * 2.0 + vPosition.y * 10.0) * 0.1 + 0.9;
    
    // Mix refraction and reflection based on fresnel
    vec3 finalColor = mix(refractedColor.rgb, reflectedColor.rgb, fresnel);
    finalColor = mix(finalColor, color, 0.3); // Blend with base color
    finalColor *= shimmer; // Apply shimmer
    
    // Calculate final opacity with fresnel enhancement
    float finalOpacity = opacity * (0.7 + fresnel * 0.3);
    
    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

// Create environment map for glass reflections/refractions
const pmremGenerator = new THREE.PMREMGenerator(new THREE.WebGLRenderer());
const envTexture = pmremGenerator.fromScene(new THREE.Scene()).texture;

// Enhanced Glass Material with shader
export const createGlassGhostMaterial = (color = 0xffffff, opacity = 0.8) => {
  return new THREE.ShaderMaterial({
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      color: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      fresnelPower: { value: 2.0 },
      refractionRatio: { value: 0.98 },
      envMap: { value: envTexture },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
};

// Fallback Advanced Physical Glass Material (if shaders not supported)
export const createPhysicalGlassMaterial = (
  color = 0xffffff,
  opacity = 0.8
) => {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    opacity: opacity,
    transparent: true,
    transmission: 0.9, // High transmission for glass effect
    roughness: 0.05, // Very smooth for glass
    metalness: 0.0, // Glass is not metallic
    thickness: 0.5, // Glass thickness
    ior: 1.52, // Index of refraction for glass
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.0,
    clearcoat: 1.0, // Glass-like coating
    clearcoatRoughness: 0.1,
  });
};

// Different colored glass materials for each ghost
export const ghostMaterials = {
  ghost1: createGlassGhostMaterial(0xff6b6b, 0.8), // Red glass
  ghost2: createGlassGhostMaterial(0x4ecdc4, 0.8), // Cyan glass
  ghost3: createGlassGhostMaterial(0xffe66d, 0.8), // Yellow glass
  ghost4: createGlassGhostMaterial(0xa8e6cf, 0.8), // Green glass
  ghost5: createGlassGhostMaterial(0xc7ceea, 0.8), // Purple glass
};

// Fallback materials for compatibility
export const ghostMaterialsPhysical = {
  ghost1: createPhysicalGlassMaterial(0xff6b6b, 0.8),
  ghost2: createPhysicalGlassMaterial(0x4ecdc4, 0.8),
  ghost3: createPhysicalGlassMaterial(0xffe66d, 0.8),
  ghost4: createPhysicalGlassMaterial(0xa8e6cf, 0.8),
  ghost5: createPhysicalGlassMaterial(0xc7ceea, 0.8),
};

// Legacy support - default to first ghost material
export const ghostMaterial = ghostMaterials.ghost1;

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

// Ghost Cover Materials - Each ghost gets its own unique glass material
export const ghostCoverMaterials = [
  ghostMaterials.ghost1, // Red glass
  ghostMaterials.ghost2, // Cyan glass
  ghostMaterials.ghost3, // Yellow glass
  ghostMaterials.ghost4, // Green glass
  ghostMaterials.ghost5, // Purple glass
];

// Animation function to update shader time uniform for glass shimmer effect
export const updateGlassShaderTime = (time: number) => {
  Object.values(ghostMaterials).forEach((material) => {
    if (material.uniforms && material.uniforms.time) {
      material.uniforms.time.value = time;
    }
  });
};
