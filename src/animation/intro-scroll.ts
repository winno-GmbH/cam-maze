import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";

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
          console.log("Intro section entered!");
          resetGhostsForIntro();
          // Change world background to red for better visibility
          scene.background = new THREE.Color(0xff0000);
        },
        onEnterBack: () => {
          console.log("Intro section entered back!");
          resetGhostsForIntro();
          // Change world background to red for better visibility
          scene.background = new THREE.Color(0xff0000);
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
          console.log("Animation update called with progress:", progress);
          updateObjectsWalkBy(progress);
        },
      },
      0 // Start at the same time as the other animations
    );
}

function resetGhostsForIntro() {
  // Reset object materials to be visible for intro animation
  Object.entries(ghosts).forEach(([key, object]) => {
    if (
      key === "pacman" ||
      key === "ghost1" ||
      key === "ghost2" ||
      key === "ghost3"
    ) {
      object.visible = true;
      object.scale.set(0.5, 0.5, 0.5);

      // Reset material opacity to 1
      object.traverse((child) => {
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
  // Position ghosts deeper in the 3D world so they're visible in front of camera
  const depthOffset = 2.0; // Move further away from camera
  const walkStart = new THREE.Vector3(-1, 0.3, camera.position.z - depthOffset); // Start left, lower Y, deeper Z
  const walkEnd = new THREE.Vector3(2, 0.3, camera.position.z - depthOffset); // End right, lower Y, deeper Z

  console.log("Walk start:", walkStart, "Walk end:", walkEnd);

  // Animate pacman and ghosts walking by
  const objectsToAnimate = [
    { key: "pacman", offset: 0, speed: 0.8 },
    { key: "ghost1", offset: 0.2, speed: 1.0 },
    { key: "ghost2", offset: 0.5, speed: 1.1 },
    { key: "ghost3", offset: 0.8, speed: 0.9 },
  ];

  objectsToAnimate.forEach(({ key, offset, speed }) => {
    const object = ghosts[key];
    if (!object) return;

    // Calculate progress with offset and speed
    const objectProgress = ((progress + offset) * speed) % 1.2; // Loop with spacing

    // Only show object during its active phase
    if (objectProgress > 1.0) {
      object.visible = false;
      return;
    }

    object.visible = true;
    object.scale.set(0.5, 0.5, 0.5);

    // Calculate position from left to right using fixed walk path
    const t = objectProgress;
    const objectPosition = walkStart.clone().lerp(walkEnd, t);

    object.position.copy(objectPosition);

    console.log(
      `${key} visible at progress ${t.toFixed(2)}, position:`,
      objectPosition
    );

    // Apply laying down rotation (same as in maze)
    if (key === "pacman") {
      // Pacman rotation
      object.rotation.set(-Math.PI / 2, Math.PI, -(Math.PI / 2));
    } else {
      // Ghost rotation - laying down state
      object.rotation.set(Math.PI / 2, 0, 0);
    }

    // Fade in/out at edges
    let opacity = 1.0;
    if (t < 0.1) {
      opacity = t / 0.1;
    } else if (t > 0.9) {
      opacity = (1.0 - t) / 0.1;
    }

    // Apply opacity to object material
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        (child as any).material.opacity = opacity;
        (child as any).material.transparent = true;
      }
    });
  });
}
