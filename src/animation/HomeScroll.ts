import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { MAZE_CENTER } from "../config/config";

const curveHeight = 2.5;
const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];
const ghostDelays = [0.0, 0.08, 0.16, 0.24, 0.32, 0.44];
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
      start: ghostDelays[i],
      duration: ghostDurations[i],
      startPos,
    };
  });
  lastAnimatedT = 0;
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;
  // Prevent jump: only update if animatedT >= lastAnimatedT (i.e., GSAP scrub is done or moving forward)
  // Remove this restriction for bidirectional support
  lastAnimatedT = animatedT;
  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;
    let t = (animatedT - anim.start) / anim.duration;
    t = Math.max(0, Math.min(1, t));
    let pos: THREE.Vector3;
    if (animatedT >= lastAnimatedT) {
      // Scrolling forward: to center
      pos = anim.curveToCenter.getPoint(t);
      obj.lookAt(MAZE_CENTER);
    } else {
      // Scrolling backward: from center
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
}
