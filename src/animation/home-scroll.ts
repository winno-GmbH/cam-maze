import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts, pacman } from "../core/objects";
import { getCameraHomeScrollPathPoints } from "../paths/pathpoints";
import { getHomeScrollPaths } from "../paths/paths";
import { homeLoopHandler } from "./home-loop";
import { slerpToLayDown } from "./util";
import { applyHomeScrollPreset, getScrollDirection } from "./scene-presets";

let homeScrollTimeline: gsap.core.Timeline | null = null;
const originalFOV = 50;

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
      console.log(`🔄 Camera 180° rotation detected in ${context}:`, {
        previousRotation: {
          x: previousCameraRotation.x,
          y: previousCameraRotation.y,
          z: previousCameraRotation.z,
          xDegrees: (previousCameraRotation.x * 180) / Math.PI,
          yDegrees: (previousCameraRotation.y * 180) / Math.PI,
          zDegrees: (previousCameraRotation.z * 180) / Math.PI,
        },
        currentRotation: {
          x: currentRotation.x,
          y: currentRotation.y,
          z: currentRotation.z,
          xDegrees: (currentRotation.x * 180) / Math.PI,
          yDegrees: (currentRotation.y * 180) / Math.PI,
          zDegrees: (currentRotation.z * 180) / Math.PI,
        },
        rotationDelta: {
          x: normalizedDiffX,
          y: normalizedDiffY,
          z: normalizedDiffZ,
          xDegrees: (normalizedDiffX * 180) / Math.PI,
          yDegrees: (normalizedDiffY * 180) / Math.PI,
          zDegrees: (normalizedDiffZ * 180) / Math.PI,
        },
      });
    }
  }
  
  previousCameraRotation = currentRotation.clone();
}

const characterSpeeds: Record<string, number> = {
  pacman: 0.9,
  ghost1: 1,
  ghost2: 1.1,
  ghost3: 1.2,
  ghost4: 1.3,
  ghost5: 1.4,
};

export function initHomeScrollAnimation(
  pausedPositions: Record<string, THREE.Vector3>,
  pausedRotations: Record<string, THREE.Quaternion>
) {
  if (homeScrollTimeline) {
    homeScrollTimeline.kill();
    homeScrollTimeline = null;
  }

  const scrollPaths = getHomeScrollPaths(pausedPositions);
  const cameraPathPoints = getCameraHomeScrollPathPoints();

  homeScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        id: "homeScroll",
        trigger: ".sc--home",
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        onEnter: () => {
          console.log("🎬 Home scroll section ENTERED!");
          const scrollDir = getScrollDirection();
          applyHomeScrollPreset(true, scrollDir, pausedPositions, pausedRotations);
        },
        onEnterBack: () => {
          console.log("🎬 Home scroll section ENTERED BACK!");
          const scrollDir = getScrollDirection();
          applyHomeScrollPreset(true, scrollDir, pausedPositions, pausedRotations);
        },
        onScrubComplete: () => {
          homeLoopHandler();
        },
      },
    })
    .to(
      { progress: 0 },
      {
        progress: 1,
        immediateRender: false,
        onUpdate: function () {
          const progress = this.targets()[0].progress;
          camera.fov = originalFOV;
          camera.updateProjectionMatrix();
          updateScrollAnimation(
            progress,
            scrollPaths,
            pausedRotations,
            cameraPathPoints
          );
        },
      }
    );
}

