import * as THREE from "three";
import { SELECTORS, isMobile } from "./config";

// Scene Setup
export const scene = new THREE.Scene();

// Renderer Setup
export const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
  precision: "highp",
});

// Container
const container = document.querySelector(".el--home-maze.el") as HTMLElement;
if (!container) {
  console.error("Container .el--home-maze.el not found!");
}

// Clock for animations
export const clock = new THREE.Clock();

// Anti-aliasing Enhancement
function enhanceAntiAliasing(): void {
  if (isMobile) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  } else {
    renderer.setPixelRatio(window.devicePixelRatio);
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

// Pixel Ratio Setup - ADDED to match backup.js
function setPixelRatio(): void {
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 2 : 3);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Initialize Renderer - FIXED to match backup.js
export function initRenderer(): void {
  enhanceAntiAliasing();

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  if (container) {
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
  } else {
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
  }

  // ADD these event listeners to match backup.js:
  // Use DOMContentLoaded instead of load to prevent Slater warnings
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setPixelRatio);
  } else {
    // DOMContentLoaded has already fired, execute immediately
    setPixelRatio();
  }
  window.addEventListener("resize", setPixelRatio);
}

// Lighting Setup
export function setupLighting(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  scene.add(directionalLight);
  directionalLight.position.set(-5, 15, 10);
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.bias = -0.001;
  directionalLight.shadow.radius = 3;
  directionalLight.castShadow = true;
}

// Canvas and DOM Elements
export const canvas = document.querySelector("canvas") as HTMLCanvasElement;
export const finalSection = document.querySelector(
  SELECTORS.finalSection
) as HTMLElement;
export const finalContainer = finalSection?.querySelector(
  ".cr--final.cr"
) as HTMLElement;
export const parentElements = document.querySelectorAll(
  SELECTORS.parentElements
) as NodeListOf<Element>;
