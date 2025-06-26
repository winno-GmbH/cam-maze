import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";

const mazeCenter = new THREE.Vector3(0, 0.5, 0); // Adjust as needed
const curveHeight = 2.5;
const ghostOrder = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5", "pacman"];
const ghostDelays = [0.0, 0.08, 0.16, 0.24, 0.32, 0.44];
const ghostDurations = [0.36, 0.36, 0.36, 0.36, 0.36, 0.36];

let scrollAnimationCurves: Record<
  string,
  {
    curve: THREE.QuadraticBezierCurve3;
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
    const mid = startPos.clone().lerp(mazeCenter, 0.5);
    mid.y += curveHeight;
    const curve = new THREE.QuadraticBezierCurve3(
      startPos,
      mid,
      mazeCenter.clone()
    );
    scrollAnimationCurves[key] = {
      curve,
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
  if (animatedT < lastAnimatedT) return;
  lastAnimatedT = animatedT;
  ghostOrder.forEach((key) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;
    let t = (animatedT - anim.start) / anim.duration;
    t = Math.max(0, Math.min(1, t));
    const pos = anim.curve.getPoint(t);
    obj.position.copy(pos);
    obj.lookAt(mazeCenter);
  });
  const delta = clock.getDelta();
  if (pacmanMixer) pacmanMixer.update(delta);
}

export function stopHomeScrollAnimation() {
  isScrollActive = false;
  lastAnimatedT = 0;
}
