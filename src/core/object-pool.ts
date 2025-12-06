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
    if (this.resetFn) {
      this.resetFn(obj);
    }
    this.pool.push(obj);
  }

  clear(): void {
    this.pool = [];
  }
}

function resetVector3(v: THREE.Vector3): void {
  v.set(0, 0, 0);
}

function resetQuaternion(q: THREE.Quaternion): void {
  q.set(0, 0, 0, 1);
}

function resetObject3D(obj: THREE.Object3D): void {
  obj.position.set(0, 0, 0);
  obj.quaternion.set(0, 0, 0, 1);
  obj.scale.set(1, 1, 1);
  obj.rotation.set(0, 0, 0);
}

export const vector3Pool = new ObjectPool<THREE.Vector3>(
  () => new THREE.Vector3(),
  resetVector3
);

export const quaternionPool = new ObjectPool<THREE.Quaternion>(
  () => new THREE.Quaternion(),
  resetQuaternion
);

export const object3DPool = new ObjectPool<THREE.Object3D>(
  () => new THREE.Object3D(),
  resetObject3D
);

export const vector3PoolTemp = new ObjectPool<THREE.Vector3>(
  () => new THREE.Vector3(),
  resetVector3
);

export const quaternionPoolTemp = new ObjectPool<THREE.Quaternion>(
  () => new THREE.Quaternion(),
  resetQuaternion
);

