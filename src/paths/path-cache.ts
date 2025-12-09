import * as THREE from "three";
import { performanceProfiler } from "../core/performance-profiler";

interface PathCacheEntry {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  t: number;
}

class PathCache {
  private cache: Map<string, PathCacheEntry> = new Map();
  private readonly cacheSize = 10;

  private getCacheKey(path: THREE.CurvePath<THREE.Vector3>, t: number): string {
    const pathId = (path as any).uuid || Math.random().toString();
    return `${pathId}_${t.toFixed(6)}`;
  }

  getPoint(
    path: THREE.CurvePath<THREE.Vector3>,
    t: number,
    result: THREE.Vector3
  ): THREE.Vector3 {
    const key = this.getCacheKey(path, t);
    const cached = this.cache.get(key);

    if (cached && Math.abs(cached.t - t) < 0.0001) {
      result.copy(cached.point);
      return result;
    }

    const point = performanceProfiler.measure("path-getPointAt", () =>
      path.getPointAt(t)
    );
    result.copy(point);

    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const entry: PathCacheEntry = {
      point: point.clone(),
      tangent: path.getTangentAt(t).clone(),
      t,
    };
    this.cache.set(key, entry);

    return result;
  }

  getTangent(
    path: THREE.CurvePath<THREE.Vector3>,
    t: number,
    result: THREE.Vector3
  ): THREE.Vector3 {
    const key = this.getCacheKey(path, t);
    const cached = this.cache.get(key);

    if (cached && Math.abs(cached.t - t) < 0.0001) {
      result.copy(cached.tangent);
      return result;
    }

    const tangent = performanceProfiler.measure("path-getTangentAt", () =>
      path.getTangentAt(t)
    );
    result.copy(tangent);

    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const point = path.getPointAt(t);
    const entry: PathCacheEntry = {
      point: point.clone(),
      tangent: tangent.clone(),
      t,
    };
    this.cache.set(key, entry);

    return result;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const pathCache = new PathCache();
