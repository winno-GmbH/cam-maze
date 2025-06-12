import * as THREE from "three";
import { useControls } from "leva";
import { ghostMaterials } from "./materials";

// Material Controls Interface
interface MaterialControlsType {
  thickness: number;
  roughness: number;
  transmission: number;
  ior: number;
  chromaticAberration: number;
  backside: boolean;
  opacity: number;
  envMapIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  reflectivity: number;
}

// Default material properties
const defaultProps: MaterialControlsType = {
  thickness: 0.2,
  roughness: 0,
  transmission: 1,
  ior: 1.2,
  chromaticAberration: 0.02,
  backside: true,
  opacity: 0.3,
  envMapIntensity: 2.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.0,
  reflectivity: 0.9,
};

// Create Leva Controls
export function createMaterialControls() {
  return useControls("Glass Material", {
    // Basic glass properties
    thickness: { value: defaultProps.thickness, min: 0, max: 3, step: 0.05 },
    roughness: { value: defaultProps.roughness, min: 0, max: 1, step: 0.01 },
    transmission: {
      value: defaultProps.transmission,
      min: 0,
      max: 1,
      step: 0.01,
    },
    ior: { value: defaultProps.ior, min: 0, max: 3, step: 0.01 },

    // Advanced effects
    chromaticAberration: {
      value: defaultProps.chromaticAberration,
      min: 0,
      max: 1,
      step: 0.001,
    },
    backside: { value: defaultProps.backside },

    // Visual properties
    opacity: { value: defaultProps.opacity, min: 0, max: 1, step: 0.01 },
    envMapIntensity: {
      value: defaultProps.envMapIntensity,
      min: 0,
      max: 5,
      step: 0.1,
    },

    // Clearcoat properties
    clearcoat: { value: defaultProps.clearcoat, min: 0, max: 1, step: 0.01 },
    clearcoatRoughness: {
      value: defaultProps.clearcoatRoughness,
      min: 0,
      max: 1,
      step: 0.01,
    },

    // Reflection
    reflectivity: {
      value: defaultProps.reflectivity,
      min: 0,
      max: 1,
      step: 0.01,
    },
  });
}

// Apply controls to material
export function applyMaterialControls(
  material: THREE.MeshPhysicalMaterial,
  controls: MaterialControlsType
) {
  // Basic properties
  material.roughness = controls.roughness;
  material.transmission = controls.transmission;
  material.ior = controls.ior;
  material.opacity = controls.opacity;
  material.transparent = controls.opacity < 1.0;

  // Advanced properties
  material.envMapIntensity = controls.envMapIntensity;
  material.clearcoat = controls.clearcoat;
  material.clearcoatRoughness = controls.clearcoatRoughness;
  material.reflectivity = controls.reflectivity;

  // Rendering properties
  material.side = controls.backside ? THREE.DoubleSide : THREE.FrontSide;

  // Note: thickness and chromaticAberration are not native Three.js properties
  // These would need custom shader implementation for full MeshTransmissionMaterial behavior

  material.needsUpdate = true;
}

// Update all ghost materials with controls
export function updateGhostMaterials(controls: MaterialControlsType) {
  Object.values(ghostMaterials).forEach((material) => {
    if (material instanceof THREE.MeshPhysicalMaterial) {
      applyMaterialControls(material, controls);
    }
  });
}

// Development helper: Create test sphere with controlled material
export function createTestGlassSphere(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: defaultProps.opacity,
    transmission: defaultProps.transmission,
    roughness: defaultProps.roughness,
    metalness: 0.0,
    ior: defaultProps.ior,
    clearcoat: defaultProps.clearcoat,
    clearcoatRoughness: defaultProps.clearcoatRoughness,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    envMapIntensity: defaultProps.envMapIntensity,
    reflectivity: defaultProps.reflectivity,
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(0, 1, 0);
  scene.add(sphere);

  return sphere;
}

// Export for use in main application
export { defaultProps };
export type { MaterialControlsType };
