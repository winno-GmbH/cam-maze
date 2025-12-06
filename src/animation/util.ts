import * as THREE from "three";

export const OBJECT_KEYS = [
  "pacman",
  "ghost1",
  "ghost2",
  "ghost3",
  "ghost4",
  "ghost5",
] as const;

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
  if (!tangent?.length()) return;

  const targetRotation = Math.atan2(tangent.x, tangent.z);

  if (objectType === "pacman") {
    object.rotation.set(
      -(Math.PI / 2),
      Math.PI,
      -(targetRotation + Math.PI / 2)
    );
    object.quaternion.setFromEuler(object.rotation);
  } else if (objectType === "ghost") {
    object.rotation.set(0, targetRotation, 0);
    object.quaternion.setFromEuler(object.rotation);
  } else if (objectType === "camera") {
    const lookAtPoint = object.position.clone().add(tangent);
    object.lookAt(lookAtPoint);
  }
}

const baseLayDownQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0)
);
const yAxis180 = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI
);
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

export function rotateQuaternionAroundAxis(
  quat: THREE.Quaternion,
  axis: "x" | "y" | "z",
  angle: number
): THREE.Quaternion {
  const axisVector =
    axis === "x"
      ? new THREE.Vector3(1, 0, 0)
      : axis === "y"
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);

  const rotation = new THREE.Quaternion().setFromAxisAngle(axisVector, angle);

  return quat.clone().multiply(rotation);
}

export function applyRotations(
  quat: THREE.Quaternion,
  rotations: Array<{ axis: "x" | "y" | "z"; angle: number }>
): THREE.Quaternion {
  let result = quat.clone();
  rotations.forEach(({ axis, angle }) => {
    result = rotateQuaternionAroundAxis(result, axis, angle);
  });
  return result;
}
