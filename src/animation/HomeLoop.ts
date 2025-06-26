import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";

const pathMapping = {
  pacman: "pacmanHome",
  ghost1: "ghost1Home",
  ghost2: "ghost2Home",
  ghost3: "ghost3Home",
  ghost4: "ghost4Home",
  ghost5: "ghost5Home",
} as const;

const LOOP_DURATION = 30;
const ROTATION_SMOOTH_FACTOR = 0.05;

const currentRotations: Record<string, number> = {};

export function updateHomeLoop() {
  const globalTime = (performance.now() / 1000) % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION;

  if (t < 0.01) {
    Object.keys(currentRotations).forEach((key) => {
      delete currentRotations[key];
    });
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    if (!path) return;

    const position = path.getPointAt(t);
    if (!position) return;

    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) return;

    ghost.position.copy(position);

    const targetRotation = Math.atan2(tangent.x, tangent.z);

    if (currentRotations[key] === undefined) {
      currentRotations[key] = targetRotation;
    }

    const currentRotation = currentRotations[key];
    let rotationDiff = targetRotation - currentRotation;

    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

    currentRotations[key] =
      currentRotation + rotationDiff * ROTATION_SMOOTH_FACTOR;

    if (key === "pacman") {
      ghost.rotation.set(
        Math.PI / 2,
        Math.PI,
        currentRotations[key] + Math.PI / 2
      );
    } else {
      ghost.rotation.set(0, currentRotations[key], 0);
    }
  });

  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}
