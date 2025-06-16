import * as THREE from "three";

export const isMobile = window.innerWidth < 768;

export const CAMERA_CONFIG = {
  originalFOV: 50,
  wideFOV: 80,
  near: 0.001,
  far: 1000,
};

export const ASSETS = {
  mazeTexture: "https://c-am.b-cdn.net/CAM/matcap24.png",
  mazeModel: "https://c-am.b-cdn.net/CAM/c-am-assets-3.glb",
};

export const MAZE_CENTER = new THREE.Vector3(0.45175, 0.5, 0.55675);

export const POV_POSITIONS = {
  ghost1: new THREE.Vector3(0.65725, 0.55, 0.75325),
  ghost2: new THREE.Vector3(0.9085, 0.55, 0.8035),
  ghost3: new THREE.Vector3(0.75775, 0.55, 1.05475),
  ghost4: new THREE.Vector3(0.65725, 0.55, 1.0045),
  ghost5: new THREE.Vector3(0.15475, 0.55, 1.15525),
};

export const CAMERA_POSITIONS = {
  startMobile: new THREE.Vector3(0.5, 2.5, 2.5),
  startDesktop: new THREE.Vector3(-2, 2.5, 2),
  secondMobile: new THREE.Vector3(0.5, 2.5, 2),
  secondDesktop: new THREE.Vector3(-1.5, 3, 2),
  mobileLookAt: new THREE.Vector3(0.5, 0.5, -1.5),
  desktopLookAt: new THREE.Vector3(-1.25, 0.5, 0.25),
};

export const startPosition = isMobile
  ? CAMERA_POSITIONS.startMobile
  : CAMERA_POSITIONS.startDesktop;
export const secondPosition = isMobile
  ? CAMERA_POSITIONS.secondMobile
  : CAMERA_POSITIONS.secondDesktop;
export const lookAtPosition = isMobile
  ? CAMERA_POSITIONS.mobileLookAt
  : CAMERA_POSITIONS.desktopLookAt;

// DOM Selectors
export const SELECTORS = {
  mazeContainer: ".el--home-maze.el",
  homeSection: ".sc--home.sc",
  introSection: ".sc--intro.sc",
  povSection: ".sc--pov.sc",
  finalSection: ".sc--final.sc",
  scrollComponent: ".cmp--scroll.cmp",
  parentElements: ".cmp--pov.cmp",
  pov: ".pov",
  cam: ".cam",
  finalContainer: ".cr--final.cr",
};

// DOM Elements
export const DOM_ELEMENTS = {
  mazeContainer: document.querySelector(SELECTORS.mazeContainer) as HTMLElement,
  canvas: document.querySelector("canvas") as HTMLCanvasElement,
  finalSection: document.querySelector(SELECTORS.finalSection) as HTMLElement,
  finalContainer: document.querySelector(
    SELECTORS.finalContainer
  ) as HTMLElement,
  parentElements: document.querySelectorAll(
    SELECTORS.parentElements
  ) as NodeListOf<Element>,
};
