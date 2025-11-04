import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";

let introScrollTimeline: gsap.core.Timeline | null = null;

// Ghost position adjuster - simple X, Y, Z sliders
let ghostPositionAdjuster = {
  x: 0,
  y: -100,
  z: -50,
};

// Log current ghost positions for debugging
function logCurrentGhostPositions() {
  const objectsToCheck = ["pacman", "ghost1", "ghost2", "ghost3"];
  console.log("🎛️ Current Ghost Positions:");
  objectsToCheck.forEach((key) => {
    const obj = ghosts[key];
    if (obj) {
      console.log(`  ${key}:`, {
        x: obj.position.x.toFixed(2),
        y: obj.position.y.toFixed(2),
        z: obj.position.z.toFixed(2),
        visible: obj.visible,
        scale: `${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)}`
      });
    } else {
      console.log(`  ${key}: NOT FOUND`);
    }
  });
  console.log("🎛️ Adjuster values:", ghostPositionAdjuster);
  console.log("🎛️ Camera position:", {
    x: camera.position.x.toFixed(2),
    y: camera.position.y.toFixed(2),
    z: camera.position.z.toFixed(2)
  });
}

// Create simple position adjuster overlay
function createPositionAdjusterUI() {
  // Remove existing overlay if any
  const existing = document.getElementById("ghost-position-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "ghost-position-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(20, 20, 20, 0.95);
    color: white;
    padding: 20px;
    border-radius: 10px;
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    z-index: 10000;
    min-width: 280px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    border: 2px solid #444;
  `;

  overlay.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #00ff00; font-size: 18px; text-align: center;">🎛️ Ghost Position Adjuster</h3>
    
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <label style="font-weight: bold; color: #ff6b6b;">X Axis:</label>
        <span id="x-value-display" style="color: #ff6b6b; font-weight: bold;">${ghostPositionAdjuster.x.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        id="ghost-x-slider" 
        min="-20" 
        max="20" 
        value="${ghostPositionAdjuster.x}" 
        step="0.1" 
        style="width: 100%; height: 8px; cursor: pointer;">
    </div>

    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <label style="font-weight: bold; color: #4ecdc4;">Y Axis:</label>
        <span id="y-value-display" style="color: #4ecdc4; font-weight: bold;">${ghostPositionAdjuster.y.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        id="ghost-y-slider" 
        min="-200" 
        max="0" 
        value="${ghostPositionAdjuster.y}" 
        step="1" 
        style="width: 100%; height: 8px; cursor: pointer;">
    </div>

    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <label style="font-weight: bold; color: #95e1d3;">Z Axis:</label>
        <span id="z-value-display" style="color: #95e1d3; font-weight: bold;">${ghostPositionAdjuster.z.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        id="ghost-z-slider" 
        min="-100" 
        max="0" 
        value="${ghostPositionAdjuster.z}" 
        step="1" 
        style="width: 100%; height: 8px; cursor: pointer;">
    </div>

    <button 
      id="reset-ghost-positions" 
      style="width: 100%; padding: 10px; margin-top: 10px; background: #333; color: white; border: 2px solid #555; cursor: pointer; border-radius: 5px; font-weight: bold;">
      Reset to Default
    </button>

    <div style="margin-top: 15px; padding: 10px; background: #111; border-radius: 5px; font-size: 12px;">
      <div style="margin-bottom: 5px;"><strong>Camera Position:</strong></div>
      <div id="camera-pos-display" style="color: #aaa;">Loading...</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Log initial positions
  console.log("🎛️ Position Adjuster Overlay Created");
  logCurrentGhostPositions();

  // Event listeners for sliders
  const xSlider = document.getElementById("ghost-x-slider") as HTMLInputElement;
  const ySlider = document.getElementById("ghost-y-slider") as HTMLInputElement;
  const zSlider = document.getElementById("ghost-z-slider") as HTMLInputElement;

  xSlider?.addEventListener("input", (e: any) => {
    ghostPositionAdjuster.x = parseFloat(e.target.value);
    (document.getElementById("x-value-display") as HTMLElement).textContent = ghostPositionAdjuster.x.toFixed(2);
    console.log(`🎛️ X Position changed to: ${ghostPositionAdjuster.x.toFixed(2)}`);
    logCurrentGhostPositions();
  });

  ySlider?.addEventListener("input", (e: any) => {
    ghostPositionAdjuster.y = parseFloat(e.target.value);
    (document.getElementById("y-value-display") as HTMLElement).textContent = ghostPositionAdjuster.y.toFixed(2);
    console.log(`🎛️ Y Position changed to: ${ghostPositionAdjuster.y.toFixed(2)}`);
    logCurrentGhostPositions();
  });

  zSlider?.addEventListener("input", (e: any) => {
    ghostPositionAdjuster.z = parseFloat(e.target.value);
    (document.getElementById("z-value-display") as HTMLElement).textContent = ghostPositionAdjuster.z.toFixed(2);
    console.log(`🎛️ Z Position changed to: ${ghostPositionAdjuster.z.toFixed(2)}`);
    logCurrentGhostPositions();
  });

  // Reset button
  document.getElementById("reset-ghost-positions")?.addEventListener("click", () => {
    console.log("🎛️ Reset button clicked - Resetting to defaults");
    ghostPositionAdjuster = { x: 0, y: -100, z: -50 };
    xSlider.value = ghostPositionAdjuster.x.toString();
    ySlider.value = ghostPositionAdjuster.y.toString();
    zSlider.value = ghostPositionAdjuster.z.toString();
    (document.getElementById("x-value-display") as HTMLElement).textContent = ghostPositionAdjuster.x.toFixed(2);
    (document.getElementById("y-value-display") as HTMLElement).textContent = ghostPositionAdjuster.y.toFixed(2);
    (document.getElementById("z-value-display") as HTMLElement).textContent = ghostPositionAdjuster.z.toFixed(2);
    logCurrentGhostPositions();
  });

  // Update camera position display
  setInterval(() => {
    const camPos = camera.position;
    const display = document.getElementById("camera-pos-display");
    if (display) {
      display.innerHTML = `
        X: <span style="color: #ff6b6b;">${camPos.x.toFixed(2)}</span><br>
        Y: <span style="color: #4ecdc4;">${camPos.y.toFixed(2)}</span><br>
        Z: <span style="color: #95e1d3;">${camPos.z.toFixed(2)}</span>
      `;
    }
  }, 100);
}

export function initIntroScrollAnimation() {
  // Create position adjuster UI
  if (!document.getElementById("ghost-position-overlay")) {
    createPositionAdjusterUI();
  }
  
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
  // Debug: Log first few animation updates
  if (progress < 0.1) {
    console.log("🎬 Animation update - Progress:", progress.toFixed(3), "Camera:", camera.position);
  }
  
  // Position objects using adjustable X, Y, Z values
  const centerPoint = new THREE.Vector3(
    camera.position.x + ghostPositionAdjuster.x,
    camera.position.y + ghostPositionAdjuster.y,
    camera.position.z + ghostPositionAdjuster.z
  );
  
  // Walk from left edge to center of viewfield
  const walkStart = centerPoint.x - 5.0;
  const walkEnd = centerPoint.x;
  
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

  // Debug: Check if all objects exist
  if (progress < 0.05) {
    objectsToAnimate.forEach(({ key }) => {
      const obj = ghosts[key];
      console.log(`🎬 ${key} exists:`, !!obj, "position:", obj?.position);
    });
  }

  objectsToAnimate.forEach(({ key, offset }) => {
    const object = ghosts[key];
    if (!object) {
      if (progress < 0.05) console.warn(`⚠️ ${key} not found!`);
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
    
    // Calculate position from left to center
    const x = walkStart + (walkEnd - walkStart) * normalizedProgress;
    // Position objects relative to camera's view direction
    object.position.set(x, centerPoint.y, centerPoint.z);
    
    // Ensure object is visible
    object.visible = true;
    
    // Debug: Log positions for all objects
    if (progress < 0.1) {
      console.log(`🎬 ${key} - Progress: ${objectProgress.toFixed(3)}, Normalized: ${normalizedProgress.toFixed(3)}, Position:`, object.position);
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
