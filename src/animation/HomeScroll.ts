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

export function startHomeScrollAnimation() {
  isScrollActive = true;
  isScrubCatchingUp = false;
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
    // GSAP is catching up (scrub delay), pause animation
    isScrubCatchingUp = true;
    targetT = animatedT;
    return;
  } else if (isScrubCatchingUp && animatedT >= targetT) {
    // Scrub has caught up, resume animation
    isScrubCatchingUp = false;
  }

  // Only update if we're moving forward or at the target
  if (isScrubCatchingUp && animatedT < targetT) {
    return;
  }

  previousT = animatedT;
  lastAnimatedT = animatedT;

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;

    // Use animatedT directly (0 to 1) without duration scaling
    let t = animatedT;
    t = Math.max(0, Math.min(1, t));

    let pos: THREE.Vector3;
    // Use different curves for different parts of the animation
    if (t <= 0.5) {
      // First half: moving to center (t goes from 0 to 0.5, map to 0 to 1)
      const curveT = t * 2;
      pos = anim.curveToCenter.getPoint(curveT);
      obj.lookAt(MAZE_CENTER);
    } else {
      // Second half: moving from center back to start (t goes from 0.5 to 1, map to 0 to 1)
      const curveT = (t - 0.5) * 2;
      pos = anim.curveFromCenter.getPoint(curveT);
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
}

// Export the scrub state so main.ts can check it
export function isScrubStillCatchingUp(): boolean {
  return isScrubCatchingUp;
}
