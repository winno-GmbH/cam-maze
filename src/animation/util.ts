import * as THREE from "three";

export function calculateObjectOrientation(
  object: THREE.Object3D,
  tangent: THREE.Vector3,
  objectType: "pacman" | "ghost" | "camera" = "ghost"
): void {
  if (!tangent || tangent.length() === 0) return;

  const targetRotation = Math.atan2(tangent.x, tangent.z);

  if (objectType === "pacman") {
    object.rotation.set(-(Math.PI / 2), Math.PI, -(targetRotation + Math.PI / 2));
  } else if (objectType === "ghost") {
    object.rotation.set(0, targetRotation, 0);
  } else if (objectType === "camera") {
    const lookAtPoint = object.position.clone().add(tangent);
    object.lookAt(lookAtPoint);
  }
}

export function slerpToLayDown(
  object: THREE.Object3D,
  startQuat: THREE.Quaternion,
  progress: number
) {
  const layDownQuat1 = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0)
  );
  const layDownQuat2 = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );

  const d1 = startQuat.angleTo(layDownQuat1);
  const d2 = startQuat.angleTo(layDownQuat2);
  const targetQuat = d1 < d2 ? layDownQuat1 : layDownQuat2;

  object.quaternion.copy(startQuat.clone().slerp(targetQuat, progress));
}
