import {
  startRenderLoop,
  initRenderer,
  setupLighting,
  scene,
} from "./core/scene";
import {
  homeLoopHandler,
  setupHomeLoopScrollHandler,
} from "./animation/home-loop";
import { initPovScrollAnimation } from "./animation/pov-scroll";
import { loadModel } from "./core/objects";
import { setupCamera, camera } from "./core/camera";
import * as THREE from "three";
import { X, XCoordKey, Z, ZCoordKey } from "./paths/coordinates";

// Declare global window interface for debug commands
declare global {
  interface Window {
    lookAt: (x: XCoordKey, y: number, z: ZCoordKey) => void;
  }
}

async function main() {
  initRenderer();
  setupLighting();
  setupCamera();
  await loadModel(scene);

  homeLoopHandler();
  setupHomeLoopScrollHandler();

  initPovScrollAnimation();

  // Add public window command for setting camera lookAt
  window.lookAt = (x: XCoordKey, y: number, z: ZCoordKey) => {
    const lookAtTarget = new THREE.Vector3(X[x], y, Z[z]);
    camera.lookAt(lookAtTarget);
    console.log(`Camera now looking at: (${x}, ${y}, ${z})`);
  };

  console.log("Debug commands available:");
  console.log("- window.lookAt(x, y, z) - Set camera lookAt direction");

  startRenderLoop();
}

main();
