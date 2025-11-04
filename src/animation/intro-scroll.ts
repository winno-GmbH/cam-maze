import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";

let introScrollTimeline: gsap.core.Timeline | null = null;

// Position adjuster for debugging
let positionAdjuster = {
  distanceBelow: 100,
  distanceInFront: 50,
  walkStartOffset: -5.0,
  walkEndOffset: 0.0,
  xOffset: 0,
  yOffset: 0,
  zOffset: 0,
};

// Create position adjuster UI
function createPositionAdjusterUI() {
  const panel = document.createElement("div");
  panel.id = "intro-position-adjuster";
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    min-width: 300px;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #00ff00;">🎛️ Intro Position Adjuster</h3>
    <div style="margin-bottom: 10px;">
      <label>Distance Below: <span id="db-value">${positionAdjuster.distanceBelow}</span></label><br>
      <input type="range" id="db-slider" min="0" max="200" value="${positionAdjuster.distanceBelow}" step="1" style="width: 100%;">
    </div>
    <div style="margin-bottom: 10px;">
      <label>Distance In Front: <span id="df-value">${positionAdjuster.distanceInFront}</span></label><br>
      <input type="range" id="df-slider" min="0" max="100" value="${positionAdjuster.distanceInFront}" step="1" style="width: 100%;">
    </div>
    <div style="margin-bottom: 10px;">
      <label>Walk Start Offset: <span id="ws-value">${positionAdjuster.walkStartOffset}</span></label><br>
      <input type="range" id="ws-slider" min="-20" max="20" value="${positionAdjuster.walkStartOffset}" step="0.5" style="width: 100%;">
    </div>
    <div style="margin-bottom: 10px;">
      <label>Walk End Offset: <span id="we-value">${positionAdjuster.walkEndOffset}</span></label><br>
      <input type="range" id="we-slider" min="-20" max="20" value="${positionAdjuster.walkEndOffset}" step="0.5" style="width: 100%;">
    </div>
    <div style="margin-bottom: 10px;">
      <label>X Offset: <span id="x-value">${positionAdjuster.xOffset}</span></label><br>
      <input type="range" id="x-slider" min="-20" max="20" value="${positionAdjuster.xOffset}" step="0.5" style="width: 100%;">
    </div>
    <div style="margin-bottom: 10px;">
      <label>Y Offset: <span id="y-value">${positionAdjuster.yOffset}</span></label><br>
      <input type="range" id="y-slider" min="-50" max="50" value="${positionAdjuster.yOffset}" step="1" style="width: 100%;">
    </div>
    <div style="margin-bottom: 10px;">
      <label>Z Offset: <span id="z-value">${positionAdjuster.zOffset}</span></label><br>
      <input type="range" id="z-slider" min="-50" max="50" value="${positionAdjuster.zOffset}" step="1" style="width: 100%;">
    </div>
    <button id="reset-positions" style="width: 100%; padding: 8px; margin-top: 10px; background: #333; color: white; border: 1px solid #555; cursor: pointer;">Reset to Default</button>
    <div style="margin-top: 10px; padding: 10px; background: #222; border-radius: 4px;">
      <strong>Current Camera:</strong><br>
      <span id="camera-pos">Calculating...</span>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Set up event listeners
  document.getElementById("db-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.distanceBelow = parseFloat(e.target.value);
    (document.getElementById("db-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("df-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.distanceInFront = parseFloat(e.target.value);
    (document.getElementById("df-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("ws-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.walkStartOffset = parseFloat(e.target.value);
    (document.getElementById("ws-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("we-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.walkEndOffset = parseFloat(e.target.value);
    (document.getElementById("we-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("x-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.xOffset = parseFloat(e.target.value);
    (document.getElementById("x-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("y-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.yOffset = parseFloat(e.target.value);
    (document.getElementById("y-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("z-slider")?.addEventListener("input", (e: any) => {
    positionAdjuster.zOffset = parseFloat(e.target.value);
    (document.getElementById("z-value") as HTMLElement).textContent = e.target.value;
  });
  
  document.getElementById("reset-positions")?.addEventListener("click", () => {
    positionAdjuster = {
      distanceBelow: 100,
      distanceInFront: 50,
      walkStartOffset: -5.0,
      walkEndOffset: 0.0,
      xOffset: 0,
      yOffset: 0,
      zOffset: 0,
    };
    // Update all sliders
    (document.getElementById("db-slider") as HTMLInputElement).value = positionAdjuster.distanceBelow.toString();
    (document.getElementById("df-slider") as HTMLInputElement).value = positionAdjuster.distanceInFront.toString();
    (document.getElementById("ws-slider") as HTMLInputElement).value = positionAdjuster.walkStartOffset.toString();
    (document.getElementById("we-slider") as HTMLInputElement).value = positionAdjuster.walkEndOffset.toString();
    (document.getElementById("x-slider") as HTMLInputElement).value = positionAdjuster.xOffset.toString();
    (document.getElementById("y-slider") as HTMLInputElement).value = positionAdjuster.yOffset.toString();
    (document.getElementById("z-slider") as HTMLInputElement).value = positionAdjuster.zOffset.toString();
    // Update all labels
    (document.getElementById("db-value") as HTMLElement).textContent = positionAdjuster.distanceBelow.toString();
    (document.getElementById("df-value") as HTMLElement).textContent = positionAdjuster.distanceInFront.toString();
    (document.getElementById("ws-value") as HTMLElement).textContent = positionAdjuster.walkStartOffset.toString();
    (document.getElementById("we-value") as HTMLElement).textContent = positionAdjuster.walkEndOffset.toString();
    (document.getElementById("x-value") as HTMLElement).textContent = positionAdjuster.xOffset.toString();
    (document.getElementById("y-value") as HTMLElement).textContent = positionAdjuster.yOffset.toString();
    (document.getElementById("z-value") as HTMLElement).textContent = positionAdjuster.zOffset.toString();
  });
  
  // Update camera position display
  setInterval(() => {
    const camPos = camera.position;
    (document.getElementById("camera-pos") as HTMLElement).textContent = 
      `X: ${camPos.x.toFixed(2)}, Y: ${camPos.y.toFixed(2)}, Z: ${camPos.z.toFixed(2)}`;
  }, 100);
}

export function initIntroScrollAnimation() {
  // Create position adjuster UI
  if (!document.getElementById("intro-position-adjuster")) {
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
  
  // Position objects using adjustable values
  const centerPoint = new THREE.Vector3(
    camera.position.x + positionAdjuster.xOffset,
    camera.position.y - positionAdjuster.distanceBelow + positionAdjuster.yOffset,
    camera.position.z - positionAdjuster.distanceInFront + positionAdjuster.zOffset
  );
  
  // Walk from left edge to center of viewfield using adjustable offsets
  const walkStart = centerPoint.x + positionAdjuster.walkStartOffset;
  const walkEnd = centerPoint.x + positionAdjuster.walkEndOffset;
  
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
