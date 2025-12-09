import * as THREE from "three";
import { performanceProfiler } from "../core/performance-profiler";

interface PathCacheEntry {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  t: number;
}

class PathCache {
  private cache: Map<string, PathCacheEntry> = new Map();
  private readonly cacheSize = 200;

  private getCacheKey(path: THREE.CurvePath<THREE.Vector3>, t: number): string {
    const pathId = (path as any).uuid || Math.random().toString();
    return `${pathId}_${t.toFixed(6)}`;
  }

  getPoint(
    path: THREE.CurvePath<THREE.Vector3>,
    t: number,
    result: THREE.Vector3
  ): THREE.Vector3 {
    const roundedT = Math.round(t * 5000) / 5000;
    const key = this.getCacheKey(path, roundedT);
    const cached = this.cache.get(key);

    if (cached) {
      result.copy(cached.point);
      return result;
    }

    performanceProfiler.start("path-getPointAt");
    const point = path.getPointAt(t);
    performanceProfiler.end("path-getPointAt");
    result.copy(point);

    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    performanceProfiler.start("path-getTangentAt");
    const tangent = path.getTangentAt(t);
    performanceProfiler.end("path-getTangentAt");
    const entry: PathCacheEntry = {
      point: point.clone(),
      tangent: tangent.clone(),
      t: roundedT,
    };
    this.cache.set(key, entry);

    return result;
  }

  getTangent(
    path: THREE.CurvePath<THREE.Vector3>,
    t: number,
    result: THREE.Vector3
  ): THREE.Vector3 {
    const roundedT = Math.round(t * 10000) / 10000;
    const key = this.getCacheKey(path, roundedT);
    const cached = this.cache.get(key);

    if (cached) {
      result.copy(cached.tangent);
      return result;
    }

    performanceProfiler.start("path-getTangentAt");
    const tangent = path.getTangentAt(t);
    performanceProfiler.end("path-getTangentAt");
    result.copy(tangent);

    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    performanceProfiler.start("path-getPointAt");
    const point = path.getPointAt(t);
    performanceProfiler.end("path-getPointAt");
    const entry: PathCacheEntry = {
      point: point.clone(),
      tangent: tangent.clone(),
      t: roundedT,
    };
    this.cache.set(key, entry);

    return result;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const pathCache = new PathCache();
