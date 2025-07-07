import * as THREE from "three";

export function calculateObjectOrientation(
  object: THREE.Object3D,
  tangent: THREE.Vector3,
  objectType: "pacman" | "ghost" | "camera" = "ghost"
): void {
  if (!tangent || tangent.length() === 0) return;

  const targetRotation = Math.atan2(tangent.x, tangent.z);

  if (objectType === "pacman") {
    object.rotation.set(Math.PI / 2, Math.PI, targetRotation + Math.PI / 2);
  } else if (objectType === "ghost") {
    object.rotation.set(0, targetRotation, 0);
  } else if (objectType === "camera") {
    const lookAtPoint = object.position.clone().add(tangent);
    object.lookAt(lookAtPoint);
  }
}

export function rotateObjectToLayDown(
  object: THREE.Object3D,
  progress: number
) {
  const startQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, 0)
  );
  const endQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );
  object.quaternion.slerpQuaternions(startQuat, endQuat, progress);
}
