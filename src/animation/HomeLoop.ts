import { ghosts } from "../core/objects";
import { getHomePaths } from "../paths/paths";
import { onFrame, clock } from "../core/scene";
import * as THREE from "three";
import { calculateObjectOrientation } from "./util";
import { initHomeScrollAnimation } from "./HomeScroll";

const LOOP_DURATION = 50;
let isHomeLoopActive = true;
let animationTime = 0;
let pausedT = 0;
let pausedPositions: Record<string, THREE.Vector3> = {};
let pausedRotations: Record<string, THREE.Quaternion> = {};
let homeLoopFrameRegistered = false;

function getCurrentScrollProgress(): number {
  // Get the .sc--home section
  const section = document.querySelector(".sc--home") as HTMLElement;
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  // Calculate progress: 0 at top, 1 at bottom
  const totalScroll = rect.height - windowHeight;
  if (totalScroll <= 0) return 0;
  const scrolled = Math.min(Math.max(-rect.top, 0), totalScroll);
  return scrolled / totalScroll;
}

function stopHomeLoop() {
  if (!isHomeLoopActive) return;
  isHomeLoopActive = false;
  pausedT = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  pausedPositions = {};
  pausedRotations = {};

  // Get the current scroll progress (0 to 1)
  const scrollProgress = getCurrentScrollProgress();

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      // Use the path to get the correct position for the current scroll progress
      pausedPositions[key] = path.getPointAt(scrollProgress).clone();
      pausedRotations[key] = ghost.quaternion.clone();
    }
  });
  initHomeScrollAnimation(pausedPositions, pausedRotations);
}

function startHomeLoop() {
  isHomeLoopActive = true;
  animationTime = pausedT * LOOP_DURATION;

  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(0);
      if (position) ghost.position.copy(position);
    }
  });

  if (!homeLoopFrameRegistered) {
    onFrame(() => updateHomeLoop(clock.getDelta()));
    homeLoopFrameRegistered = true;
  }
}

function updateHomeLoop(delta: number) {
  if (!isHomeLoopActive) return;
  animationTime += delta;
  const t = (animationTime % LOOP_DURATION) / LOOP_DURATION;
  const homePaths = getHomePaths();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = homePaths[key];
    if (path) {
      const position = path.getPointAt(t);
      const tangent = path.getTangentAt(t);
      if (position) ghost.position.copy(position);
      if (tangent && tangent.length() > 0) {
        const objectType = key === "pacman" ? "pacman" : "ghost";
        calculateObjectOrientation(ghost, tangent, objectType);
      }
    }
  });
}

export function HomeLoopHandler() {
  if (window.scrollY === 0) {
    startHomeLoop();
  }
}
export function setupHomeLoopScrollHandler() {
  window.addEventListener("scroll", () => {
    if (window.scrollY !== 0) {
      stopHomeLoop();
    }
  });
}
