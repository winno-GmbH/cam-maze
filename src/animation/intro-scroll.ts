import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";
import { slerpToLayDown } from "./util";

// Debug helper function to check visibility issues
function debugObjectVisibility(key: string, object: THREE.Object3D) {
  const info: any = {
    key,
    exists: !!object,
    visible: object?.visible,
    scale: object?.scale ? `${object.scale.x.toFixed(2)}, ${object.scale.y.toFixed(2)}, ${object.scale.z.toFixed(2)}` : 'N/A',
    position: object?.position ? `${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}` : 'N/A',
    meshCount: 0,
    visibleMeshCount: 0,
    hiddenMeshCount: 0,
    meshes: [] as string[],
  };

  if (object) {
    object.traverse((child) => {
      if ((child as any).isMesh) {
        info.meshCount++;
        const mesh = child as THREE.Mesh;
        const childName = child.name || "unnamed";
        
        if (mesh.visible) {
          info.visibleMeshCount++;
        } else {
          info.hiddenMeshCount++;
        }
        
        const meshInfo = {
          name: childName,
          visible: mesh.visible,
          material: mesh.material ? (Array.isArray(mesh.material) ? `Array[${mesh.material.length}]` : mesh.material.type) : 'No material',
          opacity: (mesh.material as any)?.opacity !== undefined ? (mesh.material as any).opacity : 'N/A',
        };
        info.meshes.push(meshInfo);
      }
    });
  }

  return info;
}

// Check if object is in camera frustum
function isInCameraFrustum(object: THREE.Object3D): boolean {
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(matrix);
  return frustum.containsPoint(object.position);
}

let introScrollTimeline: gsap.core.Timeline | null = null;

// Store initial rotations when entering intro section (like pausedRotations in home-scroll)
let introInitialRotations: Record<string, THREE.Quaternion> = {};

// Position offsets (hardcoded from previous adjuster values)
const POSITION_OFFSET = {
  x: 4.30,
  y: -2.00,
  z: 0.00,
};

