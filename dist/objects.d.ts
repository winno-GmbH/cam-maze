import * as THREE from 'three';
import { GhostContainer } from './types';
export declare let pacmanMixer: THREE.AnimationMixer;
export declare const pacman: THREE.Group<THREE.Object3DEventMap>;
export declare const ghosts: GhostContainer;
export declare function loadModel(): Promise<void>;
