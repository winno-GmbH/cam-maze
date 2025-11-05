import gsap from "gsap";
import * as THREE from "three";
import { camera } from "../core/camera";
import { ghosts } from "../core/objects";
import { scene } from "../core/scene";
import { 
  applyIntroScrollPreset, 
  getScrollDirection,
  getPacmanTargetQuaternion,
  getGhostTargetQuaternion,
  INTRO_POSITION_OFFSET
} from "./scene-presets";

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
          const scrollDir = getScrollDirection();
          applyIntroScrollPreset(true, scrollDir);
        },
        onEnterBack: () => {
          console.log("🎬 Intro section ENTERED BACK!");
          const scrollDir = getScrollDirection();
          applyIntroScrollPreset(true, scrollDir);
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
  
  // Ensure preset is applied (target quaternions will be calculated by preset)
  // This check ensures preset is called if scroll starts mid-section
  
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
  const pacmanX = baseX + INTRO_POSITION_OFFSET.x;
  const pacmanY = baseCenter.y + INTRO_POSITION_OFFSET.y;
  const pacmanZ = baseCenter.z + INTRO_POSITION_OFFSET.z;

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
    const pacmanQuat = getPacmanTargetQuaternion();
    const ghostQuat = getGhostTargetQuaternion();
    if (key === "pacman" && pacmanQuat) {
      object.quaternion.copy(pacmanQuat);
    } else if (ghostQuat) {
      object.quaternion.copy(ghostQuat);
    }
    
    // Force update matrix to ensure rotation is applied
    object.updateMatrixWorld(true);
    
    // CRITICAL: Force visibility, scale EVERY frame to override home-scroll
    object.visible = true;
    if (key === "pacman") {
      // CRITICAL: Kill any GSAP animations that might be overriding pacman scale
      gsap.killTweensOf(object.scale);
      object.scale.set(0.1, 0.1, 0.1);
      object.updateMatrixWorld(true);
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
        
        // Keep currency symbols hidden - check both exact match and includes
        if (
          ["EUR", "CHF", "YEN", "USD", "GBP"].includes(childName) ||
          childName.includes("EUR") ||
          childName.includes("CHF") ||
          childName.includes("YEN") ||
          childName.includes("USD") ||
          childName.includes("GBP")
        ) {
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
