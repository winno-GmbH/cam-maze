import * as THREE from 'three';
import { MaterialMap } from './types';
export declare const mazeTexture: THREE.Texture;
export declare const mazeMaterial: THREE.MeshMatcapMaterial;
export declare const topMaterial: THREE.MeshStandardMaterial;
export declare const ghostMaterial: THREE.MeshPhysicalMaterial;
export declare const floorMaterial: THREE.MeshStandardMaterial;
export declare const pacmanShaderMaterial: THREE.ShaderMaterial;
export declare const pacmanMaterials: {
    blue: THREE.MeshBasicMaterial;
    white: THREE.MeshBasicMaterial;
    default: THREE.MeshBasicMaterial;
};
export declare const materialMap: MaterialMap;
export declare const ghostCoverMaterials: any[];
