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
const CURVE_TIME_FACTOR = 1.25; // Curves take 1.5x as long as straights
const LOOKUP_DIVISIONS = 100;
const DOUBLE_CURVE_STRETCH_FACTOR = 1.5; // Stretch double curves by 50%

// Store segment information with curve type detection
const segmentTables: Record<string, Segment[]> = {};
const pathCurveTypes: Record<string, string[]> = {};

type Segment = {
  type: "curve" | "straight" | "double-curve";
  startT: number;
  endT: number;
  length: number;
  duration: number;
  startTime: number;
  endTime: number;
  tLookup?: number[]; // For curves: tLookup[timeIndex] = t
  curveTypes?: string[]; // For double-curves: array of curve types
};

export function initHomeLoop() {
  Object.entries(pathMapping).forEach(([key, pathKey]) => {
    const path = (paths as any)[pathKey];
    if (!path) return;

    // First, analyze the path to detect curve types
    const curveTypes = analyzePathCurveTypes(pathKey);
    pathCurveTypes[key] = curveTypes;

    const segments: Segment[] = [];
    let totalTime = 0;
    let t = 0;
    let curveIndex = 0;

    for (let i = 0; i < path.curves.length; i++) {
      const curve = path.curves[i];
      const type = getCurveType(curve);
      const t0 = t;
      const t1 = t0 + curve.getLength() / path.getLength();
      const length = curve.getLength();

      // Check if this curve is part of a double-curve (opposing curves)
      let segmentType: "curve" | "straight" | "double-curve" = type;
      let segmentDuration = (type === "curve" ? CURVE_TIME_FACTOR : 1) * length;
      let curveTypesForSegment: string[] = [];

      if (type === "curve" && curveTypes[curveIndex]) {
        const currentCurveType = curveTypes[curveIndex];
        const nextCurveType = curveTypes[curveIndex + 1];

        // Check if this curve and the next curve are opposing
        if (isOpposingCurvePair(currentCurveType, nextCurveType)) {
          // This is a double-curve - combine with next curve
          segmentType = "double-curve";
          curveTypesForSegment = [currentCurveType, nextCurveType];

          // Calculate combined length and duration
          const nextCurve = path.curves[i + 1];
          if (nextCurve) {
            const nextLength = nextCurve.getLength();
            const combinedLength = length + nextLength;
            segmentDuration =
              DOUBLE_CURVE_STRETCH_FACTOR * CURVE_TIME_FACTOR * combinedLength;

            // Skip the next curve since we've combined it
            i++;
            curveIndex++;
          }
        } else {
          curveTypesForSegment = [currentCurveType];
        }
      }

      const seg: Segment = {
        type: segmentType,
        startT: t0,
        endT: t1,
        length,
        duration: segmentDuration,
        startTime: totalTime,
        endTime: totalTime + segmentDuration,
        curveTypes:
          curveTypesForSegment.length > 0 ? curveTypesForSegment : undefined,
      };

      if (segmentType === "curve" || segmentType === "double-curve") {
        seg.tLookup = buildTimeToTLookup(seg.duration, LOOKUP_DIVISIONS);
      }

      segments.push(seg);
      totalTime += segmentDuration;
      t = t1;
      curveIndex++;
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
      if (seg.type === "curve" || seg.type === "double-curve") {
        seg.tLookup = buildTimeToTLookup(seg.duration, LOOKUP_DIVISIONS);
      }
    });
    segmentTables[key] = segments;
  });
}

export function updateHomeLoop() {
  const globalTime = (performance.now() / 1000) % LOOP_DURATION;

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
    } else if (seg.type === "double-curve" && seg.tLookup) {
      // For double-curves, use a special lookup that reduces rotation intensity
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

    // Get tangent from path
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) {
      console.warn("Invalid tangent at t:", t, "for path", pathKey);
      return;
    }

    // Update position
    ghost.position.copy(position);

    // Calculate rotation from tangent
    let rotation = Math.atan2(tangent.x, tangent.z);

    // For double-curves, reduce rotation intensity
    if (seg.type === "double-curve") {
      const curveProgress = localTime / seg.duration;
      // Use a smoother rotation profile that reduces the peak rotation
      const rotationReduction = 0.6; // Reduce rotation by 40%
      const smoothFactor = Math.sin(curveProgress * Math.PI);
      rotation *= 1 - rotationReduction * smoothFactor;
    }

    // Apply rotation to object
    if (key === "pacman") {
      ghost.rotation.set(Math.PI / 2, Math.PI, rotation + Math.PI / 2);
    } else {
      // For ghosts, use a simpler rotation setup
      ghost.rotation.set(0, rotation, 0);
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

function analyzePathCurveTypes(pathKey: string): string[] {
  // Get the path points to analyze curve types
  const pathPoints = getPathPoints(pathKey);
  const curveTypes: string[] = [];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    if (current.type === "curve" && current.curveType) {
      curveTypes.push(current.curveType);
    }
  }

  return curveTypes;
}

function getPathPoints(pathKey: string): any[] {
  // Map path keys to their corresponding path points
  const pathPointsMap: Record<string, any[]> = {
    pacmanHome: require("../paths/pathpoints").pacmanHomePathPoints,
    ghost1Home: require("../paths/pathpoints").ghost1HomePathPoints,
    ghost2Home: require("../paths/pathpoints").ghost2HomePathPoints,
    ghost3Home: require("../paths/pathpoints").ghost3HomePathPoints,
    ghost4Home: require("../paths/pathpoints").ghost4HomePathPoints,
    ghost5Home: require("../paths/pathpoints").ghost5HomePathPoints,
  };

  return pathPointsMap[pathKey] || [];
}

function isOpposingCurvePair(curve1Type: string, curve2Type: string): boolean {
  // Define which curve types oppose each other
  const opposingPairs = [
    ["upperArc", "lowerArc"],
    ["lowerArc", "upperArc"],
  ];

  return opposingPairs.some(
    (pair) => pair[0] === curve1Type && pair[1] === curve2Type
  );
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
