import * as THREE from "three";
import { ASSETS } from "./config";
import { GhostContainer } from "./types";
import { scene, clock } from "./scene";
import {
  mazeMaterial,
  topMaterial,
  ghostMaterial,
  floorMaterial,
  materialMap,
} from "./materials";

// Export clock for animation system
export { clock };

// GLB Loader - check if available in global THREE
console.log("Checking for GLTFLoader...");
console.log("THREE object:", typeof THREE);
console.log("GLTFLoader available:", !!(THREE as any).GLTFLoader);

const loader = (THREE as any).GLTFLoader
  ? new (THREE as any).GLTFLoader()
  : null;

if (loader) {
  console.log("GLTFLoader created successfully");
} else {
  console.warn("GLTFLoader not available - model will not load");
}

// Animation Mixer
export let pacmanMixer: THREE.AnimationMixer;

// Pacman Group
export const pacman = new THREE.Group();
scene.add(pacman);

// Ghost Objects
export const ghosts: GhostContainer = {
  pacman: pacman,
  ghost1: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost2: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost3: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost4: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost5: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
};

// Add ghosts to scene
Object.values(ghosts).forEach((ghost) => scene.add(ghost));

// Add a test cube to verify rendering
const testGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const testCube = new THREE.Mesh(testGeometry, testMaterial);
testCube.position.set(0.5, 1, 0.5); // Position above maze center
scene.add(testCube);
console.log("Test cube added to scene at position:", testCube.position);

// Add another test cube at origin
const testCube2 = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.2),
  new THREE.MeshBasicMaterial({ color: 0x0000ff })
);
testCube2.position.set(0, 0, 0);
scene.add(testCube2);
console.log("Blue test cube added at origin");

// Ghost Container Mapping
const ghostContainers: GhostContainer = {
  Ghost_EUR: ghosts.ghost1,
  Ghost_CHF: ghosts.ghost2,
  Ghost_YEN: ghosts.ghost3,
  Ghost_USD: ghosts.ghost4,
  Ghost_GBP: ghosts.ghost5,
};

// Load 3D Model - FIXED to match backup.js exactly
export function loadModel(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!loader) {
      console.warn(
        "GLTFLoader not available. Please include GLTFLoader script."
      );
      resolve();
      return;
    }

    loader.load(
      ASSETS.mazeModel,
      function (gltf: any) {
        const model = gltf.scene;
        const pacmanNames: string[] = [];

        model.traverse((child: THREE.Object3D) => {
          // Null check for child.name
          const childName = child.name || "";

          // PACMAN PROCESSING - inline like backup.js
          if (childName === "CAM-Pacman") {
            const children: THREE.Mesh[] = [];

            child.traverse((subChild) => {
              const subChildName = subChild.name || "";

              if (
                (subChild as any).isMesh &&
                subChildName !== "CAM-Pacman_Shell" &&
                subChildName !== "CAM-Pacman_Shell_Boolean"
              ) {
                (subChild as THREE.Mesh).material =
                  materialMap[subChildName] || materialMap.default;
                children.push(subChild as THREE.Mesh);
              } else if (
                subChildName === "CAM-Pacman_Shell" ||
                subChildName === "CAM-Pacman_Shell_Boolean"
              ) {
                subChild.visible = false;
                (subChild as any).morphTargetInfluences = [];
                subChild.userData.skipAnimation = true;
              }
              pacmanNames.push(subChildName);
            });

            children.forEach((item) => ghosts.pacman.add(item));
            ghosts.pacman.scale.set(0.05, 0.05, 0.05);
            ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);

            // Animation setup
            if (gltf.animations && gltf.animations.length > 0) {
              pacmanMixer = new THREE.AnimationMixer(ghosts.pacman);
              const pacmanActions: { [key: string]: THREE.AnimationAction } =
                {};

              gltf.animations.forEach((clip: THREE.AnimationClip) => {
                const action = pacmanMixer.clipAction(clip);

                action.getMixer().addEventListener("loop", function (e: any) {
                  e.action.getRoot().traverse(function (obj: any) {
                    if (obj.userData && obj.userData.skipAnimation) {
                      obj.updateMorphTargets = function () {};
                    }
                  });
                });

                pacmanActions[clip.name] = action;
                action.setEffectiveWeight(0);
                action.play();
              });

              Object.values(pacmanActions).forEach((action) => {
                action.setEffectiveWeight(1);
              });
            }
          }
          // GHOST PROCESSING
          else if (ghostContainers[childName]) {
            const ghostContainer = ghostContainers[childName];
            const ghostGroup = new THREE.Group();

            child.rotation.z = Math.PI;
            child.rotation.x = Math.PI / 2;
            child.scale.set(0.75, 0.75, 0.75);

            const children: THREE.Object3D[] = [];
            child.traverse((subChild) => {
              const subChildName = subChild.name || "";

              if ((subChild as any).isMesh) {
                if (subChildName.startsWith("Ghost_Mesh")) {
                  if (subChild instanceof THREE.Mesh) {
                    subChild.material = ghostMaterial;
                  }
                } else if (
                  ["EUR", "CHF", "YEN", "USD", "GBP"].includes(subChildName)
                ) {
                  subChild.visible = false;
                }
                children.push(subChild);
              }
            });

            children.forEach((item) => {
              const itemName = item.name || "";
              if (
                itemName.includes("EUR") ||
                itemName.startsWith("Ghost_Mesh")
              ) {
                item.rotation.z = Math.PI;
                item.rotation.x = Math.PI / 2;
              } else {
                item.rotation.set(0, 0, 0);
              }
              ghostGroup.add(item);
            });

            if (
              ghostContainer instanceof THREE.Mesh ||
              ghostContainer instanceof THREE.Group
            ) {
              ghostContainer.add(ghostGroup);
            }
          }

          // MESH PROCESSING
          if ((child as any).isMesh) {
            console.log("Found mesh:", childName, "Type:", child.type);

            if (childName === "CAM-Arena_LowRes_Top") {
              console.log("Found maze top mesh:", childName);
              (child as THREE.Mesh).material = topMaterial;
              child.castShadow = true;
            } else if (childName === "CAM-Arena_LowRes_Bottom") {
              console.log("Found maze bottom mesh:", childName);
              (child as THREE.Mesh).material = mazeMaterial;
              child.castShadow = true;
            } else if (childName === "CAM-Floor") {
              const clonedChild = child.clone();
              child.position.y = -0.1;
              child.position.x = 0;
              child.position.z = 0;
              (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                opacity: 1,
                transparent: false,
                depthWrite: true,
                depthTest: true,
                side: THREE.FrontSide,
              });
              child.receiveShadow = false;
              child.castShadow = true;
              child.scale.set(0.5, 0.5, 0.5);
              (clonedChild as THREE.Mesh).material = floorMaterial;
              clonedChild.position.y = -0.5;
              clonedChild.receiveShadow = true;
              scene.add(clonedChild);
            }
          }
        });

        // Enable shadows AFTER traversing
        model.traverse(function (node: THREE.Object3D) {
          if ((node as any).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        // Add model to scene and position it
        scene.add(model);
        model.position.set(0.5, 0.5, 0.5);
        console.log("3D Model loaded successfully");
        resolve();
      },
      undefined,
      function (error: ErrorEvent) {
        console.error("Fehler beim Laden des 3D-Modells:", error);
        console.warn("Continuing without 3D model...");
        resolve();
      }
    );
  });
}
