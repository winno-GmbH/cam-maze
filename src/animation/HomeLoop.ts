import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";

const segmentTables: Record<string, Segment[]> = {};
const totalDurations: Record<string, number> = {};
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
const CURVE_TIME_FACTOR = 1.5; // Curves take 1.5x as long as straights
const BASE_SPEED = 1; // Arbitrary, only relative durations matter
const LOOKUP_DIVISIONS = 100;

// For curves, minSpeed = 1 / CURVE_TIME_FACTOR
const minSpeed = 1 / CURVE_TIME_FACTOR;

// For each segment, if it's a curve, store a lookup table: elapsedTime (0..duration) -> t (0..1)
type Segment = {
  type: "curve" | "straight";
  startT: number;
  endT: number;
  length: number;
  duration: number;
  startTime: number;
  endTime: number;
  tLookup?: number[]; // For curves: tLookup[timeIndex] = t
};

export function initHomeLoop() {
  Object.entries(pathMapping).forEach(([key, pathKey]) => {
    const path = (paths as any)[pathKey];
    if (path) {
      const segments: Segment[] = [];
      let totalTime = 0;
      let t = 0;
      for (let i = 0; i < path.curves.length; i++) {
        const curve = path.curves[i];
        const type = getCurveType(curve);
        const t0 = t;
        const t1 = t0 + curve.getLength() / path.getLength();
        const length = curve.getLength();
        const duration =
          (type === "curve" ? CURVE_TIME_FACTOR : 1) * (length / BASE_SPEED);
        const seg: Segment = {
          type,
          startT: t0,
          endT: t1,
          length,
          duration,
          startTime: totalTime,
          endTime: totalTime + duration,
        };
        // For curves, precompute tLookup
        if (type === "curve") {
          seg.tLookup = buildCurveTimeToTLookup(duration, LOOKUP_DIVISIONS);
        }
        segments.push(seg);
        totalTime += duration;
        t = t1;
      }
      // Normalize all durations so totalTime = LOOP_DURATION
      const scale = LOOP_DURATION / totalTime;
      segments.forEach((seg) => {
        seg.duration *= scale;
      });
      // Recompute startTime/endTime with new durations
      let acc = 0;
      segments.forEach((seg) => {
        seg.startTime = acc;
        seg.endTime = acc + seg.duration;
        acc = seg.endTime;
        // For curves, rebuild tLookup with new duration
        if (seg.type === "curve") {
          seg.tLookup = buildCurveTimeToTLookup(seg.duration, LOOKUP_DIVISIONS);
        }
      });
      segmentTables[key] = segments;
      totalDurations[key] = LOOP_DURATION;
    }
  });
}

export function updateHomeLoop() {
  const globalTime = (performance.now() / 1000) % LOOP_DURATION;
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    const segments = segmentTables[key];
    if (path && segments) {
      // Find which segment we're in
      let segIdx = segments.findIndex((seg) => globalTime < seg.endTime);
      if (segIdx === -1) segIdx = segments.length - 1;
      const seg = segments[segIdx];
      const localTime = globalTime - seg.startTime;
      let t;
      if (seg.type === "curve" && seg.tLookup) {
        // Use the lookup table to get t for this localTime
        const idx = Math.min(
          Math.floor((localTime / seg.duration) * LOOKUP_DIVISIONS),
          LOOKUP_DIVISIONS
        );
        const localT = seg.tLookup[idx];
        t = seg.startT + (seg.endT - seg.startT) * localT;
      } else {
        // Linear for straights
        const localT = localTime / seg.duration;
        t = seg.startT + (seg.endT - seg.startT) * localT;
      }
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
  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}

function getCurveType(curve: any): "curve" | "straight" {
  if (curve.type && curve.type.includes("Quadratic")) return "curve";
  if (curve instanceof THREE.QuadraticBezierCurve3) return "curve";
  return "straight";
}

// Build a lookup table mapping elapsed time (0..duration) to t (0..1) for a curve segment
function buildCurveTimeToTLookup(
  duration: number,
  divisions: number
): number[] {
  // The speed profile: speed(t) = minSpeed + (1 - minSpeed) * Math.sin(Math.PI * t)
  // Integrate 1/speed(t) to get time as a function of t, then invert
  const table: number[] = [];
  const N = divisions;
  let total = 0;
  const timeAtT: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const t0 = (i - 1) / N;
    const t1 = i / N;
    // Average speed over this interval
    const s0 = minSpeed + (1 - minSpeed) * Math.sin(Math.PI * t0);
    const s1 = minSpeed + (1 - minSpeed) * Math.sin(Math.PI * t1);
    const avgSpeed = 0.5 * (s0 + s1);
    const dt = 1 / avgSpeed / N;
    total += dt;
    timeAtT.push(total);
  }
  // Normalize so total time = duration
  for (let i = 0; i < timeAtT.length; i++) {
    timeAtT[i] = (timeAtT[i] / total) * duration;
  }
  // Now, for each time step, find the corresponding t
  for (let i = 0; i <= N; i++) {
    const targetTime = (i / N) * duration;
    // Find t such that timeAtT[tIdx] >= targetTime
    let tIdx = 0;
    while (tIdx < timeAtT.length - 1 && timeAtT[tIdx] < targetTime) tIdx++;
    // Linear interpolate between tIdx-1 and tIdx
    const t0 = (tIdx - 1) / N;
    const t1 = tIdx / N;
    const time0 = timeAtT[tIdx - 1];
    const time1 = timeAtT[tIdx];
    let tVal;
    if (time1 === time0) tVal = t1;
    else tVal = t0 + ((targetTime - time0) / (time1 - time0)) * (t1 - t0);
    table.push(Math.max(0, Math.min(1, tVal)));
  }
  return table;
}
