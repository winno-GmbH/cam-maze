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

const LOOP_DURATION = 100; // seconds for a full loop

export function updateHomeLoop() {
  const globalTime = (performance.now() / 1000) % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION; // Simple 0 to 1 parameter

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    if (!path) return;

    // Reset rotation at start of loop to prevent accumulation
    if (t < 0.01) {
      ghost.rotation.set(0, 0, 0);
    }

    const position = path.getPointAt(t);
    if (!position) return;

    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) return;

    // Update position and rotation
    ghost.position.copy(position);
    const rotation = Math.atan2(tangent.x, tangent.z);

    if (key === "pacman") {
      ghost.rotation.set(Math.PI / 2, Math.PI, rotation + Math.PI / 2);
    } else {
      ghost.rotation.set(0, rotation, 0);
    }
  });

  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}
