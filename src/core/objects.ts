import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ASSETS } from "../config/config";
import { GhostContainer } from "../types/types";
import { clock } from "./scene";
import {
  mazeMaterial,
  topMaterial,
  ghostMaterial,
  floorMaterial,
  materialMap,
  pillMaterialMap,
} from "./materials";

export { clock };

const loader = new THREE.GLTFLoader();

export let pacmanMixer: THREE.AnimationMixer;
export let pacmanActions: { [key: string]: THREE.AnimationAction } = {};

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
pill.visible = true;


function splitGeometryByY(
  geometry: THREE.BufferGeometry,
  splitY: number
): { topGeometry: THREE.BufferGeometry; bottomGeometry: THREE.BufferGeometry } {

  const nonIndexedGeometry = geometry.toNonIndexed();
  const positionAttribute = nonIndexedGeometry.attributes.position;
  const positions = positionAttribute.array as Float32Array;

  const topPositions: number[] = [];
  const bottomPositions: number[] = [];


  for (let i = 0; i < positions.length; i += 9) {

    const y0 = positions[i + 1];
    const y1 = positions[i + 4];
    const y2 = positions[i + 7];
    const centroidY = (y0 + y1 + y2) / 3;

    const trianglePositions = [
      positions[i],
      positions[i + 1],
      positions[i + 2],
      positions[i + 3],
      positions[i + 4],
      positions[i + 5],
      positions[i + 6],
      positions[i + 7],
      positions[i + 8],
    ];

    if (centroidY >= splitY) {
      topPositions.push(...trianglePositions);
    } else {
      bottomPositions.push(...trianglePositions);
    }
  }


  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(topPositions), 3)
  );

  const bottomGeometry = new THREE.BufferGeometry();
  bottomGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(bottomPositions), 3)
  );


  topGeometry.computeVertexNormals();
  bottomGeometry.computeVertexNormals();

  return { topGeometry, bottomGeometry };
}

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
        model.traverse((child: THREE.Object3D) => {

          if (process.env.NODE_ENV === "development" && child.name) {
            allObjectNames.push(child.name);
          }
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
            pacmanActions = {};

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
            !child.name.toLowerCase().includes("pacman") &&
            (child.name === "CAM-Pill-Orange" ||
              (child.name.toLowerCase().includes("pill") &&
                child.name.toLowerCase().includes("orange")))
          ) {
            const pillGroup = new THREE.Group();


            const shellMeshes: THREE.Mesh[] = [];
            const otherMeshes: Array<{
              mesh: THREE.Mesh;
              name: string;
              isBitcoin: boolean;
            }> = [];

            child.traverse((subChild: THREE.Object3D) => {
              if ((subChild as any).isMesh) {
                const mesh = subChild as THREE.Mesh;
                const subChildName = subChild.name || "";
                const clonedMesh = mesh.clone();
                const lowerName = subChildName.toLowerCase();
                const isShell = lowerName.includes("shell");
                const isBitcoin =
                  lowerName.includes("bitcoin") ||
                  lowerName.includes("btc_logo");

                if (isShell) {
                  shellMeshes.push(clonedMesh);
                } else {
                  otherMeshes.push({
                    mesh: clonedMesh,
                    name: subChildName,
                    isBitcoin,
                  });
                }
              }
            });


            if (shellMeshes.length > 0) {

              const transformedGeometries = shellMeshes.map((mesh) => {
                const geometry = mesh.geometry.clone();

                geometry.applyMatrix4(mesh.matrixWorld);
                return geometry;
              });


              let combinedGeometry: THREE.BufferGeometry;
              if (transformedGeometries.length === 1) {
                combinedGeometry = transformedGeometries[0];
              } else {
                combinedGeometry = mergeGeometries(transformedGeometries);
              }


              combinedGeometry.computeBoundingBox();
              const bbox = combinedGeometry.boundingBox!;
              const centerY = (bbox.max.y + bbox.min.y) / 2;


              transformedGeometries.forEach((geo) => {
                if (geo !== combinedGeometry) {
                  geo.dispose();
                }
              });


              const { topGeometry, bottomGeometry } = splitGeometryByY(
                combinedGeometry,
                centerY
              );


              const topMesh = new THREE.Mesh(
                topGeometry,
                (
                  pillMaterialMap.shellBack as THREE.MeshPhysicalMaterial
                ).clone()
              );
              topMesh.visible = true;
              topMesh.castShadow = true;
              topMesh.receiveShadow = true;
              pillGroup.add(topMesh);


              const bottomMesh = new THREE.Mesh(
                bottomGeometry,
                (
                  pillMaterialMap.shellFront as THREE.MeshPhysicalMaterial
                ).clone()
              );
              bottomMesh.visible = true;
              bottomMesh.castShadow = true;
              bottomMesh.receiveShadow = true;
              pillGroup.add(bottomMesh);
            }


            otherMeshes.forEach(({ mesh, name, isBitcoin }) => {
              if (isBitcoin) {
                mesh.material = pillMaterialMap.bitcoin;
              } else {
                mesh.material = pillMaterialMap.default;
              }
              mesh.visible = true;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              pillGroup.add(mesh);
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


          if ((child as any).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        model.position.set(0.5, 0.5, 0.5);

        if (pill.children.length > 0) {
          pill.scale.set(0.05, 0.05, 0.05);
          pill.visible = true;
          pill.traverse((child) => {
            if ((child as any).isMesh) {
              (child as THREE.Mesh).visible = true;
            }
          });
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
