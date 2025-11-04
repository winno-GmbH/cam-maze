import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";
import { slerpToLayDown } from "./util";

let introScrollTimeline: gsap.core.Timeline | null = null;

// Store initial rotations when entering intro section (like pausedRotations in home-scroll)
let introInitialRotations: Record<string, THREE.Quaternion> = {};

// Position offsets (hardcoded from previous adjuster values)
const POSITION_OFFSET = {
  x: 4.30,
  y: -2.00,
  z: 0.00,
};

let continuousUpdateInterval: number | null = null;
let isContinuousUpdateActive = false;

export function initIntroScrollAnimation() {
  // Stop any existing continuous update
  if (continuousUpdateInterval !== null) {
    cancelAnimationFrame(continuousUpdateInterval);
    continuousUpdateInterval = null;
  }
  isContinuousUpdateActive = false;
  
  // Start continuous update loop to ensure positions are always set
  // This runs MORE frequently than home-loop to override any position updates
  // Use requestAnimationFrame for smoother updates during scrolling
  isContinuousUpdateActive = true;
  let lastUpdateTime = 0;
  function continuousUpdate(currentTime: number) {
    if (!isContinuousUpdateActive) return;
    
    const deltaTime = currentTime - lastUpdateTime;
    // Update at ~60fps (every ~16ms)
    if (deltaTime >= 16) {
      lastUpdateTime = currentTime;
      
      // Check if intro section is visible in viewport
      const introSection = document.querySelector(".sc--intro");
      if (introSection) {
        const rect = introSection.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible) {
          // Always update, even if timeline progress is 0 or undefined
          const progress = introScrollTimeline ? introScrollTimeline.progress() : 0;
          // Force update to override any other animations (like home-loop)
          updateObjectsWalkBy(Math.max(0, progress));
        }
      }
    }
    
    // Continue the loop
    continuousUpdateInterval = requestAnimationFrame(continuousUpdate) as any;
  }
  
  // Start the continuous update loop
  continuousUpdateInterval = requestAnimationFrame(continuousUpdate) as any;
  
  introScrollTimeline = gsap
    .timeline({
    scrollTrigger: {
      trigger: ".sc--intro",
        start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      refreshPriority: 1, // Ensure ScrollTrigger refreshes properly
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
        onLeave: () => {
          console.log("🎬 Intro section LEFT!");
          // Restore floor to original appearance when leaving intro section
          scene.traverse((child) => {
            if (child.name === "CAM-Floor") {
              child.visible = true;
              if (child instanceof THREE.Mesh && child.material) {
                const material = child.material as THREE.MeshBasicMaterial;
                material.color.setHex(0xffffff); // White
                material.opacity = 1;
                material.transparent = false;
                console.log("🎬 Restored floor plane:", child.name);
              }
            }
          });
        },
        onLeaveBack: () => {
          console.log("🎬 Intro section LEFT BACK!");
          // Restore floor to original appearance when leaving intro section
          scene.traverse((child) => {
            if (child.name === "CAM-Floor") {
              child.visible = true;
              if (child instanceof THREE.Mesh && child.material) {
                const material = child.material as THREE.MeshBasicMaterial;
                material.color.setHex(0xffffff); // White
                material.opacity = 1;
                material.transparent = false;
                console.log("🎬 Restored floor plane:", child.name);
              }
            }
          });
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
          // Debug: Log progress updates
          if (progress > 0 && progress < 0.1) {
            console.log("🎬 Timeline update - Progress:", progress.toFixed(3));
          }
          updateObjectsWalkBy(progress);
        },
        onStart: function () {
          console.log("🎬 Animation timeline STARTED!");
        },
      },
      0 // Start at the same time as the other animations
    );
}

function resetGhostsForIntro() {
  console.log("🎬 resetGhostsForIntro called");
  
  // Make floor plane semi-transparent red so it's visible but doesn't block view
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xff0000); // Red
        material.opacity = 0.1;
        material.transparent = true;
        console.log("🎬 Made floor plane semi-transparent red:", child.name);
      }
    }
  });
  
  // Make objects visible and set opacity (similar to home-scroll.ts approach)
  const objectsToAnimate = ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];

  Object.entries(ghosts).forEach(([key, object]) => {
    if (objectsToAnimate.includes(key)) {
      // CRITICAL: Store initial rotation before applying laying down rotation
      if (!introInitialRotations[key]) {
        introInitialRotations[key] = object.quaternion.clone();
      }
      
      // CRITICAL: Force visibility and scale BEFORE anything else
      object.visible = true;
      object.scale.set(0.1, 0.1, 0.1);
      
      // Force initial position (far left, off-screen) with position offset applied
      const baseX = camera.position.x - 10;
      object.position.set(
        baseX + POSITION_OFFSET.x,
        camera.position.y + POSITION_OFFSET.y,
        camera.position.z + POSITION_OFFSET.z
      );
      
      // Apply laying down rotation (progress = 1.0 means fully laid down)
      slerpToLayDown(object, introInitialRotations[key], 1.0);
      
      // Apply additional 90-degree rotation on X axis
      const xRotation90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      object.quaternion.multiply(xRotation90);
      
      object.updateMatrixWorld(true);
      
      // Set ghost colors for visibility
      const ghostColors: Record<string, number> = {
        ghost1: 0xff0000, // Red
        ghost2: 0x00ff00, // Green
        ghost3: 0x0000ff, // Blue
        ghost4: 0xffff00, // Yellow
        ghost5: 0xff00ff, // Magenta
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
          
          // Make visible
          mesh.visible = true;
          
          // Change ghost colors to bright colors for visibility
          if (ghostColors[key] && childName.startsWith("Ghost_Mesh")) {
            const newColor = ghostColors[key];
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat: any) => {
                mat.color.setHex(newColor);
              });
            } else {
              (mesh.material as any).color.setHex(newColor);
            }
          }
        }
      });
    }
  });
}

