import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";

let introScrollTimeline: gsap.core.Timeline | null = null;

export function initIntroScrollAnimation() {
  introScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        trigger: ".sc--intro",
        start: "top center",
        end: "bottom bottom",
        scrub: 0.5,
        onEnter: () => {
          resetGhostsForIntro();
        },
        onEnterBack: () => {
          resetGhostsForIntro();
        },
      },
    })
    .fromTo(
      ".sc_h--intro",
      { scale: 0.5, opacity: 0 },
      {
        keyframes: [
          { scale: 0.5, opacity: 0, duration: 0 },
          { scale: 0.8, opacity: 1, duration: 0.3 },
          { scale: 1.2, opacity: 1, duration: 0.4 },
          { scale: 1.5, opacity: 0, duration: 0.3 },
        ],
      }
    )
    .fromTo(
      ".sc_b--intro",
      { scale: 0.5, opacity: 0 },
      {
        keyframes: [
          { scale: 0.5, opacity: 0, duration: 0 },
          { scale: 0.8, opacity: 1, duration: 0.3 },
          { scale: 1.2, opacity: 1, duration: 0.4 },
          { scale: 1.5, opacity: 0, duration: 0.3 },
        ],
      }
    )
    .to(
      { progress: 0 },
      {
        progress: 1,
        duration: 1,
        immediateRender: false,
        onUpdate: function () {
          const progress = (this.targets()[0] as any).progress;
          updateObjectsWalkBy(progress);
        },
      },
      0 // Start at the same time as the other animations
    );
}

function resetGhostsForIntro() {
  // Reset ghost materials to be visible for intro animation
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (
      key !== "pacman" &&
      (key === "ghost1" || key === "ghost2" || key === "ghost3")
    ) {
      ghost.visible = true;
      ghost.scale.set(0.5, 0.5, 0.5);

      // Reset material opacity to 1
      ghost.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          (child as any).material.opacity = 1;
          (child as any).material.transparent = true;
        }
      });
    }
  });
}

function updateObjectsWalkBy(progress: number) {
  console.log(
    "Intro walk-by progress:",
    progress,
    "Camera pos:",
    camera.position
  );

  // Get camera's forward and right vectors
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Calculate right vector (perpendicular to camera direction)
  const cameraRight = new THREE.Vector3();
  cameraRight.crossVectors(camera.up, cameraDirection).normalize();

  // Calculate a point in front of the camera where objects will walk
  const distanceFromCamera = 1.5; // Distance in front of camera (reduced for better visibility)
  const centerPoint = camera.position
    .clone()
    .add(cameraDirection.multiplyScalar(distanceFromCamera));

  // Set the Y position to be at ground level for proper viewing
  centerPoint.y = 0.5; // Ground level of the maze

  // Define the width of the walking path
  const walkWidth = 2.5;

  // Animate up to 3 ghosts walking by
  const ghostsToAnimate = [
    { key: "ghost1", offset: 0, speed: 1.0 },
    { key: "ghost2", offset: 0.3, speed: 1.1 },
    { key: "ghost3", offset: 0.6, speed: 0.9 },
  ];

  ghostsToAnimate.forEach(({ key, offset, speed }) => {
    const ghost = ghosts[key];
    if (!ghost) return;

    // Calculate progress with offset and speed
    const ghostProgress = ((progress + offset) * speed) % 1.2; // Loop with spacing

    // Only show ghost during its active phase
    if (ghostProgress > 1.0) {
      ghost.visible = false;
      return;
    }

    ghost.visible = true;
    ghost.scale.set(0.5, 0.5, 0.5);

    // Calculate position from left to right
    const t = ghostProgress;
    const xOffset = (t - 0.5) * walkWidth;
    const ghostPosition = centerPoint
      .clone()
      .add(cameraRight.clone().multiplyScalar(xOffset));

    ghost.position.copy(ghostPosition);

    console.log(
      `${key} visible at progress ${t.toFixed(2)}, position:`,
      ghostPosition
    );

    // Make ghost face the direction of movement (to the right)
    const movementDirection = cameraRight.clone();
    ghost.lookAt(ghostPosition.clone().add(movementDirection));

    // Fade in/out at edges
    let opacity = 1.0;
    if (t < 0.1) {
      opacity = t / 0.1;
    } else if (t > 0.9) {
      opacity = (1.0 - t) / 0.1;
    }

    // Apply opacity to ghost material
    ghost.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        (child as any).material.opacity = opacity;
        (child as any).material.transparent = true;
      }
    });
  });

  // Hide pacman during intro
  if (ghosts.pacman) {
    ghosts.pacman.visible = false;
  }
}
