import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { MAZE_CENTER } from "../config/config";

const curveHeight = 0.75;
const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];
const ghostDurations = [0.36, 0.36, 0.36, 0.36, 0.36, 0.36];

let scrollAnimationCurves: Record<
  string,
  {
    curveToCenter: THREE.QuadraticBezierCurve3;
    curveFromCenter: THREE.QuadraticBezierCurve3;
    start: number;
    duration: number;
    startPos: THREE.Vector3;
  }
> = {};
let isScrollActive = false;
let lastAnimatedT: number = 0;
let previousT: number = 0;

export function startHomeScrollAnimation() {
  isScrollActive = true;
  scrollAnimationCurves = {};
  ghostOrder.forEach((key, i) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const startPos = obj.position.clone();
    const midToCenter = startPos.clone().lerp(MAZE_CENTER, 0.5);
    midToCenter.y += curveHeight;
    const curveToCenter = new THREE.QuadraticBezierCurve3(
      startPos,
      midToCenter,
      MAZE_CENTER.clone()
    );
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
      start: 0,
      duration: ghostDurations[i],
      startPos,
    };
  });
  lastAnimatedT = 0;
  previousT = 0;
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  // Only update if we're moving forward (handles scrub delay)
  if (animatedT < previousT) {
    return;
  }

  previousT = animatedT;
  lastAnimatedT = animatedT;

  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;

    let t = animatedT / anim.duration;
    t = Math.max(0, Math.min(1, t));

    let pos: THREE.Vector3;
    // Use the appropriate curve based on whether we're going to or from center
    if (t <= 1) {
      // Moving to center
      pos = anim.curveToCenter.getPoint(t);
      obj.lookAt(MAZE_CENTER);
    } else {
      // This shouldn't happen with current setup, but just in case
      pos = anim.curveFromCenter.getPoint(1);
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
}
