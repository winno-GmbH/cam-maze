import { pacman, ghosts, pacmanMixer } from "../core/objects";
import * as THREE from "three";
import { clock } from "../core/scene";
import { MAZE_CENTER } from "../config/config";
import gsap from "gsap";

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

export function startHomeScrollAnimation() {
  isScrollActive = true;
  scrollAnimationCurves = {};

  ghostOrder.forEach((key, index) => {
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
}

export function updateHomeScrollAnimation(animatedT: number) {
  if (!isScrollActive) return;

  ghostOrder.forEach((key, index) => {
    const obj = key === "pacman" ? pacman : ghosts[key];
    if (!obj) return;
    const anim = scrollAnimationCurves[key];
    if (!anim) return;

    // Add offset based on index (ghost1 starts first, pacman last)
    const offset = index * 0.1; // 0.1 second offset between each object
    const adjustedT = Math.max(0, Math.min(1, animatedT + offset));

    let t = Math.max(0, Math.min(1, adjustedT));
    let pos: THREE.Vector3;

    if (t <= 0.5) {
      // First half: to center
      const curveT = t * 2;
      pos = anim.curveToCenter.getPoint(curveT);
      obj.lookAt(MAZE_CENTER);
    } else {
      // Second half: from center back to start
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
}

export function isScrubStillCatchingUp(): boolean {
  return false; // No longer needed with simplified approach
}
