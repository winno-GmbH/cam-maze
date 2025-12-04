import * as THREE from "three";

// Shared constants
export const OBJECT_KEYS = [
  "pacman",
  "ghost1",
  "ghost2",
  "ghost3",
  "ghost4",
  "ghost5",
] as const;
export const GHOST_COLORS: Record<string, number> = {
  ghost1: 0xff0000,
  ghost2: 0x00ff00,
  ghost3: 0x0000ff,
  ghost4: 0xffff00,
  ghost5: 0xff00ff,
};

const CURRENCY_SYMBOLS = ["EUR", "CHF", "YEN", "USD", "GBP"] as const;

export function isCurrencySymbol(name: string): boolean {
  return CURRENCY_SYMBOLS.some(
    (symbol) => name === symbol || name.includes(symbol)
  );
}

export function isPacmanPart(name: string): boolean {
  return (
    name.includes("Shell") ||
    name.includes("Bitcoin_1") ||
    name.includes("Bitcoin_2")
  );
}

export function calculateObjectOrientation(
  object: THREE.Object3D,
  tangent: THREE.Vector3,
  objectType: "pacman" | "ghost" | "camera" = "ghost"
): void {
  if (!tangent || tangent.length() === 0) return;

  const targetRotation = Math.atan2(tangent.x, tangent.z);

  if (objectType === "pacman") {
    object.rotation.set(
      -(Math.PI / 2),
      Math.PI,
      -(targetRotation + Math.PI / 2)
    );
  } else if (objectType === "ghost") {
    object.rotation.set(0, targetRotation, 0);
  } else if (objectType === "camera") {
    const lookAtPoint = object.position.clone().add(tangent);
    object.lookAt(lookAtPoint);
  }
}

// LAY_DOWN_QUAT_1: Laydown rotation rotated by 180° around Y-axis to fix orientation
// Try different approach: rotate around Y-axis first, then apply X rotation
// Or try rotating around Z-axis instead
const yAxis180 = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI
);
const baseLayDownQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0)
);
// Try multiplying in reverse order: Y rotation first, then X rotation
export const LAY_DOWN_QUAT_1 = yAxis180.clone().multiply(baseLayDownQuat);

export const LAY_DOWN_QUAT_2 = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0)
);

export function slerpToLayDown(
  object: THREE.Object3D,
  startQuat: THREE.Quaternion,
  progress: number
) {
  const d1 = startQuat.angleTo(LAY_DOWN_QUAT_1);
  const d2 = startQuat.angleTo(LAY_DOWN_QUAT_2);
  const targetQuat = d1 < d2 ? LAY_DOWN_QUAT_1 : LAY_DOWN_QUAT_2;

  object.quaternion.copy(startQuat.clone().slerp(targetQuat, progress));
}
