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

const allObjectsMap = [
  { name: "Scene", display: true },
  { name: "Ghost_EUR", display: true },
  { name: "EUR", display: true },
  { name: "Ghost_Mesh", display: true },
  { name: "Ghost_CHF", display: true },
  { name: "CHF", display: true },
  { name: "Ghost_Mesh001", display: true },
  { name: "Ghost_YEN", display: true },
  { name: "YEN", display: true },
  { name: "Ghost_Mesh002", display: true },
  { name: "Ghost_USD", display: true },
  { name: "USD", display: true },
  { name: "Ghost_Mesh003", display: true },
  { name: "Ghost_GBP", display: true },
  { name: "GBP", display: true },
  { name: "Ghost_Mesh004", display: true },
  { name: "CAM-Pill-Blue", display: true },
  { name: "CAM-Pill_Inlay_Blue", display: true },
  { name: "CAM-Shell_Bottom_Blue", display: true },
  { name: "CAM-Shell_Top_Blue", display: true },
  { name: "CAM_Logo", display: true },
  { name: "CAM-Pill-Orange", display: true },
  { name: "BTC_Logo", display: true },
  { name: "CAM-Pill_Inlay_Orange", display: true },
  { name: "CAM-Shell_Bottom_Orange", display: true },
  { name: "CAM-Shell_Top_Orange", display: true },
  { name: "CAM-Sign", display: true },
  { name: "Exit", display: true },
  { name: "Sign", display: true },
  { name: "CAM-Pacman", display: true },
  { name: "CAM-Pacman_Shell", display: true },
  { name: "CAM-Pacman_Shell_Boolean", display: true },
  { name: "CAM-Pacman_Bottom_Text", display: true },
  { name: "CAM-Pacman_Top_Text", display: true },
  { name: "CAM_Pacman_Logo_1", display: true },
  { name: "CAM_Pacman_Logo_2", display: true },
  { name: "CAM-Pacman_Eye", display: true },
  { name: "CAM-Pacman_Bottom", display: true },
  { name: "CAM-Pacman_Backframe", display: true },
  { name: "CAM-Pacman_Bitcoin_1", display: true },
  { name: "CAM-Pacman_Bitcoin_2", display: true },
  { name: "CAM-Pacman_Bottom_electronic", display: true },
  { name: "CAM-Pacman_Top_electronic", display: true },
  { name: "CAM-Pacman_Top", display: true },
  { name: "CAM-Panel", display: true },
  { name: "CAM-Cube", display: true },
  { name: "CAM-Floor", display: true },
  { name: "CAM-Arena_LowRes_Top", display: true },
  { name: "CAM-Arena_LowRes_Bottom", display: true },
]

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
  return new Promise((resolve, reject) => {
    loader.load(
      ASSETS.mazeModel,
      function (gltf) {
        const model = gltf.scene;

        // Print all elements in the 3D model
        console.log("=== 3D Model Hierarchy ===");
        model.traverse((obj: THREE.Object3D) => {
          console.log(`[${obj.type}] ${obj.name}`);
        });
        console.log("=========================");

        model.traverse((child: THREE.Object3D) => {
          if (child.name === "CAM-Pacman") {
            const children: THREE.Object3D[] = [];
            child.traverse((subChild: THREE.Object3D) => {
              if (
                (subChild as any).isMesh &&
                subChild.name !== "CAM-Pacman_Shell" &&
                subChild.name !== "CAM-Pacman_Shell_Boolean"
              ) {
                const material =
                  materialMap[subChild.name as keyof typeof materialMap] ||
                  materialMap.default;
                (subChild as THREE.Mesh).material = material;
                children.push(subChild);
              } else if (
                subChild.name === "CAM-Pacman_Shell" ||
                subChild.name === "CAM-Pacman_Shell_Boolean"
              ) {
                subChild.visible = false;
              }
            });

            children.forEach((item) => ghosts.pacman.add(item));
            ghosts.pacman.scale.set(0.05, 0.05, 0.05);
            // TODO: remove comment
            // ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);
            ghosts.pacman.rotation.set(0, Math.PI, 0);

            pacmanMixer = new THREE.AnimationMixer(ghosts.pacman);
            const pacmanActions: { [key: string]: THREE.AnimationAction } = {};

            gltf.animations.forEach((clip: THREE.AnimationClip) => {
              const action = pacmanMixer.clipAction(clip);
              pacmanActions[clip.name] = action;
              action.setEffectiveWeight(1);
              action.play();
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
            } else {
              console.warn(`ghostContainer for ${child.name} is undefined!`);
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

        resolve();
      },
      function (progress: any) { },
      function (error: any) {
        reject(error);
      }
    );
  });
}
