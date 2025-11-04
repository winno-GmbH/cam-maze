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
          console.log("🎬 Intro section ENTERED!");
          resetGhostsForIntro();
          hideEverythingExceptObjects();
        },
        onEnterBack: () => {
          console.log("🎬 Intro section ENTERED BACK!");
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
  console.log("🎬 resetGhostsForIntro called");
  // Make objects visible and set opacity (similar to home-scroll.ts approach)
  const objectsToAnimate = ["pacman", "ghost1", "ghost2", "ghost3"];

  Object.entries(ghosts).forEach(([key, object]) => {
    if (objectsToAnimate.includes(key)) {
      object.visible = true;
      object.scale.set(0.1, 0.1, 0.1);

      // Set opacity to 1 and change colors for ghosts (like home-scroll.ts does)
      const ghostColors: Record<string, number> = {
        ghost1: 0xff0000, // Red
        ghost2: 0x00ff00, // Green
        ghost3: 0x0000ff, // Blue
      };
      
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          const mesh = child as THREE.Mesh;
          const childName = child.name || "";
          
          // Keep currency symbols hidden
          if (["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName)) {
            mesh.visible = false;
            return;
          }
          
          // For ghosts: only show Ghost_Mesh parts
          if (key !== "pacman" && !childName.startsWith("Ghost_Mesh")) {
            mesh.visible = false;
            return;
          }
          
          // For pacman: hide Shell and Bitcoin parts
          if (key === "pacman" && (
            childName.includes("Shell") || 
            childName.includes("Bitcoin_1") || 
            childName.includes("Bitcoin_2")
          )) {
            mesh.visible = false;
            return;
          }
          
          // Make visible and set opacity
          mesh.visible = true;
          
          // Change ghost colors to bright colors for visibility
          if (ghostColors[key] && childName.startsWith("Ghost_Mesh")) {
            const newColor = ghostColors[key];
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat: any) => {
                mat.color.setHex(newColor);
                mat.opacity = 1;
              });
            } else {
              (mesh.material as any).color.setHex(newColor);
              (mesh.material as any).opacity = 1;
            }
          } else {
            // Just set opacity for pacman
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat: any) => {
                mat.opacity = 1;
              });
            } else {
              (mesh.material as any).opacity = 1;
            }
          }
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

}

function updateObjectsWalkBy(progress: number) {
  // Debug: Log first few animation updates
  if (progress < 0.1) {
    console.log("🎬 Animation update - Progress:", progress.toFixed(3), "Camera:", camera.position);
  }
  
  // Position objects much further down and in front of camera
  const distanceBelow = 100; // Much further below camera
  const distanceInFront = 50; // Much further in front of camera
  
  // Calculate a point in front of camera where objects will walk
  // Camera looks down, so objects should be below camera and in front
  const centerPoint = new THREE.Vector3(
    camera.position.x,
    camera.position.y - distanceBelow, // Below camera
    camera.position.z - distanceInFront // In front of camera (camera looks toward negative Z)
  );
  
  // Walk from left edge to center of viewfield
  const walkStart = centerPoint.x - 5.0; // Left edge
  const walkEnd = centerPoint.x; // Center (camera x position)
  
  // Debug: Log positioning info
  if (progress < 0.05) {
    console.log("🎬 Center point:", centerPoint, "Walk:", walkStart, "to", walkEnd);
  }
  
  const objectsToAnimate = [
    { key: "pacman", offset: 0 },
    { key: "ghost1", offset: 0.25 },
    { key: "ghost2", offset: 0.5 },
    { key: "ghost3", offset: 0.75 },
  ];

  objectsToAnimate.forEach(({ key, offset }) => {
    const object = ghosts[key];
    if (!object) {
      if (progress < 0.05) console.warn(`⚠️ ${key} not found!`);
      return;
    }

    const objectProgress = (progress + offset) % 1.0;
    
    // Calculate position from left to center
    const x = walkStart + (walkEnd - walkStart) * objectProgress;
    // Position objects relative to camera's view direction
    object.position.set(x, centerPoint.y, centerPoint.z);
    
    // Debug: Log first object position
    if (progress < 0.05 && key === "pacman") {
      console.log(`🎬 ${key} positioned at:`, object.position, "visible:", object.visible);
    }
    
    // Set opacity to 1 and maintain ghost colors (like home-scroll.ts does)
    const ghostColors: Record<string, number> = {
      ghost1: 0xff0000, // Red
      ghost2: 0x00ff00, // Green
      ghost3: 0x0000ff, // Blue
    };
    
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        const mesh = child as THREE.Mesh;
        const childName = child.name || "";
        
        // Keep currency symbols hidden
        if (["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName)) {
          mesh.visible = false;
          return;
        }
        
        // For ghosts: only show Ghost_Mesh parts
        if (key !== "pacman" && !childName.startsWith("Ghost_Mesh")) {
          mesh.visible = false;
          return;
        }
        
        // For pacman: hide Shell and Bitcoin parts
        if (key === "pacman" && (
          childName.includes("Shell") || 
          childName.includes("Bitcoin_1") || 
          childName.includes("Bitcoin_2")
        )) {
          mesh.visible = false;
          return;
        }
        
        // Make visible and set opacity
        mesh.visible = true;
        
        // Change ghost colors to bright colors for visibility
        if (ghostColors[key] && childName.startsWith("Ghost_Mesh")) {
          const newColor = ghostColors[key];
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.color.setHex(newColor);
              mat.opacity = 1;
            });
          } else {
            (mesh.material as any).color.setHex(newColor);
            (mesh.material as any).opacity = 1;
          }
        } else {
          // Just set opacity for pacman
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = 1;
            });
          } else {
            (mesh.material as any).opacity = 1;
          }
        }
      }
    });
  });
}
