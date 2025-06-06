import * as THREE from 'three';
import { ASSETS } from './config';
import { GhostContainer } from './types';
import { scene } from './scene';
import { 
  mazeMaterial, 
  topMaterial, 
  ghostMaterial, 
  floorMaterial, 
  materialMap 
} from './materials';

// GLB Loader - check if available in global THREE
const loader = (THREE as any).GLTFLoader ? 
  new (THREE as any).GLTFLoader() : 
  null;

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
  ghost5: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial)
};

// Add ghosts to scene
Object.values(ghosts).forEach(ghost => scene.add(ghost));

// Ghost Container Mapping
const ghostContainers: GhostContainer = {
  Ghost_EUR: ghosts.ghost1,
  Ghost_CHF: ghosts.ghost2,
  Ghost_YEN: ghosts.ghost3,
  Ghost_USD: ghosts.ghost4,
  Ghost_GBP: ghosts.ghost5
};

// Load 3D Model - FIXED to match backup.js exactly
export function loadModel(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!loader) {
      console.warn('GLTFLoader not available. Please include GLTFLoader script.');
      resolve();
      return;
    }

    loader.load(
      ASSETS.mazeModel,
      function (gltf: any) {
        const model = gltf.scene;
        const pacmanNames: string[] = [];

        model.traverse((child: THREE.Object3D) => {
          // PACMAN PROCESSING - inline like backup.js
          if (child.name === "CAM-Pacman") {
            const children: THREE.Mesh[] = [];
            
            child.traverse((subChild) => {
              if ((subChild as any).isMesh && 
                  subChild.name !== "CAM-Pacman_Shell" && 
                  subChild.name !== "CAM-Pacman_Shell_Boolean") {
                subChild.material = materialMap[subChild.name] || materialMap.default;
                children.push(subChild as THREE.Mesh);
              } else if (subChild.name === "CAM-Pacman_Shell" || 
                         subChild.name === "CAM-Pacman_Shell_Boolean") {
                subChild.visible = false;
                // EXACT MATCH to backup.js - no instanceof check:
                (subChild as any).morphTargetInfluences = [];
                subChild.userData.skipAnimation = true;
              }
              pacmanNames.push(subChild.name);
            });

            children.forEach((item) => ghosts.pacman.add(item));
            ghosts.pacman.scale.set(0.05, 0.05, 0.05);
            ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);

            // Animation setup - NO FILTERING like backup.js
            pacmanMixer = new THREE.AnimationMixer(ghosts.pacman);
            const pacmanActions: { [key: string]: THREE.AnimationAction } = {};

            gltf.animations.forEach((clip: THREE.AnimationClip) => {
              const action = pacmanMixer.clipAction(clip);

              action.getMixer().addEventListener('loop', function (e: any) {
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
          // GHOST PROCESSING - inline like backup.js
          else if (ghostContainers[child.name]) {
            const ghostContainer = ghostContainers[child.name];
            const ghostGroup = new THREE.Group();

            child.rotation.z = Math.PI;
            child.rotation.x = Math.PI / 2;
            child.scale.set(0.75, 0.75, 0.75);

            const children: THREE.Object3D[] = [];
            child.traverse((subChild) => {
              if ((subChild as any).isMesh) {
                if (subChild.name.startsWith("Ghost_Mesh")) {
                  subChild.material = ghostMaterial;
                } else if (["EUR", "CHF", "YEN", "USD", "GBP"].includes(subChild.name)) {
                  subChild.visible = false;
                }
                children.push(subChild);
              }
            });

            children.forEach((item) => {
              if (item.name.includes("EUR") || item.name.startsWith("Ghost_Mesh")) {
                item.rotation.z = Math.PI;
                item.rotation.x = Math.PI / 2;
              } else {
                item.rotation.set(0, 0, 0);
              }
              ghostGroup.add(item);
            });

            if (ghostContainer instanceof THREE.Mesh || ghostContainer instanceof THREE.Group) {
              ghostContainer.add(ghostGroup);
            }
          }

          // MESH PROCESSING - use .isMesh like backup.js
          if ((child as any).isMesh) {
            if (child.name === "CAM-Arena_LowRes_Top") {
              child.material = topMaterial;
              child.castShadow = true;
            } else if (child.name === "CAM-Arena_LowRes_Bottom") {
              child.material = mazeMaterial;
              child.castShadow = true;
            } else if (child.name === "CAM-Floor") {
              const clonedChild = child.clone();
              child.position.y = -0.1;
              child.position.x = 0;
              child.position.z = 0;
              child.material = new THREE.MeshBasicMaterial({
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
              clonedChild.material = floorMaterial;
              clonedChild.position.y = -0.5;
              clonedChild.receiveShadow = true;
              scene.add(clonedChild);
            } else if (!pacmanNames.includes(child.name)) {
              child.visible = false;
            }
          }
        });

        // Enable shadows
        model.traverse(function (node: THREE.Object3D) {
          if ((node as any).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        scene.add(model);
        model.position.set(0.5, 0.5, 0.5);
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