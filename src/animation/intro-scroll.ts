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
          console.log(
            "🎬 Intro section entered - Camera pos:",
            camera.position
          );
          resetGhostsForIntro();
          hideEverythingExceptObjects();
        },
        onEnterBack: () => {
          console.log(
            "🎬 Intro section entered back - Camera pos:",
            camera.position
          );
          resetGhostsForIntro();
          hideEverythingExceptObjects();
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
          if (progress > 0 && progress < 0.1) {
            console.log("🎬 Animation update - Progress:", progress.toFixed(3));
          }
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
      object.scale.set(0.01, 0.01, 0.01);

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

// Hide everything except pacman and ghosts for testing
function hideEverythingExceptObjects() {
  scene.traverse((child) => {
    if (
      child.name &&
      !child.name.includes("pacman") &&
      !child.name.includes("Ghost")
    ) {
      child.visible = false;
    }
  });

  // Reset objects for intro animation
  resetObjectsForIntro();
}

function resetObjectsForIntro() {
  // Reset pacman and ghosts for intro animation with proper scale
  Object.entries(ghosts).forEach(([key, object]) => {
    if (
      key === "pacman" ||
      key === "ghost1" ||
      key === "ghost2" ||
      key === "ghost3"
    ) {
      object.visible = true;
      object.scale.set(0.1, 0.1, 0.1); // Much smaller scale

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
  // Animate pacman and ghosts using the working positioning from test spheres
  const walkWidth = 10.0;
  const walkStart = -walkWidth / 2;
  const walkEnd = walkWidth / 2;

  const objectsToAnimate = [
    { key: "pacman", offset: 0 },
    { key: "ghost1", offset: 0.25 },
    { key: "ghost2", offset: 0.5 },
    { key: "ghost3", offset: 0.75 },
  ];

  objectsToAnimate.forEach(({ key, offset }) => {
    const object = ghosts[key];
    if (!object) return;

    const objectProgress = (progress + offset) % 1.0;

    // Calculate position from left to right (same as test spheres)
    const x = walkStart + (walkEnd - walkStart) * objectProgress;
    object.position.set(x, -50, -19.548);

    // Apply laying down rotation
    if (key === "pacman") {
      object.rotation.set(-Math.PI / 2, Math.PI, -(Math.PI / 2));
    } else {
      object.rotation.set(Math.PI / 2, 0, 0);
    }
  });
}
