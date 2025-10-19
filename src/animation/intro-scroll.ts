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
            "Intro section entered - Camera pos:",
            camera.position,
            "Camera lookAt:",
            camera.getWorldDirection(new THREE.Vector3())
          );
          resetGhostsForIntro();
        },
        onEnterBack: () => {
          console.log(
            "Intro section entered back - Camera pos:",
            camera.position,
            "Camera lookAt:",
            camera.getWorldDirection(new THREE.Vector3())
          );
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
  // Calculate camera's view direction and create a plane in front of it
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Create a plane perpendicular to camera direction, positioned in front of camera
  const distanceInFront = 1.0; // Distance in front of camera
  const centerPoint = camera.position
    .clone()
    .add(cameraDirection.multiplyScalar(distanceInFront));

  // Create right vector for horizontal movement
  const cameraRight = new THREE.Vector3();
  cameraRight.crossVectors(camera.up, cameraDirection).normalize();

  // Define walk path: left to right across the camera's view
  const walkWidth = 3.0;
  const walkStart = centerPoint
    .clone()
    .add(cameraRight.clone().multiplyScalar(-walkWidth / 2));
  const walkEnd = centerPoint
    .clone()
    .add(cameraRight.clone().multiplyScalar(walkWidth / 2));

  // Log only once per animation cycle for debugging
  if (progress < 0.01) {
    console.log(
      "Walk path calculated - Start:",
      walkStart,
      "End:",
      walkEnd,
      "Camera direction:",
      cameraDirection
    );
  }

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
