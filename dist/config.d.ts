import * as THREE from 'three';
export declare const CAMERA_CONFIG: {
    originalFOV: number;
    wideFOV: number;
    near: number;
    far: number;
};
export declare const isMobile: boolean;
export declare const CAMERA_POSITIONS: {
    startMobile: THREE.Vector3;
    startDesktop: THREE.Vector3;
    secondMobile: THREE.Vector3;
    secondDesktop: THREE.Vector3;
    mobileLookAt: THREE.Vector3;
    desktopLookAt: THREE.Vector3;
};
export declare const startPosition: THREE.Vector3;
export declare const secondPosition: THREE.Vector3;
export declare const lookAtPosition: THREE.Vector3;
export declare const ANIMATION_CONFIG: {
    GHOST_TEXT_START: number;
    CAM_TEXT_START: number;
    FADE_OUT_START: number;
    TRIGGER_DISTANCE: number;
    startEndScreenSectionProgress: number;
    rotationStartingPoint: number;
    scrollDebounceDelay: number;
};
export declare const SHADER_CONFIG: {
    vertexShader: string;
    fragmentShader: string;
};
export declare const ASSETS: {
    mazeTexture: string;
    mazeModel: string;
};
export declare const SELECTORS: {
    mazeContainer: string;
    scrollComponent: string;
    introSection: string;
    homeSection: string;
    povSection: string;
    finalSection: string;
    parentElements: string;
};
export declare const SPECIAL_POINTS: {
    homeEndPoint: THREE.Vector3;
    povStartPoint1: THREE.Vector3;
    povStartPoint2: THREE.Vector3;
    startRotationPoint: THREE.Vector3;
    endRotationPoint: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    finalLookAt: THREE.Vector3;
    reverseFinalLookAt: THREE.Vector3;
};
