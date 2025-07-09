// src/core/camera-utils.ts - New utility module for smooth camera animations
import * as THREE from "three";

export interface CameraState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov?: number;
}

export class SmoothCameraController {
  private camera: THREE.PerspectiveCamera;
  private currentState: CameraState;
  private targetState: CameraState;
  private transitionSpeed: number = 0.1;
  private isTransitioning: boolean = false;

  // Buffers for smooth interpolation
  private positionBuffer: THREE.Vector3;
  private quaternionBuffer: THREE.Quaternion;
  private lookAtBuffer: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.currentState = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      fov: camera.fov,
    };
    this.targetState = { ...this.currentState };

    this.positionBuffer = new THREE.Vector3();
    this.quaternionBuffer = new THREE.Quaternion();
    this.lookAtBuffer = new THREE.Vector3();
  }

  /**
   * Set target position and rotation with automatic smooth transition
   */
  setTarget(position: THREE.Vector3, lookAt?: THREE.Vector3, fov?: number) {
    this.targetState.position.copy(position);

    if (lookAt) {
      // Calculate target quaternion from lookAt
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.lookAt(position, lookAt, this.camera.up);
      this.targetState.quaternion.setFromRotationMatrix(tempMatrix);
    }

    if (fov !== undefined) {
      this.targetState.fov = fov;
    }

    this.isTransitioning = true;
  }

  /**
   * Update camera with smooth interpolation
   * Call this in your render loop
   */
  update(deltaTime?: number) {
    if (!this.isTransitioning) return;

    const speed = deltaTime
      ? this.transitionSpeed * deltaTime * 60
      : this.transitionSpeed;

    // Smooth position interpolation
    this.camera.position.lerp(this.targetState.position, speed);

    // Smooth quaternion interpolation
    this.camera.quaternion.slerp(this.targetState.quaternion, speed);

    // Smooth FOV interpolation if needed
    if (
      this.targetState.fov &&
      Math.abs(this.camera.fov - this.targetState.fov) > 0.01
    ) {
      this.camera.fov += (this.targetState.fov - this.camera.fov) * speed;
      this.camera.updateProjectionMatrix();
    }

    // Check if transition is complete
    const positionDiff = this.camera.position.distanceTo(
      this.targetState.position
    );
    const quaternionDiff = this.camera.quaternion.angleTo(
      this.targetState.quaternion
    );

    if (positionDiff < 0.001 && quaternionDiff < 0.001) {
      this.isTransitioning = false;
      this.currentState.position.copy(this.camera.position);
      this.currentState.quaternion.copy(this.camera.quaternion);
      this.currentState.fov = this.camera.fov;
    }
  }

  /**
   * Interpolate along a path with smooth camera orientation
   */
  interpolateAlongPath(
    path: THREE.CurvePath<THREE.Vector3>,
    progress: number,
    lookAtPath?: THREE.CurvePath<THREE.Vector3>,
    options?: {
      upVector?: THREE.Vector3;
      smoothing?: number;
      orientToPath?: boolean;
    }
  ) {
    const opts = {
      upVector: new THREE.Vector3(0, 1, 0),
      smoothing: 0.1,
      orientToPath: false,
      ...options,
    };

    // Get position from path
    const position = path.getPointAt(progress);
    this.camera.position.copy(position);

    // Calculate rotation
    if (lookAtPath) {
      // Look at a point on another path
      const lookAtPoint = lookAtPath.getPointAt(progress);
      this.smoothLookAt(lookAtPoint, opts.smoothing);
    } else if (opts.orientToPath) {
      // Orient camera along path tangent
      const tangent = path.getTangentAt(progress);
      const lookAtPoint = position.clone().add(tangent);
      this.smoothLookAt(lookAtPoint, opts.smoothing);
    }
  }

  /**
   * Smooth lookAt with quaternion interpolation
   */
  private smoothLookAt(target: THREE.Vector3, smoothing: number = 0.1) {
    // Calculate target quaternion
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(this.camera.position, target, this.camera.up);
    this.quaternionBuffer.setFromRotationMatrix(tempMatrix);

    // Smoothly interpolate to target quaternion
    this.camera.quaternion.slerp(this.quaternionBuffer, smoothing);
  }

  /**
   * Set transition speed (0-1, where 1 is instant)
   */
  setTransitionSpeed(speed: number) {
    this.transitionSpeed = Math.max(0, Math.min(1, speed));
  }

  /**
   * Get current camera state
   */
  getCurrentState(): CameraState {
    return {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov: this.camera.fov,
    };
  }

  /**
   * Restore camera to a saved state
   */
  restoreState(state: CameraState, immediate: boolean = false) {
    if (immediate) {
      this.camera.position.copy(state.position);
      this.camera.quaternion.copy(state.quaternion);
      if (state.fov) {
        this.camera.fov = state.fov;
        this.camera.updateProjectionMatrix();
      }
    } else {
      this.setTarget(state.position);
      this.targetState.quaternion.copy(state.quaternion);
      if (state.fov) {
        this.targetState.fov = state.fov;
      }
    }
  }
}

/**
 * Camera shake effect for impacts or explosions
 */
export class CameraShake {
  private camera: THREE.Camera;
  private intensity: number = 0;
  private decay: number = 0.95;
  private initialPosition: THREE.Vector3;
  private shakeOffset: THREE.Vector3;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.initialPosition = camera.position.clone();
    this.shakeOffset = new THREE.Vector3();
  }

  shake(intensity: number = 0.5) {
    this.intensity = intensity;
    this.initialPosition.copy(this.camera.position);
  }

  update() {
    if (this.intensity > 0.001) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.intensity,
        (Math.random() - 0.5) * this.intensity,
        (Math.random() - 0.5) * this.intensity
      );

      this.camera.position.copy(this.initialPosition).add(this.shakeOffset);
      this.intensity *= this.decay;
    }
  }
}

/**
 * Cinematic camera movements
 */
export class CinematicCamera {
  private camera: THREE.PerspectiveCamera;
  private focusTarget: THREE.Object3D | null = null;
  private offset: THREE.Vector3;
  private smoothing: number = 0.05;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 5, 10);
  }

  /**
   * Follow a target object with smooth camera movement
   */
  followTarget(target: THREE.Object3D, offset?: THREE.Vector3) {
    this.focusTarget = target;
    if (offset) {
      this.offset.copy(offset);
    }
  }

  /**
   * Update cinematic camera movement
   */
  update() {
    if (!this.focusTarget) return;

    // Calculate desired position
    const desiredPosition = this.focusTarget.position.clone().add(this.offset);

    // Smooth interpolation to desired position
    this.camera.position.lerp(desiredPosition, this.smoothing);

    // Smooth look at target
    const targetQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(
      this.camera.position,
      this.focusTarget.position,
      this.camera.up
    );
    targetQuaternion.setFromRotationMatrix(tempMatrix);

    this.camera.quaternion.slerp(targetQuaternion, this.smoothing);
  }

  /**
   * Set camera smoothing factor
   */
  setSmoothing(smoothing: number) {
    this.smoothing = Math.max(0.01, Math.min(1, smoothing));
  }

  /**
   * Stop following target
   */
  stopFollowing() {
    this.focusTarget = null;
  }
}
