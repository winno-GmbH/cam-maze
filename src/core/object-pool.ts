import * as THREE from "three";

class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;

  constructor(createFn: () => T, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      if (this.resetFn) {
        this.resetFn(obj);
      }
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < 10) {
      this.pool.push(obj);
    }
  }
}

export const vector3Pool = new ObjectPool<THREE.Vector3>(
  () => new THREE.Vector3(),
  (v) => v.set(0, 0, 0)
);

export const quaternionPool = new ObjectPool<THREE.Quaternion>(
  () => new THREE.Quaternion(),
  (q) => q.set(0, 0, 0, 1)
);

export const eulerPool = new ObjectPool<THREE.Euler>(
  () => new THREE.Euler(),
  (e) => e.set(0, 0, 0)
);

export const object3DPool = new ObjectPool<THREE.Object3D>(
  () => new THREE.Object3D(),
  (obj) => {
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.quaternion.set(0, 0, 0, 1);
  }
);

