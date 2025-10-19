import * as THREE from "three";

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

// Pre-defined laying down quaternions (rotate 90° on X-axis, both directions)
export const LAY_DOWN_QUAT_1 = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0)
);
export const LAY_DOWN_QUAT_2 = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0)
);

/**
 * Slerps an object from a starting quaternion toward a laying down position.
 * Automatically chooses the closer of two laying down orientations.
 * This animation is bidirectional - reversing the progress reverses the rotation.
 */
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
