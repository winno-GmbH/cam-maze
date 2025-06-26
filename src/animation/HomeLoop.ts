import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
gsap.registerPlugin(MotionPathPlugin);
import { pacman, ghosts } from "../core/objects";
import { paths } from "../paths/paths";

export function startHomeLoop() {
  // Animate Pacman along its home path
  gsap.to(pacman.position, {
    duration: 8,
    repeat: -1,
    ease: "power2.inOut",
    motionPath: {
      path: curveToPoints(paths.pacmanHome),
      autoRotate: true,
      useRadians: true,
    },
  });

  // Animate each ghost along its own home path
  const ghostKeys = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];
  const ghostPathKeys = [
    "ghost1Home",
    "ghost2Home",
    "ghost3Home",
    "ghost4Home",
    "ghost5Home",
  ];

  ghostKeys.forEach((key, i) => {
    const ghost = ghosts[key];
    const pathKey = ghostPathKeys[i];
    const path = (paths as any)[pathKey];
    if (ghost && path) {
      gsap.to(ghost.position, {
        duration: 10 + i * 2,
        repeat: -1,
        ease: "power2.inOut",
        motionPath: {
          path: curveToPoints(path),
          autoRotate: true,
          useRadians: true,
        },
      });
    }
  });
}

function curveToPoints(curve: any) {
  // Convert a Three.js CurvePath to an array of {x, y, z} points for GSAP
  const divisions = 100;
  const points = [];
  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const p = curve.getPointAt(t);
    points.push({ x: p.x, y: p.y, z: p.z });
  }
  return points;
}
