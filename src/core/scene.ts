import * as THREE from "three";
import { isMobile } from "../config/config";
import { DOM_ELEMENTS } from "../config/dom-elements";
import { camera } from "./camera";

export const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
  precision: "mediump",
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }
  renderer.shadowMap.enabled = false;
}

function setPixelRatio(): void {
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
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
  directionalLight.castShadow = false;
}

export function startRenderLoop(): void {
  const { performanceProfiler } = require("./performance-profiler");

  const render = () => {
    performanceProfiler.start("frame-callbacks");
    for (let i = 0; i < frameCallbacks.length; i++) {
      frameCallbacks[i]();
    }
    performanceProfiler.end("frame-callbacks");

    performanceProfiler.start("renderer-render");
    renderer.render(scene, camera);
    performanceProfiler.end("renderer-render");

    requestAnimationFrame(render);
  };
  render();
}

export function onFrame(callback: () => void): void {
  frameCallbacks.push(callback);
}

export { renderer, clock };