function updateScrollAnimation(
  progress: number,
  paths: Record<string, THREE.CurvePath<THREE.Vector3>>,
  pausedRotations: Record<string, THREE.Quaternion>,
  cameraPathPoints: any[]
) {
  // CRITICAL: Check if intro-scroll is active - if so, don't update objects
  // This prevents conflicts when scrolling between sections
  const introScrollTrigger = gsap.getById("introScroll");
  const isIntroScrollActive = introScrollTrigger && introScrollTrigger.isActive;
  
  // Camera animation (unchanged)
  if (paths.camera) {
    const cameraPoint = paths.camera.getPointAt(progress);
    camera.position.copy(cameraPoint);

    const lookAtCurve = new THREE.CubicBezierCurve3(
      cameraPathPoints[0].lookAt,
      cameraPathPoints[1].lookAt,
      cameraPathPoints[2].lookAt,
      cameraPathPoints[3].lookAt
    );
    const lookAtPoint = lookAtCurve.getPoint(progress);
    
    // Store rotation before lookAt
    const rotationBefore = camera.rotation.clone();
    camera.lookAt(lookAtPoint);
    const rotationAfter = camera.rotation.clone();
    
    // Calculate rotation change
    const rotationChangeY = Math.abs(rotationAfter.y - rotationBefore.y);
    const normalizedChangeY = Math.min(rotationChangeY, Math.PI * 2 - rotationChangeY);
    
    // Log if there's a significant rotation change (tracking cumulative changes)
    if (normalizedChangeY > 0.01) { // Log any noticeable change
      const cumulativeChange = Math.abs(rotationAfter.y);
      if (Math.abs(cumulativeChange - Math.PI) < 0.1 || Math.abs(cumulativeChange) < 0.1) {
        console.log(`🔄 Camera rotation in home-scroll (via lookAt interpolation):`, {
          progress: progress.toFixed(3),
          lookAtPoint: lookAtPoint.clone(),
          cameraPosition: camera.position.clone(),
          rotationBefore: {
            y: rotationBefore.y,
            yDegrees: (rotationBefore.y * 180) / Math.PI,
          },
          rotationAfter: {
            y: rotationAfter.y,
            yDegrees: (rotationAfter.y * 180) / Math.PI,
          },
          rotationChange: {
            y: normalizedChangeY,
            yDegrees: (normalizedChangeY * 180) / Math.PI,
          },
          cumulativeRotation: {
            y: rotationAfter.y,
            yDegrees: (rotationAfter.y * 180) / Math.PI,
          },
          lookAtPoints: {
            start: cameraPathPoints[0].lookAt.clone(),
            second: cameraPathPoints[1].lookAt.clone(),
            third: cameraPathPoints[2].lookAt.clone(),
            end: cameraPathPoints[3].lookAt.clone(),
          },
        });
      }
    }
    
    checkAndLogCameraRotationChange("home-scroll (via lookAt)");
    camera.updateProjectionMatrix();
  }

  // CRITICAL: Don't update object opacity/position if intro-scroll is active
  if (isIntroScrollActive) {
    return;
  }

  // Opacity calculation (unchanged)
  const fadeStartProgress = 0.85;
  const fadeEndProgress = 0.95;
  const opacity =
    progress < fadeStartProgress
      ? 1
      : progress > fadeEndProgress
      ? 0
      : 1 -
        (progress - fadeStartProgress) / (fadeEndProgress - fadeStartProgress);

  // Apply smooth easing to rotation progress (bidirectional - reverses when scrolling up)
  const rotationProgress = Math.pow(progress, 1.5);

  // Pacman animation
  if (paths.pacman && pacman) {
    const pacmanSpeed = characterSpeeds["pacman"] ?? 1.0;
    const rawPacmanProgress = Math.min(progress * pacmanSpeed, 1);
    const easedPacmanProgress = Math.pow(rawPacmanProgress, 1.25);
    const pacmanPoint = paths.pacman.getPointAt(easedPacmanProgress);

    if (pacmanPoint) {
      pacman.position.copy(pacmanPoint);

      // Apply bidirectional laying down animation
      slerpToLayDown(pacman, pausedRotations["pacman"], rotationProgress);

      // Animate pacman opacity - traverse all nested meshes
      pacman.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = opacity;
              mat.transparent = true;
            });
          } else {
            (mesh.material as any).opacity = opacity;
            (mesh.material as any).transparent = true;
          }
        }
      });
    }
  }

  // Ghosts animation
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const path = paths[key];
    if (path) {
      const ghostSpeed = characterSpeeds[key] ?? 1.0;
      const rawGhostProgress = Math.min(progress * ghostSpeed, 1);
      const easedGhostProgress = Math.pow(rawGhostProgress, 1.25);
      const ghostPoint = path.getPointAt(easedGhostProgress);

      if (ghostPoint) {
        ghost.position.copy(ghostPoint);

        // Apply bidirectional laying down animation
        slerpToLayDown(ghost, pausedRotations[key], rotationProgress);

      // Animate ghost opacity - traverse all nested meshes
      ghost.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = opacity;
              mat.transparent = true;
            });
          } else {
            (mesh.material as any).opacity = opacity;
            (mesh.material as any).transparent = true;
          }
        }
      });
      }
    }
  });
}
