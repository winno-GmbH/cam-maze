import { CAMERA_POSITIONS } from "../paths/pathpoints";

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

export const startPosition = isMobile
  ? CAMERA_POSITIONS.startMobile
  : CAMERA_POSITIONS.startDesktop;
export const secondPosition = isMobile
  ? CAMERA_POSITIONS.secondMobile
  : CAMERA_POSITIONS.secondDesktop;
export const lookAtPosition = isMobile
  ? CAMERA_POSITIONS.mobileLookAt
  : CAMERA_POSITIONS.desktopLookAt;
