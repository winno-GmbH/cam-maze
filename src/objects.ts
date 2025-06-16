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

export { clock };

const loader = new THREE.GLTFLoader();

export let pacmanMixer: THREE.AnimationMixer;

export const pacman = new THREE.Group();
scene.add(pacman);

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

Object.values(ghosts).forEach((ghost) => scene.add(ghost));

export async function loadModel(): Promise<void> {
  return new Promise((resolve, reject) => {
    loader.load(
      ASSETS.mazeModel,
      function (gltf) {
        const model = gltf.scene;

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
            ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);

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

            ghostContainer.add(ghostGroup);
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
      function (progress: any) {},
      function (error: any) {
        reject(error);
      }
    );
  });
}