// Hide everything except pacman and ghosts for testing
function hideEverythingExceptObjects() {
  // Commented out - might be causing rendering issues
  // scene.traverse((child) => {
  //   if (
  //     child.name &&
  //     !child.name.includes("pacman") &&
  //     !child.name.includes("Ghost")
  //   ) {
  //     child.visible = false;
  //   }
  // });
}

function updateObjectsWalkBy(progress: number) {
  // Ensure floor plane stays semi-transparent red during animation
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xff0000); // Red
        material.opacity = 0.1;
        material.transparent = true;
      }
    }
  });
  
  // Calculate base center point for walk path
  const baseCenter = new THREE.Vector3(
    camera.position.x,
    camera.position.y,
    camera.position.z
  );
  
  // Walk from left edge to center of viewfield
  const walkStart = baseCenter.x - 5.0;
  const walkEnd = baseCenter.x;
  
  // Objects to animate with staggered Z positions (behind each other)
  const objectsToAnimate = [
    { key: "pacman", offset: 0, zOffset: 0 },
    { key: "ghost1", offset: 0.2, zOffset: -2 },
    { key: "ghost2", offset: 0.4, zOffset: -4 },
    { key: "ghost3", offset: 0.6, zOffset: -6 },
    { key: "ghost4", offset: 0.8, zOffset: -8 },
    { key: "ghost5", offset: 1.0, zOffset: -10 },
  ];

  objectsToAnimate.forEach(({ key, offset, zOffset }) => {
    const object = ghosts[key];
    if (!object) {
      return;
    }

    // Calculate object progress - don't use modulo, let it extend beyond 1.0 for looping
    const objectProgress = progress + offset;
    
    // Only show object if it's in the visible range (0 to 1.2 for spacing)
    if (objectProgress > 1.2) {
      object.visible = false;
      return;
    }
    
    // Normalize progress for positioning (0 to 1)
    const normalizedProgress = Math.max(0, Math.min(1, objectProgress));
    
    // Calculate base position from walk path
    const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
    
    // Calculate final positions with position offset and staggered Z positions
    const finalX = baseX + POSITION_OFFSET.x;
    const finalY = baseCenter.y + POSITION_OFFSET.y;
    const finalZ = baseCenter.z + POSITION_OFFSET.z + zOffset;
    
    // Set positions directly
    object.position.x = finalX;
    object.position.y = finalY;
    object.position.z = finalZ;
    
    // Apply laying down rotation (progress = 1.0 means fully laid down)
    // Ensure we have initial rotation stored
    if (!introInitialRotations[key]) {
      introInitialRotations[key] = object.quaternion.clone();
    }
    slerpToLayDown(object, introInitialRotations[key], 1.0);
    
    // Apply additional 90-degree rotation on X axis
    const xRotation90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    object.quaternion.multiply(xRotation90);
    
    // Force update matrix to ensure position is applied
    object.updateMatrixWorld(true);
    
    // Force visibility EVERY frame (in case something else is hiding it)
    object.visible = true;
    
    // Ensure child meshes are visible and maintain ghost colors
    const ghostColors: Record<string, number> = {
      ghost1: 0xff0000, // Red
      ghost2: 0x00ff00, // Green
      ghost3: 0x0000ff, // Blue
      ghost4: 0xffff00, // Yellow
      ghost5: 0xff00ff, // Magenta
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
        
        // Make visible
        mesh.visible = true;
        
        // Change ghost colors to bright colors for visibility
        if (ghostColors[key] && childName.startsWith("Ghost_Mesh")) {
          const newColor = ghostColors[key];
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.color.setHex(newColor);
            });
          } else {
            (mesh.material as any).color.setHex(newColor);
          }
        }
      }
    });
  });
}
