import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";

let previousZRotation: number | undefined = undefined;

export function updateHomeLoop() {
  const loopDuration = 20;
  const t = ((Date.now() / 1000) % loopDuration) / loopDuration;
  const pathMapping = {
    pacman: "pacmanHome",
    ghost1: "ghost1Home",
    ghost2: "ghost2Home",
    ghost3: "ghost3Home",
    ghost4: "ghost4Home",
    ghost5: "ghost5Home",
  } as const;

  // Animate Pacman and ghosts
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    if (path) {
      const position = path.getPointAt(t);
      ghost.position.copy(position);
      const tangent = path.getTangentAt(t).normalize();
      ghost.lookAt(position.clone().add(tangent));

      // Special smoothing for Pacman rotation
      if (key === "pacman") {
        const zRotation = Math.atan2(tangent.x, tangent.z);
        if (previousZRotation === undefined) {
          previousZRotation = zRotation;
        }
        let rotationDiff = zRotation - previousZRotation;
        if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        else if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
        const smoothFactor = 0.1;
        const smoothedRotation =
          previousZRotation + rotationDiff * smoothFactor;
        previousZRotation = smoothedRotation;
        ghost.rotation.set(
          Math.PI / 2,
          Math.PI,
          smoothedRotation + Math.PI / 2
        );
      }
    }
  });

  // Update Pacman animation mixer if present
  if (pacmanMixer) {
    const delta = clock.getDelta();
    pacmanMixer.update(delta);
  }
}
