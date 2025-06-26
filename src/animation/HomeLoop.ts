import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";

const arcLengthTables: Record<
  string,
  { arcLengths: number[]; totalLength: number }
> = {};
const weightedArcLengthTables: Record<
  string,
  { weightedArcLengths: number[]; totalWeightedLength: number }
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

const LOOP_DURATION = 25; // seconds for a full loop for all objects
const curveWeight = 0.5; // Curves take twice as long as straights
const straightWeight = 1.0;

export function initHomeLoop() {
  Object.entries(pathMapping).forEach(([key, pathKey]) => {
    const path = (paths as any)[pathKey];
    if (path) {
      const divisions = 500;
      const arcLengths: number[] = [0];
      const weightedArcLengths: number[] = [0];
      let prev = path.getPointAt(0);
      let totalLength = 0;
      let totalWeightedLength = 0;
      for (let i = 1; i <= divisions; i++) {
        const t = i / divisions;
        const pt = path.getPointAt(t);
        const segmentLength = pt.distanceTo(prev);
        totalLength += segmentLength;
        arcLengths.push(totalLength);
        // Determine if this segment is a curve or straight
        const segment = getSegmentType(path, t, divisions);
        const weight = segment === "curve" ? curveWeight : straightWeight;
        totalWeightedLength += segmentLength * weight;
        weightedArcLengths.push(totalWeightedLength);
        prev = pt;
      }
      arcLengthTables[key] = { arcLengths, totalLength };
      weightedArcLengthTables[key] = {
        weightedArcLengths,
        totalWeightedLength,
      };
      progressByKey[key] = 0;
    }
  });
}

export function updateHomeLoop() {
  const delta = clock.getDelta();
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    const arcTable = arcLengthTables[key];
    const weightedTable = weightedArcLengthTables[key];
    if (path && arcTable && weightedTable) {
      // Advance progress by (totalWeightedLength / LOOP_DURATION) * delta, wrap around
      const weightedSpeed = weightedTable.totalWeightedLength / LOOP_DURATION;
      progressByKey[key] += weightedSpeed * delta;
      if (progressByKey[key] > weightedTable.totalWeightedLength)
        progressByKey[key] -= weightedTable.totalWeightedLength;
      // Find t for current weighted arc length
      const t = weightedArcLengthToT(
        weightedTable.weightedArcLengths,
        weightedTable.totalWeightedLength,
        progressByKey[key]
      );
      const position = path.getPointAt(t);
      ghost.position.copy(position);
      const tangent = path.getTangentAt(t).normalize();
      ghost.lookAt(position.clone().add(tangent));
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
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}

function getSegmentType(
  path: any,
  t: number,
  divisions: number
): "curve" | "straight" {
  // Try to detect if the segment at t is a curve or straight by checking the type of the segment in the CurvePath
  // This is a heuristic: we check which child curve the t falls into
  if (!path.curves || !Array.isArray(path.curves)) return "straight";
  const curveCount = path.curves.length;
  const curveIndex = Math.floor(t * curveCount);
  const curve = path.curves[curveIndex];
  if (!curve) return "straight";
  // QuadraticBezierCurve3 is a curve, LineCurve3 is a straight
  if (curve.type && curve.type.includes("Quadratic")) return "curve";
  if (curve instanceof THREE.QuadraticBezierCurve3) return "curve";
  return "straight";
}

function weightedArcLengthToT(
  weightedArcLengths: number[],
  totalWeightedLength: number,
  arc: number
): number {
  let low = 0,
    high = weightedArcLengths.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (weightedArcLengths[mid] < arc) low = mid + 1;
    else high = mid;
  }
  const i = Math.max(1, low);
  const t0 = (i - 1) / (weightedArcLengths.length - 1);
  const t1 = i / (weightedArcLengths.length - 1);
  const l0 = weightedArcLengths[i - 1];
  const l1 = weightedArcLengths[i];
  const t = l0 === l1 ? t0 : t0 + ((arc - l0) / (l1 - l0)) * (t1 - t0);
  return t;
}
