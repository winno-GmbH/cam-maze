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

const LOOP_DURATION = 30; // seconds for a full loop
const CURVE_TIME_FACTOR = 1.25; // Curves take 1.5x as long as straights
const LOOKUP_DIVISIONS = 100;

// Store previous positions to calculate velocity
const previousPositions: Record<string, THREE.Vector3> = {};

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

const segmentTables: Record<string, Segment[]> = {};

export function initHomeLoop() {
  Object.entries(pathMapping).forEach(([key, pathKey]) => {
    const path = (paths as any)[pathKey];
    if (!path) return;
    const segments: Segment[] = [];
    let totalTime = 0;
    let t = 0;
    for (let i = 0; i < path.curves.length; i++) {
      const curve = path.curves[i];
      const type = getCurveType(curve);
      const t0 = t;
      const t1 = t0 + curve.getLength() / path.getLength();
      const length = curve.getLength();
      const duration = (type === "curve" ? CURVE_TIME_FACTOR : 1) * length;
      const seg: Segment = {
        type,
        startT: t0,
        endT: t1,
        length,
        duration,
        startTime: totalTime,
        endTime: totalTime + duration,
      };
      if (type === "curve") {
        seg.tLookup = buildTimeToTLookup(seg.duration, LOOKUP_DIVISIONS);
      }
      segments.push(seg);
      totalTime += duration;
      t = t1;
    }
    // Normalize durations so totalTime = LOOP_DURATION
    const scale = LOOP_DURATION / totalTime;
    segments.forEach((seg) => {
      seg.duration *= scale;
    });
    let acc = 0;
    segments.forEach((seg) => {
      seg.startTime = acc;
      seg.endTime = acc + seg.duration;
      acc = seg.endTime;
      if (seg.type === "curve") {
        seg.tLookup = buildTimeToTLookup(seg.duration, LOOKUP_DIVISIONS);
      }
    });
    segmentTables[key] = segments;
  });
}

export function updateHomeLoop() {
  const globalTime = (performance.now() / 1000) % LOOP_DURATION;

  // Reset rotation state at the beginning of each loop (when globalTime is very small)
  if (globalTime < 0.1) {
    Object.keys(ghosts).forEach((key) => {
      delete previousPositions[key];
    });
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    const segments = segmentTables[key];
    if (!path || !segments) return;
    let segIdx = segments.findIndex((seg) => globalTime < seg.endTime);
    if (segIdx === -1) segIdx = segments.length - 1;
    const seg = segments[segIdx];
    const localTime = Math.max(
      0,
      Math.min(globalTime - seg.startTime, seg.duration)
    );
    let t;
    if (seg.type === "curve" && seg.tLookup) {
      // Use the lookup table to get t for this localTime
      let idx = Math.floor((localTime / seg.duration) * LOOKUP_DIVISIONS);
      idx = Math.max(0, Math.min(idx, LOOKUP_DIVISIONS));
      t = seg.startT + (seg.endT - seg.startT) * seg.tLookup[idx];
    } else {
      // Linear for straights
      const localT = localTime / seg.duration;
      t = seg.startT + (seg.endT - seg.startT) * localT;
    }
    t = Math.max(0, Math.min(1, t));
    if (isNaN(t)) {
      console.warn("NaN t in HomeLoop:", { key, seg, localTime, t });
      return;
    }
    const position = path.getPointAt(t);
    if (!position) {
      console.warn("getPointAt returned null for t:", t, "on path", path);
      return;
    }

    // Calculate forward direction from velocity (current position - previous position)
    let forwardDirection = new THREE.Vector3(0, 0, 1); // Default forward
    if (previousPositions[key]) {
      forwardDirection = position
        .clone()
        .sub(previousPositions[key])
        .normalize();
    }

    // Store current position for next frame
    previousPositions[key] = position.clone();

    // Update position
    ghost.position.copy(position);

    // Calculate rotation from forward direction
    const targetRotation = Math.atan2(forwardDirection.x, forwardDirection.z);

    // Apply rotation directly (no smoothing, no accumulation)
    if (key === "pacman") {
      ghost.rotation.set(Math.PI / 2, Math.PI, targetRotation + Math.PI / 2);
    } else {
      // For ghosts, use a simpler rotation setup
      ghost.rotation.set(0, targetRotation, 0);
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
function buildTimeToTLookup(duration: number, divisions: number): number[] {
  // Speed profile: slowest at center, fastest at ends
  // speed(t) = minSpeed + (1 - minSpeed) * (1 - Math.cos(2 * Math.PI * t)) / 2
  // Integrate 1/speed(t) to get time as a function of t, then invert
  const minSpeed = 1 / CURVE_TIME_FACTOR;
  const N = divisions;
  const timeAtT: number[] = [0];
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const t0 = (i - 1) / N;
    const t1 = i / N;
    // Average speed over this interval
    const s0 =
      minSpeed + ((1 - minSpeed) * (1 - Math.cos(2 * Math.PI * t0))) / 2;
    const s1 =
      minSpeed + ((1 - minSpeed) * (1 - Math.cos(2 * Math.PI * t1))) / 2;
    const avgSpeed = 0.5 * (s0 + s1);
    const dt = 1 / avgSpeed / N;
    total += dt;
    timeAtT.push(total);
  }
  // Normalize so total time = duration
  for (let i = 0; i < timeAtT.length; i++) {
    timeAtT[i] = (timeAtT[i] / total) * duration;
  }
  // For each time step, find the corresponding t
  const table: number[] = [];
  for (let i = 0; i <= N; i++) {
    const targetTime = (i / N) * duration;
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
