import * as THREE from 'three';
export declare function smoothStep(x: number): number;
export declare function findClosestProgressOnPath(path: THREE.CurvePath<THREE.Vector3>, targetPoint: THREE.Vector3, samples?: number): number;
export declare function getCurrentPacmanPosition(): {
    position: THREE.Vector3;
    tangent: THREE.Vector3;
} | null;
export declare function debugGhosts(ghosts: any, scene: THREE.Scene): void;
export declare function ensureGhostsInScene(ghosts: any, scene: THREE.Scene): void;
export declare function normalizeAngle(angle: number): number;
export declare function lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3;
export declare function debounce(func: Function, wait: number): Function;
