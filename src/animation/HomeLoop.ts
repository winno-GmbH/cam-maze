import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";
import { clock } from "../core/scene";

const pathMapping = {
  pacman: "pacmanHome",
  ghost1: "ghost1Home",
  ghost2: "ghost2Home",
  ghost3: "ghost3Home",
  ghost4: "ghost4Home",
  ghost5: "ghost5Home",
} as const;

const LOOP_DURATION = 100; // seconds for a full loop
const ROTATION_SMOOTH_FACTOR = 0.1; // Smooth rotation interpolation

// Store current rotation and previous positions for each object
const currentRotations: Record<string, number> = {};
const previousPositions: Record<string, THREE.Vector3[]> = {};

export function updateHomeLoop() {
  const globalTime = (performance.now() / 1000) % LOOP_DURATION;
  const t = globalTime / LOOP_DURATION; // Simple 0 to 1 parameter

  // Reset state at start of loop
  if (t < 0.01) {
    Object.keys(currentRotations).forEach((key) => {
      delete currentRotations[key];
    });
    Object.keys(previousPositions).forEach((key) => {
      delete previousPositions[key];
    });
  }

  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key as keyof typeof pathMapping];
    const path = (paths as any)[pathKey];
    if (!path) return;

    const position = path.getPointAt(t);
    if (!position) return;

    // Update position
    ghost.position.copy(position);

    // Calculate smooth rotation direction using multiple samples
    const smoothDirection = calculateSmoothDirection(path, t, key);
    const targetRotation = Math.atan2(smoothDirection.x, smoothDirection.z);

    // Initialize current rotation if not set
    if (currentRotations[key] === undefined) {
      currentRotations[key] = targetRotation;
    }

    // Smoothly interpolate to target rotation
    const currentRotation = currentRotations[key];
    let rotationDiff = targetRotation - currentRotation;

    // Handle rotation wrapping (shortest path)
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

    // Apply smooth interpolation
    currentRotations[key] =
      currentRotation + rotationDiff * ROTATION_SMOOTH_FACTOR;

    // Apply rotation to object
    if (key === "pacman") {
      ghost.rotation.set(
        Math.PI / 2,
        Math.PI,
        currentRotations[key] + Math.PI / 2
      );
    } else {
      ghost.rotation.set(0, currentRotations[key], 0);
    }
  });

  const delta = clock.getDelta();
  if (pacmanMixer) {
    pacmanMixer.update(delta);
  }
}

function calculateSmoothDirection(
  path: any,
  t: number,
  key: string
): THREE.Vector3 {
  const sampleDistance = 0.02; // Distance to sample ahead and behind
  const numSamples = 5; // Number of samples to average

  let totalDirection = new THREE.Vector3(0, 0, 0);
  let validSamples = 0;

  // Sample multiple points around current position
  for (let i = -numSamples; i <= numSamples; i++) {
    const sampleT = t + i * sampleDistance;

    // Handle wrapping around the path
    let wrappedT = sampleT;
    while (wrappedT < 0) wrappedT += 1;
    while (wrappedT > 1) wrappedT -= 1;

    const samplePos = path.getPointAt(wrappedT);
    if (samplePos) {
      // Calculate direction from current position to sample
      const direction = samplePos.clone().sub(ghosts[key].position).normalize();
      totalDirection.add(direction);
      validSamples++;
    }
  }

  // Return averaged direction
  if (validSamples > 0) {
    return totalDirection.divideScalar(validSamples).normalize();
  }

  // Fallback to tangent if no valid samples
  const tangent = path.getTangentAt(t);
  return tangent ? tangent.normalize() : new THREE.Vector3(0, 0, 1);
}
