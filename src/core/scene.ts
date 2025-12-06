import * as THREE from "three";
import { isMobile } from "../config/config";
import { DOM_ELEMENTS } from "../config/dom-elements";
import { camera } from "./camera";

export const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
  precision: "highp",
});

const clock = new THREE.Clock();
const frameCallbacks: (() => void)[] = [];

export function initRenderer(): void {
  enhanceAntiAliasing();

  if (DOM_ELEMENTS.mazeContainer) {
    renderer.setSize(
      DOM_ELEMENTS.mazeContainer.clientWidth,
      DOM_ELEMENTS.mazeContainer.clientHeight
    );
    DOM_ELEMENTS.mazeContainer.appendChild(renderer.domElement);
  } else {
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
  }

  setPixelRatio();
  window.addEventListener("resize", setPixelRatio);

  renderer.render(scene, camera);
}

function enhanceAntiAliasing(): void {
  if (isMobile) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  } else {
    renderer.setPixelRatio(window.devicePixelRatio);
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function setPixelRatio(): void {
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 2 : 3);
  renderer.setPixelRatio(pixelRatio);

  if (DOM_ELEMENTS.mazeContainer) {
    renderer.setSize(
      DOM_ELEMENTS.mazeContainer.clientWidth,
      DOM_ELEMENTS.mazeContainer.clientHeight
    );
    camera.aspect =
      DOM_ELEMENTS.mazeContainer.clientWidth /
      DOM_ELEMENTS.mazeContainer.clientHeight;
  } else {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
  }

  camera.updateProjectionMatrix();
}

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

let throttleFactor = 1.0;
let artificialDelay = 0;
let lastThrottledFrameTime = 0;

export function startRenderLoop(): void {
  const render = () => {
    const now = performance.now();
    const elapsed = now - lastThrottledFrameTime;
    const targetFrameTime = (1000 / 60) * throttleFactor;

    if (elapsed >= targetFrameTime) {
      frameCallbacks.forEach((callback) => callback());

      renderer.render(scene, camera);
      lastThrottledFrameTime = now;

      if (artificialDelay > 0) {
        const start = performance.now();
        while (performance.now() - start < artificialDelay) {}
      }
    }

    requestAnimationFrame(render);
  };
  lastThrottledFrameTime = performance.now();
  render();
}

export function setRenderThrottle(factor: number, delay: number): void {
  throttleFactor = Math.max(0.1, Math.min(10, factor));
  artificialDelay = Math.max(0, delay);
  lastThrottledFrameTime = 0;
}

export function resetRenderThrottle(): void {
  throttleFactor = 1.0;
  artificialDelay = 0;
  lastThrottledFrameTime = 0;
}

export function onFrame(callback: () => void): void {
  frameCallbacks.push(callback);
}

export { renderer, clock };
