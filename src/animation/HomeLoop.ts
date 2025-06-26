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

// Store smoothed paths
const smoothedPaths: Record<string, THREE.CurvePath<THREE.Vector3>> = {};

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
    const originalPath = (paths as any)[pathKey];
    if (!originalPath) return;

    // Create a smoothed version of the path
    const smoothedPath = createSmoothedPath(pathKey);
    smoothedPaths[key] = smoothedPath;

    const segments: Segment[] = [];
    let totalTime = 0;
    let t = 0;

    for (let i = 0; i < smoothedPath.curves.length; i++) {
      const curve = smoothedPath.curves[i];
      const type = getCurveType(curve);
      const t0 = t;
      const t1 = t0 + curve.getLength() / smoothedPath.getLength();
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

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = smoothedPaths[key];
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

    // Get tangent from path
    const tangent = path.getTangentAt(t);
    if (!tangent || tangent.length() === 0) {
      console.warn("Invalid tangent at t:", t, "for path", pathKey);
      return;
    }

    // Update position
    ghost.position.copy(position);

    // Calculate rotation directly from tangent (no conflicts!)
    const rotation = Math.atan2(tangent.x, tangent.z);

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

function createSmoothedPath(pathKey: string): THREE.CurvePath<THREE.Vector3> {
  const pathPoints = getPathPoints(pathKey);
  const smoothedPath = new THREE.CurvePath<THREE.Vector3>();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.type === "straight") {
      const line = new THREE.LineCurve3(current.pos, next.pos);
      smoothedPath.add(line);
    } else if (current.type === "curve") {
      // Check if this curve and the next one are opposing
      const nextPoint = pathPoints[i + 2];
      if (
        nextPoint &&
        nextPoint.type === "curve" &&
        isOpposingCurvePair(current.curveType, nextPoint.curveType)
      ) {
        // Create a smoother curve that combines both opposing curves
        const smoothedCurve = createSmoothedOpposingCurves(
          current,
          next,
          nextPoint
        );
        smoothedPath.add(smoothedCurve);
        i++; // Skip the next point since we've combined it
      } else {
        // Normal curve
        let midPoint: THREE.Vector3;
        if (current.curveType === "upperArc") {
          midPoint = new THREE.Vector3(
            current.pos.x,
            current.pos.y,
            next.pos.z
          );
        } else if (current.curveType === "lowerArc") {
          midPoint = new THREE.Vector3(
            next.pos.x,
            current.pos.y,
            current.pos.z
          );
        } else if (current.curveType === "forwardDownArc") {
          midPoint = new THREE.Vector3(
            current.pos.x,
            next.pos.y,
            current.pos.z
          );
        } else {
          midPoint = new THREE.Vector3(
            current.pos.x,
            current.pos.y,
            next.pos.z
          );
        }
        const curve = new THREE.QuadraticBezierCurve3(
          current.pos,
          midPoint,
          next.pos
        );
        smoothedPath.add(curve);
      }
    }
  }

  return smoothedPath;
}

function createSmoothedOpposingCurves(
  first: any,
  middle: any,
  last: any
): THREE.Curve<THREE.Vector3> {
  // Create a single smooth curve that goes from first to last, avoiding the sharp turn at middle
  // This will naturally reduce the rotation intensity

  // Calculate a smoother control point that reduces the sharp turn
  const start = first.pos;
  const end = last.pos;

  // Create a control point that's more centered, reducing the sharp turn
  const originalMid = middle.pos;
  const direction = end.clone().sub(start).normalize();
  const distance = start.distanceTo(end);

  // Move the control point closer to the center line to reduce rotation
  const centerPoint = start.clone().add(end).multiplyScalar(0.5);
  const smoothedControl = centerPoint.clone().lerp(originalMid, 0.3); // 30% toward original, 70% toward center

  return new THREE.QuadraticBezierCurve3(start, smoothedControl, end);
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
