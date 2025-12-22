import * as THREE from "three";
import { ASSETS } from "../config/config";
import { GhostContainer } from "../types/types";
import { clock } from "./scene";
import {
  mazeMaterial,
  topMaterial,
  ghostMaterial,
  floorMaterial,
  materialMap,
} from "./materials";

export { clock };

const loader = new THREE.GLTFLoader();

export let pacmanMixer: THREE.AnimationMixer;

export const pacman = new THREE.Group();

export const ghosts: GhostContainer = {
  pacman: pacman,
  ghost1: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost2: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost3: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost4: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost5: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
};

export const pill = new THREE.Group();

const ghostContainers = {
  Ghost_EUR: ghosts.ghost1,
  Ghost_CHF: ghosts.ghost2,
  Ghost_YEN: ghosts.ghost3,
  Ghost_USD: ghosts.ghost4,
  Ghost_GBP: ghosts.ghost5,
};

export async function loadModel(scene: THREE.Scene): Promise<void> {
  Object.values(ghosts).forEach((ghost) => scene.add(ghost));
  scene.add(pacman);
  scene.add(pill);
  return new Promise((resolve, reject) => {
    loader.load(
      ASSETS.mazeModel,
      function (gltf) {
        const model = gltf.scene;

        const allObjectNames: string[] = [];
        model.traverse((node: THREE.Object3D) => {
          if (node.name) {
            allObjectNames.push(node.name);
          }
        });
        console.log("All objects in 3D file:", allObjectNames);

        model.traverse((child: THREE.Object3D) => {
          if (child.name === "CAM-Pacman") {
            const children: THREE.Object3D[] = [];
            child.traverse((subChild: THREE.Object3D) => {
              if (
                (subChild as any).isMesh &&
                subChild.name !== "CAM-Pacman_Shell" &&
                subChild.name !== "CAM-Pacman_Shell_Boolean" &&
                subChild.name !== "CAM-Pacman_Bitcoin_1" &&
                subChild.name !== "CAM-Pacman_Bitcoin_2"
              ) {
                const material =
                  materialMap[subChild.name as keyof typeof materialMap] ||
                  materialMap.default;
                (subChild as THREE.Mesh).material = material;
                children.push(subChild);
              } else if (
                subChild.name === "CAM-Pacman_Shell" ||
                subChild.name === "CAM-Pacman_Shell_Boolean" ||
                subChild.name === "CAM-Pacman_Bitcoin_1" ||
                subChild.name === "CAM-Pacman_Bitcoin_2"
              ) {
                subChild.visible = false;
              }
            });

            children.forEach((item) => ghosts.pacman.add(item));
            ghosts.pacman.scale.set(0.05, 0.05, 0.05);
            ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);

            pacmanMixer = new THREE.AnimationMixer(ghosts.pacman);
            const pacmanActions: { [key: string]: THREE.AnimationAction } = {};

            gltf.animations.forEach((clip: THREE.AnimationClip) => {
              const action = pacmanMixer.clipAction(clip);

              action.getMixer().addEventListener("loop", function (e) {
                e.action.getRoot().traverse(function (obj) {
                  if (obj.userData && obj.userData.skipAnimation) {
                    (obj as any).updateMorphTargets = function () {};
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
          } else if (
            child.name &&
            ghostContainers[child.name as keyof typeof ghostContainers]
          ) {
            const ghostContainer =
              ghostContainers[child.name as keyof typeof ghostContainers];
            const ghostGroup = new THREE.Group();

            child.rotation.z = Math.PI;
            child.rotation.x = Math.PI / 2;
            child.scale.set(0.75, 0.75, 0.75);

            const children: THREE.Object3D[] = [];
            child.traverse((subChild: THREE.Object3D) => {
              if ((subChild as any).isMesh) {
                if (subChild.name && subChild.name.startsWith("Ghost_Mesh")) {
                  (subChild as THREE.Mesh).material = ghostMaterial;
                } else if (
                  subChild.name &&
                  ["EUR", "CHF", "YEN", "USD", "GBP"].includes(subChild.name)
                ) {
                  subChild.visible = false;
                }
                children.push(subChild);
              }
            });

            children.forEach((item) => {
              if (
                item.name &&
                (item.name.includes("EUR") ||
                  item.name.startsWith("Ghost_Mesh"))
              ) {
                item.rotation.z = Math.PI;
                item.rotation.x = Math.PI / 2;
              } else {
                item.rotation.set(0, 0, 0);
              }
              ghostGroup.add(item);
            });

            if (ghostContainer) {
              ghostContainer.add(ghostGroup);
            }
          } else if (
            child.name &&
            (child.name.toLowerCase().includes("pill") ||
              child.name.toLowerCase().includes("pille") ||
              child.name.toLowerCase().includes("pellet") ||
              child.name.toLowerCase().includes("coin") ||
              child.name.toLowerCase().includes("dot"))
          ) {
            console.log("Found pill object:", child.name);
            const pillGroup = new THREE.Group();
            child.traverse((subChild: THREE.Object3D) => {
              if ((subChild as any).isMesh) {
                const mesh = subChild as THREE.Mesh;
                const isShell =
                  subChild.name &&
                  subChild.name.toLowerCase().includes("shell");

                if (isShell) {
                  console.log("Found pill shell component:", subChild.name);
                }

                const clonedMesh = mesh.clone();
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    clonedMesh.material = mesh.material.map((mat) =>
                      mat.clone()
                    );
                  } else {
                    clonedMesh.material = (
                      mesh.material as THREE.Material
                    ).clone();
                  }
                }
                clonedMesh.castShadow = true;
                clonedMesh.receiveShadow = true;
                // Make shell components visible (unlike pacman where they're hidden)
                clonedMesh.visible = true;
                pillGroup.add(clonedMesh);
              }
            });
            if (pillGroup.children.length > 0) {
              pill.add(pillGroup);
            }
          }

          if ((child as any).isMesh) {
            if (child.name === "CAM-Arena_LowRes_Top") {
              (child as THREE.Mesh).material = topMaterial;
              child.castShadow = true;
            } else if (child.name === "CAM-Arena_LowRes_Bottom") {
              (child as THREE.Mesh).material = mazeMaterial;
              child.castShadow = true;
            } else if (child.name === "CAM-Floor") {
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
            } else {
              (child as THREE.Mesh).visible = false;
            }
          }
        });

        model.traverse(function (node: THREE.Object3D) {
          if ((node as any).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        scene.add(model);
        model.position.set(0.5, 0.5, 0.5);

        if (pill.children.length > 0) {
          pill.scale.set(0.05, 0.05, 0.05);
          pill.visible = false;
        }

        resolve();
      },
      undefined,
      function (error: any) {
        reject(error);
      }
    );
  });
}
