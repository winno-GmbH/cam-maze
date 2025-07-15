import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { camera } from "../core/camera";
import { getPOVPaths } from "../paths/paths";
import { povTriggerPositions } from "../paths/pathpoints";
import { GhostContainer } from "../types/types";

gsap.registerPlugin(ScrollTrigger);

interface POVAnimationState {
  isInPOVSection: boolean;
  animationStarted: boolean;
  rotationStarted: boolean;
  startedInitEndScreen: boolean;
  endScreenPassed: boolean;
  startEndProgress: number;
  cachedStartYAngle: number | null;
}

class POVAnimationHandler {
  private paths: Record<string, THREE.CurvePath<THREE.Vector3>>;
  private ghosts: GhostContainer;
  private state: POVAnimationState;
  private timeline: gsap.core.Timeline | null = null;

  // Animation constants
  private readonly TRIGGER_DISTANCE = 0.02;
  private readonly START_END_SCREEN_SECTION_PROGRESS = 0.8;
  private readonly ROTATION_STARTING_POINT = 0.973;

  // Key positions
  private readonly startRotationPoint = new THREE.Vector3(0.55675, 0.55, 1.306);
  private readonly endRotationPoint = new THREE.Vector3(-0.14675, 1, 1.8085);
  private readonly targetLookAt = new THREE.Vector3(0.55675, 0.1, 1.306);
  private readonly finalLookAt = new THREE.Vector3(-0.14675, 0, 1.8085);
  private readonly povStartPoint1 = new THREE.Vector3(0.55675, -5, 0.45175);
  private readonly povStartPoint2 = new THREE.Vector3(0.55675, -2.5, 0.45175);

  constructor(ghosts: GhostContainer) {
    this.ghosts = ghosts;
    this.paths = getPOVPaths();

    this.state = {
      isInPOVSection: false,
      animationStarted: false,
      rotationStarted: false,
      startedInitEndScreen: false,
      endScreenPassed: false,
      startEndProgress: 0,
      cachedStartYAngle: null,
    };

    this.setupPOVTimeline();
  }

  private setupPOVTimeline(): void {
    this.timeline = gsap
      .timeline({
        scrollTrigger: {
          trigger: ".sc--pov",
          start: "top bottom",
          end: "bottom top",
          endTrigger: ".sc--final",
          scrub: 0.5,
          toggleActions: "play none none reverse",
          onLeave: () => this.handleLeavePOV(),
          onLeaveBack: () => this.handleLeavePOV(),
        },
      })
      .to(
        { progress: 0 },
        {
          progress: 1,
          immediateRender: false,
          onStart: () => this.handleAnimationStart(),
          onUpdate: () => this.handleAnimationUpdate(),
          onReverseComplete: () => this.resetState(true),
          onComplete: () => this.resetState(),
        }
      );
  }

  private handleAnimationStart(): void {
    // Hide pacman during POV
    if (this.ghosts.pacman) {
      this.ghosts.pacman.visible = false;
    }

    // Hide all ghosts initially
    Object.entries(this.ghosts).forEach(([key, ghost]) => {
      if (key !== "pacman") {
        ghost.visible = false;
      }
    });

    this.state.animationStarted = true;
  }

  private handleAnimationUpdate(): void {
    if (!this.timeline) return;

    const progress = this.timeline.progress();
    this.updateCamera(progress);
    this.updateGhosts(progress);
  }

  private updateCamera(progress: number): void {
    if (!this.paths.camera) return;

    const position = this.paths.camera.getPointAt(progress);
    camera.position.copy(position);
    camera.fov = 80; // wideFOV

    const tangent = this.paths.camera.getTangentAt(progress).normalize();
    const defaultLookAt = position.clone().add(tangent);

    // Handle initial transition
    if (progress === 0) {
      camera.lookAt(new THREE.Vector3(camera.position.x, 2, camera.position.z));
    } else if (progress < 0.1) {
      const transitionProgress = progress / 0.1;
      const upLookAt = new THREE.Vector3(
        camera.position.x,
        1,
        camera.position.z
      );
      const frontLookAt = new THREE.Vector3(
        camera.position.x,
        0.5,
        camera.position.z + 1
      );

      const interpolatedLookAt = new THREE.Vector3();
      interpolatedLookAt.lerpVectors(
        upLookAt,
        frontLookAt,
        this.smoothStep(transitionProgress)
      );

      camera.lookAt(interpolatedLookAt);
    }

    // Find key progress points
    const point1Progress = this.findClosestProgressOnPath(
      this.paths.camera,
      this.povStartPoint1
    );
    const point2Progress = this.findClosestProgressOnPath(
      this.paths.camera,
      this.povStartPoint2
    );
    const startRotationProgress = this.findClosestProgressOnPath(
      this.paths.camera,
      this.startRotationPoint
    );
    const endRotationProgress = this.findClosestProgressOnPath(
      this.paths.camera,
      this.endRotationPoint
    );

    // Handle different phases
    if (progress <= point2Progress) {
      this.handleHomeTransition(
        progress,
        position,
        defaultLookAt,
        point1Progress,
        point2Progress
      );
    } else if (
      progress >= startRotationProgress &&
      progress <= endRotationProgress
    ) {
      this.handleRotationPhase(
        progress,
        position,
        defaultLookAt,
        startRotationProgress,
        endRotationProgress
      );
    } else if (
      progress > this.START_END_SCREEN_SECTION_PROGRESS &&
      this.state.endScreenPassed
    ) {
      this.handleEndSequence(progress);
    } else {
      this.handleDefaultOrientation(
        progress,
        startRotationProgress,
        endRotationProgress,
        defaultLookAt
      );
    }

    camera.updateProjectionMatrix();
  }

