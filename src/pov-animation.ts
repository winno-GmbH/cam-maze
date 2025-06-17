import * as THREE from "three";
import { camera } from "./camera";
import { ghosts } from "./objects";
import { DOM_ELEMENTS } from "./selectors";

// --- POV Path Definitions (from backup.js) ---
// (You can move these to a config if you want)
const cameraPOVPathPoints = [
  { pos: new THREE.Vector3(0.55675, 0.35, 0.45175) },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.6025) },
  { pos: new THREE.Vector3(0.607, 0.55, 0.703) },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325) },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035) },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035) },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.85375) },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525) },
  { pos: new THREE.Vector3(0.9085, 0.55, 1.2055) },
  { pos: new THREE.Vector3(0.808, 0.55, 1.2055) },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.15525) },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.05475) },
  { pos: new THREE.Vector3(0.7075, 0.55, 1.0045) },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045) },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475) },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.15525) },
  { pos: new THREE.Vector3(0.205, 0.55, 1.2055) },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055) },
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306) },
  { pos: new THREE.Vector3(-0.44825, 1, 2.0095) },
];

// Example: ghost1 path (add others as needed)
const ghost1POVPathPoints = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703) },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325) },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035) },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035) },
];

function createPOVPath(
  points: { pos: THREE.Vector3 }[]
): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve3(points[i].pos, points[i + 1].pos));
  }
  return path;
}

const cameraPOVPath = createPOVPath(cameraPOVPathPoints);
const ghostPOVPaths = {
  ghost1: createPOVPath(ghost1POVPathPoints),
  // ghost2, ghost3, ...
};

// --- Trigger structure (simplified for now) ---
const triggers = [
  {
    ghostKey: "ghost1",
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    camTextPos: new THREE.Vector3(0.75775, 0.55, 0.8035),
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
    parent: null, // assign DOM element later
  },
  // ... weitere Ghosts
];

// --- Main update function (to be called in animation loop) ---
export function updatePOVAnimation(progress: number) {
  // 1. Move camera along cameraPOVPath
  const camPos = cameraPOVPath.getPointAt(progress);
  camera.position.copy(camPos);

  // 2. Move ghosts along their paths (add fade logic next)
  triggers.forEach((trigger) => {
    const ghost = ghosts[trigger.ghostKey];
    if (!ghost) return;
    const ghostPath = (
      ghostPOVPaths as Record<string, THREE.CurvePath<THREE.Vector3>>
    )[trigger.ghostKey];
    if (!ghostPath) return;
    // For now, just move ghost to start of path
    ghost.position.copy(ghostPath.getPointAt(progress));
    // TODO: Add fade in/out logic and DOM logic
  });
}

// --- POV ScrollTrigger Setup ---
export async function initPOVAnimationSystem() {
  // Dynamically import GSAP
  const gsapModule = await import("gsap");
  const scrollTriggerModule = await import("gsap/ScrollTrigger");
  const gsap = gsapModule.gsap || gsapModule.default;
  const ScrollTrigger =
    scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
  gsap.registerPlugin(ScrollTrigger);

  // Setup ScrollTrigger for .sc--pov
  ScrollTrigger.create({
    trigger: ".sc--pov",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.3,
    onUpdate: (self) => {
      // Progress von 0 (top top) bis 1 (bottom bottom)
      const progress = self.progress;
      updatePOVAnimation(progress);
    },
  });
}
