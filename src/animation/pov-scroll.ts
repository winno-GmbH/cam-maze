import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { getPovPaths, TangentSmoother } from "../paths/paths";
import {
  povTriggerPositions,
  povPaths as pathPointsData,
} from "../paths/pathpoints";
import { DOM_ELEMENTS } from "../config/dom-elements";
import { calculateObjectOrientation } from "./util";
import { applyPovScrollPreset, getScrollDirection } from "./scene-presets";

let povScrollTimeline: gsap.core.Timeline | null = null;

// Track previous camera rotation to detect 180-degree changes
let previousCameraRotation: THREE.Euler | null = null;

function checkAndLogCameraRotationChange(context: string) {
  const currentRotation = camera.rotation.clone();

  if (previousCameraRotation) {
    // Calculate difference in radians for each axis
    const diffX = Math.abs(currentRotation.x - previousCameraRotation.x);
    const diffY = Math.abs(currentRotation.y - previousCameraRotation.y);
    const diffZ = Math.abs(currentRotation.z - previousCameraRotation.z);

    // Normalize differences to account for wrapping (e.g., 359° to 1° = 2°, not 358°)
    const normalizedDiffX = Math.min(diffX, Math.PI * 2 - diffX);
    const normalizedDiffY = Math.min(diffY, Math.PI * 2 - diffY);
    const normalizedDiffZ = Math.min(diffZ, Math.PI * 2 - diffZ);

    // Check if any axis changed by approximately 180 degrees (Math.PI radians)
    const PI_THRESHOLD = Math.PI * 0.9; // Allow some tolerance (90% of 180°)
    const has180DegreeChange =
      normalizedDiffX >= PI_THRESHOLD ||
      normalizedDiffY >= PI_THRESHOLD ||
      normalizedDiffZ >= PI_THRESHOLD;

    if (has180DegreeChange) {
      // Camera rotation change detected (logging removed)
    }
  }

  previousCameraRotation = currentRotation.clone();
}

// Animation state
let previousCameraPosition: THREE.Vector3 | null = null;
let rotationStarted = false;
let startedInitEndScreen = false;
let endScreenPassed = false;

// Camera rotation constants
const startRotationPoint = new THREE.Vector3(0.55675, 0.55, 1.306);
const endRotationPoint = new THREE.Vector3(-0.14675, 1, 1.8085);
const finalLookAt = new THREE.Vector3(-0.14675, 0, 1.8085);

// Animation timing constants
const wideFOV = 80;

// Cached values
let cachedStartYAngle: number | null = null;

// Ghost trigger state
const ghostStates: Record<string, any> = {};

// Tangent smoothers for POV scroll (separate from home loop smoothers)
const povTangentSmoothers: Record<string, TangentSmoother> = {};
