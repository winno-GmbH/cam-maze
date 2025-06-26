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
const SEGMENT_DIVISIONS = 100;

type Segment = {
  type: "curve" | "straight";
  startT: number;
  endT: number;
  length: number;
  duration: number;
  startTime: number;
  endTime: number;
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
      const localT = localTime / seg.duration;
      // For curves, use a cosine ramp for t
      let t;
      if (seg.type === "curve") {
        // Ease: slowest at middle, fastest at ends
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * localT);
        t = seg.startT + (seg.endT - seg.startT) * eased;
      } else {
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
