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

const LOOP_DURATION = 25; // seconds for a full loop
const CURVE_TIME_FACTOR = 1.5; // Curves take 1.5x as long as straights
let previousZRotation: number | undefined = undefined;

type SimpleSegment = {
  type: "curve" | "straight";
  startT: number;
  endT: number;
  length: number;
  duration: number;
  startTime: number;
  endTime: number;
};

const segmentTables: Record<string, SimpleSegment[]> = {};

export function initHomeLoop() {
  Object.entries(pathMapping).forEach(([key, pathKey]) => {
    const path = (paths as any)[pathKey];
    if (!path) return;
    const segments: SimpleSegment[] = [];
    let totalTime = 0;
    let t = 0;
    for (let i = 0; i < path.curves.length; i++) {
      const curve = path.curves[i];
      const type = getCurveType(curve);
      const t0 = t;
      const t1 = t0 + curve.getLength() / path.getLength();
      const length = curve.getLength();
      const duration = (type === "curve" ? CURVE_TIME_FACTOR : 1) * length;
      segments.push({
        type,
        startT: t0,
        endT: t1,
        length,
        duration,
        startTime: totalTime,
        endTime: totalTime + duration,
      });
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
    if (seg.type === "curve") {
      // Use a smooth cubic ease-in-out: slowest at center, but no hard stops at ends
      const localT = localTime / seg.duration;
      const rampT = cubicEaseInOut(localT);
      t = seg.startT + (seg.endT - seg.startT) * rampT;
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
      const smoothedRotation = previousZRotation + rotationDiff * smoothFactor;
      previousZRotation = smoothedRotation;
      ghost.rotation.set(Math.PI / 2, Math.PI, smoothedRotation + Math.PI / 2);
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

function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
