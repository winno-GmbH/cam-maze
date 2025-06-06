import * as THREE from 'three';
export declare const camera: THREE.PerspectiveCamera;
export declare function initCamera(): void;
export declare const startQuaternion: THREE.Quaternion;
export declare const endQuaternion: THREE.Quaternion;
export declare function getCameraLookAtPoint(): THREE.Vector3;
export declare function setupCameraResize(): void;
