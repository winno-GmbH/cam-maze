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
        start: "top top",
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

  // Use a fixed direction for walking (left to right across the maze)
  // Based on the camera position, we'll walk along the X axis
  const walkStart = new THREE.Vector3(-1, camera.position.y, camera.position.z); // Start left of camera
  const walkEnd = new THREE.Vector3(2, camera.position.y, camera.position.z); // End right of camera

  console.log("Walk start:", walkStart, "Walk end:", walkEnd);

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

    // Calculate position from left to right using fixed walk path
    const t = ghostProgress;
    const ghostPosition = walkStart.clone().lerp(walkEnd, t);

    ghost.position.copy(ghostPosition);

    console.log(
      `${key} visible at progress ${t.toFixed(2)}, position:`,
      ghostPosition
    );

    // Make ghost face the direction of movement (to the right)
    const movementDirection = new THREE.Vector3(1, 0, 0);
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
