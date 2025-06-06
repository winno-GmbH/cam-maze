import * as THREE from 'three';

// Camera Configuration
export const CAMERA_CONFIG = {
  originalFOV: 50,
  wideFOV: 80,
  near: 0.001,
  far: 1000
};

// Mobile Detection
export const isMobile = window.innerWidth < 768;

// Camera Positions
export const CAMERA_POSITIONS = {
  startMobile: new THREE.Vector3(0.5, 2.5, 2.5),
  startDesktop: new THREE.Vector3(-2, 2.5, 2),
  secondMobile: new THREE.Vector3(0.5, 2.5, 2),
  secondDesktop: new THREE.Vector3(-1.5, 3, 2),
  mobileLookAt: new THREE.Vector3(0.5, 0.5, -1.5),
  desktopLookAt: new THREE.Vector3(-1.25, 0.5, 0.25)
};

// Get correct positions based on device
export const startPosition = isMobile ? CAMERA_POSITIONS.startMobile : CAMERA_POSITIONS.startDesktop;
export const secondPosition = isMobile ? CAMERA_POSITIONS.secondMobile : CAMERA_POSITIONS.secondDesktop;
export const lookAtPosition = isMobile ? CAMERA_POSITIONS.mobileLookAt : CAMERA_POSITIONS.desktopLookAt;

// Animation Configuration
export const ANIMATION_CONFIG = {
  GHOST_TEXT_START: 0.2,
  CAM_TEXT_START: 0.3,
  FADE_OUT_START: 0.8,
  TRIGGER_DISTANCE: 0.02,
  startEndScreenSectionProgress: 0.8,
  rotationStartingPoint: 0.973,
  scrollDebounceDelay: 0
};

// Shader Configuration
export const SHADER_CONFIG = {
  vertexShader: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vPosition;
    uniform float mixValue;
    void main() {
      float factor = (vPosition.y + 1.0) / 2.0;
      vec3 colorA = vec3(0.0, 0.0, 1.0);
      vec3 colorB = vec3(0.0, 1.0, 1.0);
      vec3 colorC = vec3(1.0, 0.0, 0.0);
      vec3 colorD = vec3(1.0, 1.0, 0.0);
      
      vec3 gradientA = mix(colorA, colorB, factor);
      vec3 gradientB = mix(colorC, colorD, factor);
      
      vec3 finalColor = mix(gradientA, gradientB, mixValue);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Asset URLs
export const ASSETS = {
  mazeTexture: "https://c-am.b-cdn.net/CAM/matcap24.png",
  mazeModel: "https://c-am.b-cdn.net/CAM/c-am-assets-3.glb"
};

// DOM Selectors
export const SELECTORS = {
  mazeContainer: ".el--home-maze.el",
  scrollComponent: ".cmp--scroll",
  introSection: ".sc--intro",
  homeSection: ".sc--home",
  povSection: ".sc--pov",
  finalSection: ".sc--final.sc",
  parentElements: ".cmp--pov.cmp"
};

// Special Points
export const SPECIAL_POINTS = {
  homeEndPoint: new THREE.Vector3(0.55675, 0.5, 0.45175),
  povStartPoint1: new THREE.Vector3(0.55675, -5, 0.45175),
  povStartPoint2: new THREE.Vector3(0.55675, -2.5, 0.45175),
  startRotationPoint: new THREE.Vector3(0.55675, 0.55, 1.306),
  endRotationPoint: new THREE.Vector3(-0.14675, 1, 1.8085),
  targetLookAt: new THREE.Vector3(0.55675, 0.1, 1.306),
  finalLookAt: new THREE.Vector3(-0.14675, 0, 1.8085),
  reverseFinalLookAt: new THREE.Vector3(7.395407041377711, 0.9578031302345096, -4.312450290270135)
};