export function initIntroScrollAnimation() {
  // EXPLANATION OF FLICKERING ISSUE:
  // The flickering happens because multiple update sources are competing:
  // 1. GSAP ScrollTrigger's onUpdate callback fires on every scroll event
  // 2. A continuous requestAnimationFrame loop was ALSO updating positions
  // 3. Both try to set positions/rotations/visibility simultaneously, causing race conditions
  // 4. Additionally, home-loop animation might still be running and updating positions
  // 
  // SOLUTION: Remove the continuous loop entirely and rely ONLY on ScrollTrigger's onUpdate
  // This ensures single source of truth for position updates during scrolling
  
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
          console.log("🔍 DEBUGGING: Checking all objects before reset...");
          ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(key => {
            const obj = ghosts[key];
            if (obj) {
              const debugInfo = debugObjectVisibility(key, obj);
              console.log(`🔍 ${key}:`, debugInfo);
            } else {
              console.warn(`⚠️ ${key} does not exist in ghosts object!`);
            }
          });
          resetGhostsForIntro();
          hideEverythingExceptObjects();
          
          // Debug after reset
          console.log("🔍 DEBUGGING: Checking all objects AFTER reset...");
          ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"].forEach(key => {
            const obj = ghosts[key];
            if (obj) {
              const debugInfo = debugObjectVisibility(key, obj);
              console.log(`🔍 ${key} AFTER RESET:`, debugInfo);
              const inFrustum = isInCameraFrustum(obj);
              console.log(`  📷 ${key} in camera frustum:`, inFrustum);
            }
          });
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
  
  // Hide floor plane when entering intro section (white with opacity 0)
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff); // White
        material.opacity = 0;
        material.transparent = true;
        console.log("🎬 Made floor plane invisible:", child.name);
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
      
      // Make ALL meshes visible for ghosts (for testing - color everything)
      let meshCount = 0;
      object.traverse((child) => {
        if ((child as any).isMesh && (child as any).material) {
          meshCount++;
          const mesh = child as THREE.Mesh;
          const childName = child.name || "";
          
          // Keep currency symbols hidden
          if (["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName)) {
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
          
          // Make ALL meshes visible (including Groups and nested meshes)
          mesh.visible = true;
          
          // Ensure material opacity is set to 1 and transparent is true
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              mat.opacity = 1;
              mat.transparent = true;
            });
          } else {
            (mesh.material as any).opacity = 1;
            (mesh.material as any).transparent = true;
          }
          
          // Change ALL ghost mesh colors to bright colors for testing visibility
          if (ghostColors[key] && key !== "pacman") {
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
      
      // Debug: Log mesh count for ghosts
      if (key !== "pacman" && meshCount === 0) {
        console.warn(`⚠️ ${key} has NO meshes found!`);
      }
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
  // CRITICAL: Check for interfering animations (like home-loop)
  // If home-loop is running, it might be overriding our positions
  if (progress < 0.1 || progress > 0.9) {
    // Check if any objects are being moved by other animations
    const pacmanObj = ghosts.pacman;
    if (pacmanObj) {
      const ourX = camera.position.x - 5.0 + POSITION_OFFSET.x + (camera.position.x - (camera.position.x - 5.0)) * progress;
      const xDiff = Math.abs(pacmanObj.position.x - ourX);
      if (xDiff > 0.5) {
        console.warn(`⚠️ INTERFERENCE DETECTED! Pacman X position differs by ${xDiff.toFixed(2)}. Our calc: ${ourX.toFixed(2)}, Actual: ${pacmanObj.position.x.toFixed(2)}`);
      }
    }
  }

  // Ensure floor plane stays invisible (white with opacity 0) during animation
  scene.traverse((child) => {
    if (child.name === "CAM-Floor") {
      child.visible = true;
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xffffff); // White
        material.opacity = 0;
        material.transparent = true;
      }
    }
  });
  
  // Check for other potentially blocking objects
  if (progress < 0.05) {
    console.log("🔍 DEBUGGING: Checking for blocking objects...");
    const blockingObjects: string[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible && child.name) {
        // Check if object is between camera and our ghosts
        const objPos = child.position;
        const camPos = camera.position;
        const ghostZ = camera.position.z + POSITION_OFFSET.z;
        
        // If object is in front of ghosts and visible, it might block
        if (objPos.z > ghostZ && objPos.z < camPos.z && child.name !== "CAM-Floor") {
          blockingObjects.push(`${child.name} (Z: ${objPos.z.toFixed(2)})`);
        }
      }
    });
    if (blockingObjects.length > 0) {
      console.warn("⚠️ POTENTIALLY BLOCKING OBJECTS:", blockingObjects);
    }
  }
  
  // Calculate base center point for walk path
  const baseCenter = new THREE.Vector3(
    camera.position.x,
    camera.position.y,
    camera.position.z
  );
  
  // Walk from left edge to center of viewfield
  const walkStart = baseCenter.x - 5.0;
  const walkEnd = baseCenter.x;
  
  // Objects to animate - ghosts walk directly behind pacman (same X, Y, staggered Z)
  const objectsToAnimate = [
    { key: "pacman", offset: 0, zOffset: 0 },
    { key: "ghost1", offset: 0, zOffset: -1 },   // Directly behind pacman
    { key: "ghost2", offset: 0, zOffset: -2 },   // Behind ghost1
    { key: "ghost3", offset: 0, zOffset: -3 },   // Behind ghost2
    { key: "ghost4", offset: 0, zOffset: -4 },   // Behind ghost3
    { key: "ghost5", offset: 0, zOffset: -5 },   // Behind ghost4
  ];

  objectsToAnimate.forEach(({ key, offset, zOffset }) => {
    const object = ghosts[key];
    if (!object) {
      if (progress < 0.1) {
        console.warn(`⚠️ ${key} object not found in ghosts!`);
      }
      return;
    }

    // TEST: Position ghosts at EXACT same spot as pacman to verify visibility
    // If ghosts are visible at same position, then positioning is the issue
    // If still not visible, then it's a different issue (materials, visibility flags, etc.)
    const useTestPosition = false; // Set to true for debugging
    if (useTestPosition && key !== "pacman") {
      const pacmanObj = ghosts.pacman;
      if (pacmanObj) {
        object.position.copy(pacmanObj.position);
        console.log(`🧪 TEST: ${key} positioned at same spot as pacman:`, pacmanObj.position);
      }
    } else {
      // All objects use the same progress (walk together in a line)
      // Since offset is 0 for all objects, they all move together
      const normalizedProgress = Math.max(0, Math.min(1, progress));
      
      // Calculate base position from walk path (same for all objects)
      const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
      
      // Calculate final positions with position offset and staggered Z positions
      const finalX = baseX + POSITION_OFFSET.x;
      const finalY = baseCenter.y + POSITION_OFFSET.y;
      const finalZ = baseCenter.z + POSITION_OFFSET.z + zOffset;
      
      // Set positions directly
      object.position.x = finalX;
      object.position.y = finalY;
      object.position.z = finalZ;
    }
    
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
    
    // Make ALL meshes visible for ghosts (for testing - color everything)
    let meshInfo = { total: 0, visible: 0, hidden: 0 };
    object.traverse((child) => {
      if ((child as any).isMesh && (child as any).material) {
        meshInfo.total++;
        const mesh = child as THREE.Mesh;
        const childName = child.name || "";
        
        // Keep currency symbols hidden
        if (["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName)) {
          mesh.visible = false;
          meshInfo.hidden++;
          return;
        }
        
        // For pacman: hide Shell and Bitcoin parts
        if (key === "pacman" && (
          childName.includes("Shell") || 
          childName.includes("Bitcoin_1") || 
          childName.includes("Bitcoin_2")
        )) {
          mesh.visible = false;
          meshInfo.hidden++;
          return;
        }
        
        // Make ALL meshes visible (including Groups and nested meshes)
        mesh.visible = true;
        meshInfo.visible++;
        
        // Ensure material opacity is set to 1 and transparent is true
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            mat.opacity = 1;
            mat.transparent = true;
          });
        } else {
          (mesh.material as any).opacity = 1;
          (mesh.material as any).transparent = true;
        }
        
        // Change ALL ghost mesh colors to bright colors for testing visibility
        if (ghostColors[key] && key !== "pacman") {
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
    
    // Debug logging for ghosts
    if (key !== "pacman" && (progress < 0.1 || progress > 0.9)) {
      const inFrustum = isInCameraFrustum(object);
      const debugInfo = debugObjectVisibility(key, object);
      console.log(`🔍 ${key} UPDATE [progress: ${progress.toFixed(3)}]:`, {
        position: `${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`,
        visible: object.visible,
        inFrustum,
        meshInfo,
        meshes: debugInfo.meshes.slice(0, 3), // Show first 3 meshes
      });
    }
  });
}
