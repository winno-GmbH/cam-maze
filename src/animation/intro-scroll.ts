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

  // Create working test objects
  createWorkingObjects();
}

let workingObjects: THREE.Mesh[] = [];

function createWorkingObjects() {
  // Remove existing objects
  workingObjects.forEach((obj) => scene.remove(obj));
  workingObjects = [];

  // Create objects that look like pacman and ghosts
  const pacmanGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const pacmanMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00, // Yellow like pacman
    opacity: 1.0,
    transparent: false,
  });
  const pacman = new THREE.Mesh(pacmanGeometry, pacmanMaterial);
  pacman.visible = true;
  workingObjects.push(pacman);

  // Create 3 ghosts
  for (let i = 0; i < 3; i++) {
    const ghostGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xff0000 : i === 1 ? 0x00ff00 : 0x0000ff, // Red, Green, Blue
      opacity: 1.0,
      transparent: false,
    });
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
    ghost.visible = true;
    workingObjects.push(ghost);
  }

  // Add all to scene
  workingObjects.forEach((obj) => scene.add(obj));

  console.log(
    "Created",
    workingObjects.length,
    "working objects for intro animation"
  );
}

function updateObjectsWalkBy(progress: number) {
  // Animate working objects (pacman + 3 ghosts)
  if (workingObjects.length === 0) return;

  const walkWidth = 10.0;
  const walkStart = -walkWidth / 2;
  const walkEnd = walkWidth / 2;

  workingObjects.forEach((object, index) => {
    const offset = index * 0.25; // Stagger the objects
    const objectProgress = (progress + offset) % 1.0;

    // Calculate position from left to right
    const x = walkStart + (walkEnd - walkStart) * objectProgress;
    object.position.set(x, -50, -19.548);
  });
}
