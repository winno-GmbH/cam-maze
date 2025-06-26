import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";

// Store arc length tables and progress for each character
const arcLengthTables: Record<
  string,
  { arcLengths: number[]; totalLength: number }
> = {};
const progressByKey: Record<string, number> = {};
let previousZRotation: number | undefined = undefined;

const pathMapping = {
  pacman: "pacmanHome",
  ghost1: "ghost1Home",
  ghost2: "ghost2Home",
  ghost3: "ghost3Home",
  ghost4: "ghost4Home",
  ghost5: "ghost5Home",
} as const;

const speedByKey: Record<string, number> = {
  pacman: 0.06, // units per second
  ghost1: 0.05,
  ghost2: 0.048,
  ghost3: 0.052,
  ghost4: 0.049,
  ghost5: 0.051,
};

export function initHomeLoop() {
  // Precompute arc length tables for each path
  Object.entries(pathMapping).forEach(([key, pathKey]) => {
    const path = (paths as any)[pathKey];
    if (path) {
      const divisions = 500;
      const arcLengths: number[] = [0];
      let prev = path.getPointAt(0);
      let totalLength = 0;
      for (let i = 1; i <= divisions; i++) {
        const t = i / divisions;
        const pt = path.getPointAt(t);
        totalLength += pt.distanceTo(prev);
        arcLengths.push(totalLength);
        prev = pt;
      }
      arcLengthTables[key] = { arcLengths, totalLength };
      progressByKey[key] = 0; // Start at beginning
    }
  });
}

export function updateHomeLoop() {
  const delta = clock.getDelta();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    const arcTable = arcLengthTables[key];
    if (path && arcTable) {
      // Advance progress by speed * delta, wrap around
      progressByKey[key] += speedByKey[key] * delta;
      if (progressByKey[key] > arcTable.totalLength)
        progressByKey[key] -= arcTable.totalLength;
      // Find t for current arc length
      const t = arcLengthToT(
        arcTable.arcLengths,
        arcTable.totalLength,
        progressByKey[key]
      );
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
    pacmanMixer.update(delta);
  }
}

function arcLengthToT(
  arcLengths: number[],
  totalLength: number,
  arc: number
): number {
  // Binary search for the closest arc length
  let low = 0,
    high = arcLengths.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (arcLengths[mid] < arc) low = mid + 1;
    else high = mid;
  }
  // Interpolate t between low-1 and low
  const i = Math.max(1, low);
  const t0 = (i - 1) / (arcLengths.length - 1);
  const t1 = i / (arcLengths.length - 1);
  const l0 = arcLengths[i - 1];
  const l1 = arcLengths[i];
  const t = l0 === l1 ? t0 : t0 + ((arc - l0) / (l1 - l0)) * (t1 - t0);
  return t;
}
