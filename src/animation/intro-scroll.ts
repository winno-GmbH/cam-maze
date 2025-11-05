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
// These are stored ONCE when entering intro-scroll and never changed
let introInitialRotations: Record<string, THREE.Quaternion> = {};
let introInitialPositions: Record<string, THREE.Vector3> = {};

// Store target quaternions for pacman and ghosts (calculated once)
let pacmanTargetQuaternion: THREE.Quaternion | null = null;
let ghostTargetQuaternion: THREE.Quaternion | null = null;

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
          initializeIntroSection();
        },
        onEnterBack: () => {
          console.log("🎬 Intro section ENTERED BACK!");
          initializeIntroSection();
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

// Initialize intro section - called onEnter and onEnterBack
// Uses gsap.set to immediately set all properties for consistent state
function initializeIntroSection() {
  console.log("🎬 initializeIntroSection called");
  
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
  
  const objectsToAnimate = ["pacman", "ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];
  
  // Calculate target quaternions ONCE (they don't change during scroll)
  if (!pacmanTargetQuaternion || !ghostTargetQuaternion) {
    const pacmanObj = ghosts.pacman;
    if (pacmanObj) {
      // Store initial rotation
      if (!introInitialRotations["pacman"]) {
        introInitialRotations["pacman"] = pacmanObj.quaternion.clone();
      }
      
      // Calculate pacman target quaternion (laying down)
      pacmanTargetQuaternion = introInitialRotations["pacman"].clone();
      slerpToLayDown(pacmanObj, introInitialRotations["pacman"], 1.0);
      pacmanTargetQuaternion = pacmanObj.quaternion.clone();
      
      // Reset to initial for now
      pacmanObj.quaternion.copy(introInitialRotations["pacman"]);
    }
    
    const ghostObj = ghosts.ghost1;
    if (ghostObj) {
      // Store initial rotation
      if (!introInitialRotations["ghost1"]) {
        introInitialRotations["ghost1"] = ghostObj.quaternion.clone();
      }
      
      // Calculate ghost target quaternion (laying down + 180 degrees X)
      ghostTargetQuaternion = introInitialRotations["ghost1"].clone();
      slerpToLayDown(ghostObj, introInitialRotations["ghost1"], 1.0);
      const xRotation180 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
      ghostObj.quaternion.multiply(xRotation180);
      ghostTargetQuaternion = ghostObj.quaternion.clone();
      
      // Reset to initial for now
      ghostObj.quaternion.copy(introInitialRotations["ghost1"]);
    }
    
    // Store initial rotations for all ghosts
    objectsToAnimate.forEach(key => {
      const obj = ghosts[key];
      if (obj && !introInitialRotations[key]) {
        introInitialRotations[key] = obj.quaternion.clone();
      }
    });
  }
  
  // Calculate start position (far left)
  const baseX = camera.position.x - 5.0;
  const startPosition = new THREE.Vector3(
    baseX + POSITION_OFFSET.x,
    camera.position.y + POSITION_OFFSET.y,
    camera.position.z + POSITION_OFFSET.z
  );
  
  // Use gsap.set to immediately set all properties
  objectsToAnimate.forEach((key, index) => {
    const object = ghosts[key];
    if (!object) return;
    
    // Calculate position with stagger
    const behindOffset = index === 0 ? 0 : -0.5 * index;
    const pos = new THREE.Vector3(
      startPosition.x + behindOffset,
      startPosition.y,
      startPosition.z
    );
    
    // Store initial position
    introInitialPositions[key] = pos.clone();
    
    // Set position, rotation, scale, visibility using gsap.set
    gsap.set(object.position, {
      x: pos.x,
      y: pos.y,
      z: pos.z,
    });
    
    // Set rotation quaternion directly
    if (key === "pacman" && pacmanTargetQuaternion) {
      object.quaternion.copy(pacmanTargetQuaternion);
    } else if (ghostTargetQuaternion) {
      object.quaternion.copy(ghostTargetQuaternion);
    }
    
    gsap.set(object.scale, {
      x: key === "pacman" ? 0.1 : 1.0,
      y: key === "pacman" ? 0.1 : 1.0,
      z: key === "pacman" ? 0.1 : 1.0,
    });
    
    gsap.set(object, { visible: true });
    
    // Set opacity and visibility for all meshes
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
        
        // For pacman: hide Shell and Bitcoin parts
        if (key === "pacman" && (
          childName.includes("Shell") || 
          childName.includes("Bitcoin_1") || 
          childName.includes("Bitcoin_2")
        )) {
          mesh.visible = false;
          return;
        }
        
        mesh.visible = true;
        
        // Set opacity
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            mat.opacity = 1;
            mat.transparent = true;
          });
        } else {
          (mesh.material as any).opacity = 1;
          (mesh.material as any).transparent = true;
        }
        
        // Set ghost colors
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
    
    object.updateMatrixWorld(true);
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
  
  // Ensure target quaternions are calculated
  if (!pacmanTargetQuaternion || !ghostTargetQuaternion) {
    initializeIntroSection();
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
  
  // Objects to animate - ghosts walk 0.5 units behind pacman
  const objectsToAnimate = [
    { key: "pacman", behindOffset: 0 },
    { key: "ghost1", behindOffset: -0.5 },
    { key: "ghost2", behindOffset: -1.0 },
    { key: "ghost3", behindOffset: -1.5 },
    { key: "ghost4", behindOffset: -2.0 },
    { key: "ghost5", behindOffset: -2.5 },
  ];

  // Calculate pacman's position using smooth interpolation
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const baseX = walkStart + (walkEnd - walkStart) * normalizedProgress;
  const pacmanX = baseX + POSITION_OFFSET.x;
  const pacmanY = baseCenter.y + POSITION_OFFSET.y;
  const pacmanZ = baseCenter.z + POSITION_OFFSET.z;

  // Smooth fade-in for ghosts based on progress
  const fadeInDuration = 0.2; // Fade in over 20% of progress
  const ghostOpacity = normalizedProgress < fadeInDuration 
    ? normalizedProgress / fadeInDuration 
    : 1.0;

  objectsToAnimate.forEach(({ key, behindOffset }) => {
    const object = ghosts[key];
    if (!object) return;

    // Calculate position
    const finalX = pacmanX + behindOffset;
    const finalY = pacmanY;
    const finalZ = pacmanZ;
    
    // Update position (GSAP will handle smooth interpolation via ScrollTrigger scrub)
    object.position.set(finalX, finalY, finalZ);
    
    // Set rotation quaternion directly (no recalculation - use pre-calculated quaternions)
    if (key === "pacman" && pacmanTargetQuaternion) {
      object.quaternion.copy(pacmanTargetQuaternion);
    } else if (ghostTargetQuaternion) {
      object.quaternion.copy(ghostTargetQuaternion);
    }
    
    // Force update matrix to ensure rotation is applied
    object.updateMatrixWorld(true);
    
    // CRITICAL: Force visibility, scale EVERY frame to override home-scroll
    object.visible = true;
    if (key === "pacman") {
      object.scale.set(0.1, 0.1, 0.1);
    } else {
      object.scale.set(1.0, 1.0, 1.0);
    }
    
    // Update opacity for meshes
    const targetOpacity = key === "pacman" ? 1.0 : ghostOpacity;
    
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
        
        // For pacman: hide Shell and Bitcoin parts
        if (key === "pacman" && (
          childName.includes("Shell") || 
          childName.includes("Bitcoin_1") || 
          childName.includes("Bitcoin_2")
        )) {
          mesh.visible = false;
          return;
        }
        
        mesh.visible = true;
        
        // Set opacity
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            mat.opacity = targetOpacity;
            mat.transparent = true;
          });
        } else {
          (mesh.material as any).opacity = targetOpacity;
          (mesh.material as any).transparent = true;
        }
        
        // Set ghost colors
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
  });
}