  private handleHomeTransition(
    progress: number,
    position: THREE.Vector3,
    defaultLookAt: THREE.Vector3,
    point1Progress: number,
    point2Progress: number
  ): void {
    const transitionProgress =
      (progress - point1Progress) / (point2Progress - point1Progress);

    if (transitionProgress >= 0 && transitionProgress <= 1) {
      const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(position, defaultLookAt, camera.up)
      );

      const easedProgress = this.smoothStep(transitionProgress);
      const newQuaternion = new THREE.Quaternion()
        .copy(camera.quaternion)
        .slerp(targetQuaternion, easedProgress);

      camera.quaternion.copy(newQuaternion);
    } else if (transitionProgress > 1) {
      camera.lookAt(defaultLookAt);
    }
  }

  private handleRotationPhase(
    progress: number,
    position: THREE.Vector3,
    defaultLookAt: THREE.Vector3,
    startRotationProgress: number,
    endRotationProgress: number
  ): void {
    const sectionProgress =
      (progress - startRotationProgress) /
      (endRotationProgress - startRotationProgress);

    if (this.state.cachedStartYAngle === null) {
      const startDir = new THREE.Vector2(
        defaultLookAt.x - position.x,
        defaultLookAt.z - position.z
      ).normalize();
      this.state.cachedStartYAngle = Math.atan2(startDir.y, startDir.x);
      this.state.cachedStartYAngle =
        this.state.cachedStartYAngle > 3
          ? this.state.cachedStartYAngle / 2
          : this.state.cachedStartYAngle;
    }

    const targetDir = new THREE.Vector2(
      this.targetLookAt.x - position.x,
      this.targetLookAt.z - position.z
    ).normalize();
    let targetYAngle = Math.atan2(targetDir.y, targetDir.x);

    let angleDiff = targetYAngle - this.state.cachedStartYAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    else if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    angleDiff = -angleDiff * 1.75;
    targetYAngle = this.state.cachedStartYAngle + angleDiff;

    const easedProgress = this.smoothStep(sectionProgress);
    const newYAngle =
      this.state.cachedStartYAngle * (1 - easedProgress) +
      targetYAngle * easedProgress;

    const radius = 1.0;
    const newLookAt = new THREE.Vector3(
      position.x + Math.cos(newYAngle) * radius,
      position.y,
      position.z + Math.sin(newYAngle) * radius
    );

    camera.lookAt(newLookAt);

    if (progress >= endRotationProgress) {
      this.state.cachedStartYAngle = null;
    }
    this.state.rotationStarted = true;

    if (
      progress >= this.START_END_SCREEN_SECTION_PROGRESS &&
      !this.state.startedInitEndScreen
    ) {
      this.state.startedInitEndScreen = true;
      this.initEndScreen();
    }
  }

  private handleEndSequence(progress: number): void {
    if (this.state.startEndProgress === 0 && progress !== 1) {
      const truncatedProgress = Math.floor(progress * 100) / 100;
      this.state.startEndProgress =
        truncatedProgress === 0.99 ? this.ROTATION_STARTING_POINT : progress;
    }

    const animationProgress =
      (progress - this.state.startEndProgress) /
      (1 - this.state.startEndProgress);

    if (animationProgress > 0) {
      const currentLookAt = this.getCameraLookAtPoint();
      const interpolatedLookAt = new THREE.Vector3().lerpVectors(
        currentLookAt,
        this.finalLookAt,
        this.smoothStep(animationProgress)
      );

      const startFOV = 80;
      const targetFOV = 20;
      camera.fov =
        startFOV + (targetFOV - startFOV) * this.smoothStep(animationProgress);

      camera.lookAt(interpolatedLookAt);
    }
  }

  private handleDefaultOrientation(
    progress: number,
    startRotationProgress: number,
    endRotationProgress: number,
    defaultLookAt: THREE.Vector3
  ): void {
    if (
      (progress < startRotationProgress || progress > endRotationProgress) &&
      !this.state.startedInitEndScreen
    ) {
      this.state.cachedStartYAngle = null;
      this.state.rotationStarted = false;
      this.state.endScreenPassed = false;
      this.state.startedInitEndScreen = false;

      const finalSection = document.querySelector(
        ".sc--final.sc"
      ) as HTMLElement;
      if (finalSection) {
        finalSection.style.opacity = "0";
      }
    }

    if (!this.state.rotationStarted && !this.state.startedInitEndScreen) {
      camera.lookAt(defaultLookAt);
    }

    if (!(this.state.endScreenPassed && progress > 0.8)) {
      this.state.startEndProgress = 0;
    }
  }

  private updateGhosts(cameraProgress: number): void {
    const pathMapping = this.getPathMapping();

    Object.entries(this.ghosts).forEach(([key, ghost]) => {
      if (key === "pacman") return;

      const pathKey = pathMapping[key];
      if (
        this.paths[pathKey] &&
        povTriggerPositions[key as keyof typeof povTriggerPositions]
      ) {
        this.updateGhost(key, ghost, pathKey, cameraProgress);
      }
    });
  }

  private updateGhost(
    key: string,
    ghost: THREE.Object3D,
    pathKey: string,
    cameraProgress: number
  ): void {
    const triggerData =
      povTriggerPositions[key as keyof typeof povTriggerPositions];
    if (!triggerData) return;

    const path = this.paths[pathKey];
    if (!path) return;

    // Find closest progress on camera path to trigger position
    const triggerProgress = this.findClosestProgressOnPath(
      this.paths.camera!,
      triggerData.triggerPos
    );

    // Calculate distance to trigger
    const distanceToTrigger = Math.abs(cameraProgress - triggerProgress);

    if (distanceToTrigger < this.TRIGGER_DISTANCE) {
      // Show ghost and animate it
      ghost.visible = true;

      // Calculate ghost progress based on camera progress
      const ghostProgress = Math.max(0, (cameraProgress - triggerProgress) * 2);
      const clampedProgress = Math.min(1, ghostProgress);

      if (clampedProgress <= 1) {
        const position = path.getPointAt(clampedProgress);
        ghost.position.copy(position);

        const tangent = path.getTangentAt(clampedProgress).normalize();
        ghost.lookAt(position.clone().add(tangent));
      }
    } else {
      ghost.visible = false;
    }
  }

  private findClosestProgressOnPath(
    path: THREE.CurvePath<THREE.Vector3>,
    targetPoint: THREE.Vector3,
    samples = 2000
  ): number {
    let closestProgress = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < samples; i++) {
      try {
        const t = i / (samples - 1);
        const pointOnPath = path.getPointAt(t);
        if (!pointOnPath) continue;

        const distance = pointOnPath.distanceTo(targetPoint);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestProgress = t;
        }
      } catch (error) {
        continue;
      }
    }

    return closestProgress;
  }

  private getCameraLookAtPoint(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    const lookAtPoint = new THREE.Vector3();
    lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
    return lookAtPoint;
  }

  private smoothStep(x: number): number {
    return x * x * (3 - 2 * x);
  }

  private getPathMapping(): Record<string, string> {
    return {
      pacman: "camera", // Pacman follows camera path in POV
      ghost1: "ghost1",
      ghost2: "ghost2",
      ghost3: "ghost3",
      ghost4: "ghost4",
      ghost5: "ghost5",
    };
  }

  private initEndScreen(): void {
    this.state.endScreenPassed = true;
    const finalSection = document.querySelector(".sc--final.sc") as HTMLElement;
    if (finalSection) {
      gsap.to(finalSection, {
        opacity: 1,
        duration: 1,
        ease: "power2.out",
      });
    }
  }

  private handleLeavePOV(): void {
    this.state.isInPOVSection = false;

    // Reset camera FOV
    camera.fov = 50; // originalFOV
    camera.updateProjectionMatrix();

    // Show pacman again
    if (this.ghosts.pacman) {
      this.ghosts.pacman.visible = true;
    }
  }

  private resetState(isReverse = false): void {
    this.state.animationStarted = false;
    this.state.rotationStarted = false;
    this.state.cachedStartYAngle = null;
    this.state.startEndProgress = 0;
    this.state.startedInitEndScreen = false;
    this.state.endScreenPassed = false;

    // Reset ghosts visibility
    Object.entries(this.ghosts).forEach(([key, ghost]) => {
      if (key !== "pacman") {
        ghost.visible = false;
      }
    });

    if (this.ghosts.pacman) {
      this.ghosts.pacman.visible = true;
    }

    // Reset camera FOV
    camera.fov = 50;
    camera.updateProjectionMatrix();
  }

  public destroy(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}

export { POVAnimationHandler };
