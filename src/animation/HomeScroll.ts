import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { MAZE_CENTER } from "../config/config";

const curveHeight = 0.75;
const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];

let scrollAnimationCurves: Record<
  string,
  {
    curveToCenter: THREE.QuadraticBezierCurve3;
    curveFromCenter: THREE.QuadraticBezierCurve3;
    startPos: THREE.Vector3;
  }
> = {};
let isScrollActive = false;
let lastAnimatedT: number = 0;
let previousT: number = 0;
let isScrubCatchingUp = false;
let targetT: number = 0;
let lastDirection: "forward" | "backward" = "forward";

export function startHomeScrollAnimation() {
  isScrollActive = true;
  isScrubCatchingUp = false;
  lastDirection = "forward";
  scrollAnimationCurves = {};

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;

    const startPos = obj.position.clone();

    // Create curve from start position to center
    const midToCenter = startPos.clone().lerp(MAZE_CENTER, 0.5);
    midToCenter.y += curveHeight;
    const curveToCenter = new THREE.QuadraticBezierCurve3(
      startPos,
      midToCenter,
      MAZE_CENTER.clone()
    );

    // Create curve from center back to start position
    const midFromCenter = MAZE_CENTER.clone().lerp(startPos, 0.5);
    midFromCenter.y += curveHeight;
    const curveFromCenter = new THREE.QuadraticBezierCurve3(
      MAZE_CENTER.clone(),
      midFromCenter,
      startPos
    );

    scrollAnimationCurves[key] = {
      curveToCenter,
      curveFromCenter,
      startPos,
    };
  });

  lastAnimatedT = 0;
  previousT = 0;
  targetT = 0;
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  // Handle GSAP scrub delay
  if (animatedT < previousT) {
    isScrubCatchingUp = true;
    targetT = animatedT;
    return;
  } else if (isScrubCatchingUp && animatedT >= targetT) {
    isScrubCatchingUp = false;
  }

  if (isScrubCatchingUp && animatedT < targetT) {
    return;
  }

  // Determine direction
  if (animatedT > lastAnimatedT) {
    lastDirection = "forward";
  } else if (animatedT < lastAnimatedT) {
    lastDirection = "backward";
  }

  previousT = animatedT;
  lastAnimatedT = animatedT;

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;

    let t = Math.max(0, Math.min(1, animatedT));
    let pos: THREE.Vector3;

    if (lastDirection === "forward") {
      // Moving forward: from start to center
      pos = anim.curveToCenter.getPoint(t);
      obj.lookAt(MAZE_CENTER);
    } else {
      // Moving backward: from center back to start
      pos = anim.curveFromCenter.getPoint(1 - t);
      obj.lookAt(anim.startPos);
    }

    obj.position.copy(pos);
  });

  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function stopHomeScrollAnimation() {
  isScrollActive = false;
  lastAnimatedT = 0;
  previousT = 0;
  isScrubCatchingUp = false;
  targetT = 0;
  lastDirection = "forward";
}

// Export the scrub state so main.ts can check it
export function isScrubStillCatchingUp(): boolean {
  return isScrubCatchingUp;
}
