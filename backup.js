gsap.registerPlugin(ScrollTrigger);

/*------------------
Setup (Renderer, Scene, Camera)
------------------*/
const scene = new THREE.Scene();
const isMobile = window.innerWidth < 768;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
  precision: 'highp'
});

function enhanceAntiAliasing() {
  if (isMobile) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  } else {
    renderer.setPixelRatio(window.devicePixelRatio);
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

enhanceAntiAliasing();

function setPixelRatio() {
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 2 : 3);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
}

const container = document.querySelector(".el--home-maze.el");

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

window.addEventListener("load", setPixelRatio);
window.addEventListener("resize", setPixelRatio);

/*------------------
Camera
------------------*/
const originalFOV = 50;
const wideFOV = 80;
const camera = new THREE.PerspectiveCamera(originalFOV, container.clientWidth / container
  .clientHeight, 0.001, 1000);

const startMobileCameraPosition = new THREE.Vector3(0.5, 2.5, 2.5);
const startDesktopCameraPosition = new THREE.Vector3(-2, 2.5, 2);
const startPosition = isMobile ? startMobileCameraPosition : startDesktopCameraPosition;
const secondPositionMobile = new THREE.Vector3(0.5, 2.5, 2);
const secondPositionDesktop = new THREE.Vector3(-1.5, 3, 2);
const secondPosition = isMobile ? secondPositionMobile : secondPositionDesktop;
camera.position.copy(startPosition);

const mobileLookAt = new THREE.Vector3(0.5, 0.5, -1.5);
const desktopLookAt = new THREE.Vector3(-1.25, 0.5, 0.25);
const lookAt = isMobile ? mobileLookAt : desktopLookAt;
camera.lookAt(lookAt);

let isMovingForward = true;

/*------------------
Texture
------------------*/
const textureLoader = new THREE.TextureLoader();
const mazeTexture = textureLoader.load("https://c-am.b-cdn.net/CAM/matcap24.png");
const mazeMaterial = new THREE.MeshMatcapMaterial({ matcap: mazeTexture });

const topMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2f9f9,
  metalness: 0.4,
  roughness: 0,
  envMapIntensity: 10,
});

const ghostMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  opacity: 1,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.NormalBlending,
  side: THREE.DoubleSide,
  roughness: 0.75,
  metalness: 0.2,
  transmission: 0.5,
});

const ghostCoverMaterials = Array(5).fill(ghostMaterial);

/*------------------
Shader Material
------------------*/
const vertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vPosition;
  uniform float mixValue;
  void main() {
    float factor = (vPosition.y + 1.0) / 2.0;
    vec3 colorA = vec3(0.0, 0.0, 1.0);
    vec3 colorB = vec3(0.0, 1.0, 1.0);
    vec3 colorC = vec3(1.0, 0.0, 0.0);
    vec3 colorD = vec3(1.0, 1.0, 0.0);
    
    vec3 gradientA = mix(colorA, colorB, factor);
    vec3 gradientB = mix(colorC, colorD, factor);
    
    vec3 finalColor = mix(gradientA, gradientB, mixValue);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const pacmanShaderMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    mixValue: { value: 0.0 },
  },
});

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  opacity: 0.8,
  transparent: true,
  roughness: 0.5,
  metalness: 0.1,
});

/*------------------
Objects
------------------*/
const mazeUrl = "https://c-am.b-cdn.net/CAM/c-am-assets-3.glb";
const loader = new THREE.GLTFLoader();
let pacmanMixer;
const clock = new THREE.Clock();

const pacmanMaterials = {
  blue: new THREE.MeshBasicMaterial({ color: 0x1469d3 }),
  white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  default: new THREE.MeshBasicMaterial({ color: 0x1469d3 })
};

const materialMap = {
  CAM_Pacman_Backframe: pacmanMaterials.blue,
  "CAM-Pacman_Bitcoin_1": pacmanMaterials.white,
  "CAM-Pacman_Bitcoin_2": pacmanMaterials.white,
  "CAM-Pacman_Bottom": pacmanMaterials.blue,
  "CAM-Pacman_Top": pacmanMaterials.blue,
  "CAM-Pacman_Eye": pacmanMaterials.white,
  CAM_Pacman_Logo_1: pacmanMaterials.white,
  CAM_Pacman_Logo_2: pacmanMaterials.white,
  "CAM-Pacman_Shell_Boolean": pacmanMaterials.blue,
  "CAM-Pacman_Shell": pacmanMaterials.blue,
  "CAM-Pacman_Bottom_electronic": pacmanMaterials.white,
  "CAM-Pacman_Top_electronic": pacmanMaterials.white,
  "CAM-Pacman_Bottom_Text": pacmanMaterials.white,
  "CAM-Pacman_Top_Text": pacmanMaterials.white,
  default: pacmanMaterials.blue
};

const pacmanMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const pacman = new THREE.Group();
scene.add(pacman);

const ghosts = {
  pacman: pacman,
  ghost1: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost2: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost3: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost4: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial),
  ghost5: new THREE.Mesh(new THREE.BufferGeometry(), ghostMaterial)
};

Object.values(ghosts).forEach(ghost => scene.add(ghost));

const ghostContainers = {
  Ghost_EUR: ghosts.ghost1,
  Ghost_CHF: ghosts.ghost2,
  Ghost_YEN: ghosts.ghost3,
  Ghost_USD: ghosts.ghost4,
  Ghost_GBP: ghosts.ghost5
};

loader.load(
  mazeUrl,
  function (gltf) {
    const model = gltf.scene;
    const pacmanNames = [];

    model.traverse((child) => {
      if (child.name === "CAM-Pacman") {
        const children = [];
        child.traverse((subChild) => {
          if (subChild.isMesh && subChild.name !== "CAM-Pacman_Shell" && subChild.name !==
            "CAM-Pacman_Shell_Boolean") {
            subChild.material = materialMap[subChild.name] || materialMap.default;
            children.push(subChild);
          } else if (subChild.name === "CAM-Pacman_Shell" || subChild.name ===
            "CAM-Pacman_Shell_Boolean") {
            subChild.visible = false;
            subChild.morphTargetInfluences = [];
            subChild.userData.skipAnimation = true;
          }
          pacmanNames.push(subChild.name);
        });

        children.forEach((item) => ghosts.pacman.add(item));

        ghosts.pacman.scale.set(0.05, 0.05, 0.05);
        ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);

        pacmanMixer = new THREE.AnimationMixer(ghosts.pacman);
        const pacmanActions = {};

        gltf.animations.forEach((clip) => {
          const action = pacmanMixer.clipAction(clip);

          action.getMixer().addEventListener('loop', function (e) {
            e.action.getRoot().traverse(function (obj) {
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
      } else if (ghostContainers[child.name]) {
        const ghostContainer = ghostContainers[child.name];
        const ghostGroup = new THREE.Group();

        child.rotation.z = Math.PI;
        child.rotation.x = Math.PI / 2;
        child.scale.set(0.75, 0.75, 0.75);

        const children = [];
        child.traverse((subChild) => {
          if (subChild.isMesh) {
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

        ghostContainer.add(ghostGroup);
      }

      if (child.isMesh) {
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

    model.traverse(function (node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    scene.add(model);
    model.position.set(0.5, 0.5, 0.5);
  },
  undefined,
  function (error) {
    console.error("Fehler beim Laden des 3D-Modells:", error);
  }
);

/*------------------
Lights
------------------*/
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(directionalLight);
directionalLight.position.set(-5, 15, 10);
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.bias = -0.001;
directionalLight.shadow.radius = 3;
directionalLight.castShadow = true;

/*------------------
Paths
------------------*/
const startQuaternion = camera.quaternion.clone();

const endQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.5708, 0, 0));

const cameraHomePath = new THREE.CubicBezierCurve3(
  startPosition,
  secondPosition,
  new THREE.Vector3(0.55675, 3, 0.45175),
  new THREE.Vector3(0.55675, 0.5, 0.45175)
);

const pacmanHomePathPoints = [
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
];

const ghost1HomePathPoints = [
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.502), type: "straight" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.004, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.0965, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.502), type: "straight" },
];

const ghost2HomePathPoints = [
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.004, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.502), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.3055, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(1.15975, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, -0.101), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.3055, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.0965, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
];

const ghost3HomePathPoints = [
  { pos: new THREE.Vector3(0.808, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, -0.101), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, -0.0005), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, -0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.301), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.904), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.004, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.808, 0.55, 0.8035), type: "curve", curveType: "upperArc" },
];

const ghost4HomePathPoints = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.25525, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(-0.44825, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.0005), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.26025, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.15975, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
];

const ghost5HomePathPoints = [
  { pos: new THREE.Vector3(0.45625, 0.55, -0.04975), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.0005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(-0.34775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.44825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.398, 0.55, 0.0005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.34775, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.05425, 0.55, 0.301), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.4015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(-0.24725, 0.55, 0.502), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 0.6025), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.25525, 0.55, 0.703), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.3055, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.65725, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.904), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.105), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(1.36075, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.46125, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(1.46125, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.36075, 0.55, -0.2015), type: "straight" },
  { pos: new THREE.Vector3(1.15975, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(1.05925, 0.55, -0.101), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.1), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.2005), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.85825, 0.55, 0.1), type: "straight" },
  { pos: new THREE.Vector3(0.85825, 0.55, -0.101), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, -0.2015), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, -0.15125), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, -0.101), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.45625, 0.55, -0.04975), type: "curve", curveType: "lowerArc" },
];

const cameraPOVPathPoints = [
  {
    pos: new THREE.Vector3(0.55675, 0.5, 0.45175),
    type: "curve",
    curveType: "forwardDownArc",
  },
  { pos: new THREE.Vector3(0.55675, 0.55, 0.6025), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.607, 0.55, 0.703), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.65725, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 0.85375), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.9085, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.808, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.75775, 0.55, 1.05475), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.7075, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.15525), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.205, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(-0.44825, 1, 2.0095), type: "straight" },
];

const ghost1POVPathPoints = [
  { pos: new THREE.Vector3(1.05925, 0.55, 0.703), type: "straight" },
  { pos: new THREE.Vector3(1.05925, 0.55, 0.75325), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(1.009, 0.55, 0.8035), type: "straight" },
  { pos: new THREE.Vector3(0.9085, 0.55, 0.8035), type: "straight" },
];

const ghost2POVPathPoints = [
  { pos: new THREE.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(1.009, 0.55, 1.2055), type: "curve", curveType: "lowerArc" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.15525), type: "straight" },
  { pos: new THREE.Vector3(0.95875, 0.55, 1.05475), type: "straight" },
];

const ghost3POVPathPoints = [
  { pos: new THREE.Vector3(0.35575, 0.55, 0.904), type: "straight" },
  { pos: new THREE.Vector3(0.35575, 0.55, 0.95425), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.0045), type: "straight" },
];

const ghost4POVPathPoints = [
  { pos: new THREE.Vector3(0.15475, 0.55, 1.105), type: "straight" },
  { pos: new THREE.Vector3(0.15475, 0.55, 1.05475), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.205, 0.55, 1.0045), type: "straight" },
  { pos: new THREE.Vector3(0.3055, 0.55, 1.0045), type: "straight" },
];

const ghost5POVPathPoints = [
  { pos: new THREE.Vector3(0.55675, 0.55, 1.306), type: "straight" },
  { pos: new THREE.Vector3(0.55675, 0.55, 1.25575), type: "curve", curveType: "upperArc" },
  { pos: new THREE.Vector3(0.5065, 0.55, 1.2055), type: "straight" },
  { pos: new THREE.Vector3(0.406, 0.55, 1.2055), type: "straight" },
];

function createPath(pathPoints) {
  const path = new THREE.CurvePath();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const current = pathPoints[i];
    const next = pathPoints[i + 1];

    if (current.type === "straight") {
      const line = new THREE.LineCurve3(current.pos, next.pos);
      path.add(line);
    } else if (current.type === "curve") {
      let midPoint;
      if (current.curveType === "upperArc") {
        midPoint = new THREE.Vector3(current.pos.x, current.pos.y, next.pos.z);
      } else if (current.curveType === "lowerArc") {
        midPoint = new THREE.Vector3(next.pos.x, current.pos.y, current.pos.z);
      } else if (current.curveType === "forwardDownArc") {
        midPoint = new THREE.Vector3(current.pos.x, next.pos.y, current.pos.z);
      }
      const curve = new THREE.QuadraticBezierCurve3(current.pos, midPoint, next.pos);
      path.add(curve);
    }
  }
  return path;
}

const paths = {};
const pathLines = {};

const pathsData = {
  pacmanHomePath: {
    points: pacmanHomePathPoints,
    color: 0xffff00,
  },
  ghost1HomePath: {
    points: ghost1HomePathPoints,
    color: 0xff0000,
  },
  ghost2HomePath: {
    points: ghost2HomePathPoints,
    color: 0xffa500,
  },
  ghost3HomePath: {
    points: ghost3HomePathPoints,
    color: 0xff69b4,
  },
  ghost4HomePath: {
    points: ghost4HomePathPoints,
    color: 0x32cd32,
  },
  ghost5HomePath: {
    points: ghost5HomePathPoints,
    color: 0xffdab9,
  },
  cameraPOVPath: {
    points: cameraPOVPathPoints,
    color: 0xffffff,
  },
  ghost1POVPath: {
    points: ghost1POVPathPoints,
    color: 0xff0000,
  },
  ghost2POVPath: {
    points: ghost2POVPathPoints,
    color: 0xffa500,
  },
  ghost3POVPath: {
    points: ghost3POVPathPoints,
    color: 0xff69b4,
  },
  ghost4POVPath: {
    points: ghost4POVPathPoints,
    color: 0x32cd32,
  },
  ghost5POVPath: {
    points: ghost5POVPathPoints,
    color: 0xffdab9,
  },
};

function getPathsForSection(section) {
  const mapping = {};

  if (section === "home") {
    mapping.pacman = "pacmanHomePath";
    mapping.ghost1 = "ghost1HomePath";
    mapping.ghost2 = "ghost2HomePath";
    mapping.ghost3 = "ghost3HomePath";
    mapping.ghost4 = "ghost4HomePath";
    mapping.ghost5 = "ghost5HomePath";
  } else if (section === "pov") {
    mapping.pacman = "cameraPOVPath";
    mapping.ghost1 = "ghost1POVPath";
    mapping.ghost2 = "ghost2POVPath";
    mapping.ghost3 = "ghost3POVPath";
    mapping.ghost4 = "ghost4POVPath";
    mapping.ghost5 = "ghost5POVPath";
  }
  return mapping;
}

Object.entries(pathsData).forEach(([key, data]) => {
  paths[key] = createPath(data.points);

  /*const points = paths[key].getPoints(200);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: data.color,
    linewidth: 2
  });
  pathLines[key] = new THREE.Line(geometry, material);

  scene.add(pathLines[key]);*/
});

/*------------------
GSAP
------------------*/
let homeEndPoint = new THREE.Vector3(0.55675, 0.5, 0.45175);
let povStartPoint1 = new THREE.Vector3(0.55675, -5, 0.45175);
let povStartPoint2 = new THREE.Vector3(0.55675, -2.5, 0.45175);
let cachedHomeEndRotation = null;

function setupScrollIndicator() {
  gsap.set(".cmp--scroll", { display: "block" });
  if (window.scrollY > 0) {
    gsap.set(".cmp--scroll", { opacity: 1, y: 0 });
  }
  setTimeout(() => {
    gsap.to(".cmp--scroll", {
      opacity: 0,
      y: "1em",
      duration: 0.25,
      onComplete: () => gsap.set(".cmp--scroll", { display: "none" }),
      scrollTrigger: {
        trigger: ".sc--home.sc",
        start: "top top",
        toggleActions: "play none none reverse"
      }
    });
  }, 10000);
}

function setupIntroHeader() {
  gsap.fromTo(
    ".sc_h--intro", { scale: 0, opacity: 0 },
    {
      scale: 1.5,
      opacity: 0,
      scrollTrigger: {
        trigger: ".sc--intro",
        start: "top top",
        end: "center center",
        scrub: 0.5
      },
      ease: "none",
      keyframes: [
        { scale: 0, opacity: 0, duration: 0 },
        { scale: 0.8, opacity: 1, duration: 0.3 },
        { scale: 1.2, opacity: 1, duration: 0.4 },
        { scale: 1.5, opacity: 0, duration: 0.3 }
      ]
    }
  );
}

function initIntro() {
  setupIntroHeader();

  gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--intro",
      start: "center center",
      end: "bottom bottom",
      scrub: 0.5,
      onEnter: () => {
        gsap.killTweensOf(camera.position);
        camera.position.set(0.55, -5, 0.45);
        camera.updateMatrix();
        camera.updateMatrixWorld();
      }
    }
  }).fromTo(
    ".sc_b--intro", { scale: 0.5, opacity: 0 },
    {
      keyframes: [
        { scale: 0.5, opacity: 0, duration: 0 },
        { scale: 0.8, opacity: 1, duration: 0.3 },
        { scale: 1.2, opacity: 1, duration: 0.4 },
        { scale: 1.5, opacity: 0, duration: 0.3 }
      ]
    }
  );
}

function initCameraHome() {
  if (!camera || !cameraHomePath || !startQuaternion || !endQuaternion) {
    console.warn("Camera animation variables not ready, retrying in 100ms");
    setTimeout(initCameraHome, 100);
    return;
  }

  gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--home",
      start: "top top",
      end: "bottom top",
      scrub: 0.5
    }
  }).to({ t: 0 }, {
    t: 1,
    immediateRender: false,
    onUpdate: function () {
      const progress = this.targets()[0].t;
      const cameraPoint = cameraHomePath.getPoint(progress);
      camera.position.copy(cameraPoint);
      camera.fov = originalFOV;

      const currentQuaternion = new THREE.Quaternion();
      currentQuaternion.slerpQuaternions(startQuaternion, endQuaternion, progress);
      camera.quaternion.copy(currentQuaternion);

      if (progress > 0.98) {
        cachedHomeEndRotation = camera.quaternion.clone();
      }

      camera.updateProjectionMatrix();
    }
  });
}

function initEndScreen() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--final",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      toggleActions: "play none none reverse",
    },
  });

  tl.to(finalSection, {
    opacity: 1,
    ease: "power2.inOut",
    onComplete: () => {
      endScreenPassed = true;
      startedInitEndScreen = false;
    },
  });
}

function setupPovTimeline() {
  gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--pov",
      start: "top bottom",
      end: "bottom top",
      endTrigger: ".sc--final",
      scrub: 0.5,
      toggleActions: "play none none reverse",
      onLeave: handleLeavePOV,
      onLeaveBack: handleLeavePOV,
    },
  }).to({ progress: 0 }, {
    progress: 1,
    immediateRender: false,
    onStart: handleAnimationStart,
    onUpdate: handleAnimationUpdate,
    onReverseComplete: () => resetState(true),
    onComplete: resetState,
  });
}

function initPovAnimations() {
  if (!ghosts || !camera || !paths.cameraPOVPath || !startQuaternion || !endQuaternion) {
    console.warn("Animation resources not ready, retrying in 100ms");
    setTimeout(initPovAnimations, 100);
    return;
  }

  setupPovTimeline();
}

/*------------------
Animation Configuration
------------------*/
let homePositionsSaved = false;
let homeAnimationPositions = {};
let isInPovSection = false;

let animationRunning = true;
let savedPositions = {};
let pauseTime;
let timeOffset = 0;
let oldTop = 0;

let scrollTimeout = null;
const scrollDebounceDelay = 0;

const canvas = document.querySelector("canvas");
const finalSection = document.querySelector(".sc--final.sc");
const finalContainer = finalSection.querySelector(".cr--final.cr");
const parentElements = document.querySelectorAll(".cmp--pov.cmp");

const startRotationPoint = new THREE.Vector3(0.55675, 0.55, 1.306);
const endRotationPoint = new THREE.Vector3(-0.14675, 1, 1.8085);
const targetLookAt = new THREE.Vector3(0.55675, 0.1, 1.306);
const finalLookAt = new THREE.Vector3(-0.14675, 0, 1.8085);
const reverseFinalLookAt = new THREE.Vector3(7.395407041377711, 0.9578031302345096, -
  4.312450290270135);

let previousCameraPosition = null;
let cachedStartYAngle = null;
let animationStarted = false;
let rotationStarted = false;
let startedInitEndScreen = false;
let endScreenPassed = false;
let startEndProgress = 0;
const startEndScreenSectionProgress = 0.8;
const rotationStartingPoint = 0.973;

const GHOST_TEXT_START = 0.2;
const CAM_TEXT_START = 0.3;
const FADE_OUT_START = 0.8;
const TRIGGER_DISTANCE = 0.02;

const triggerPositions = {
  ghost1: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 0.75325),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 0.8035),
    camTextPos: new THREE.Vector3(0.75775, 0.55, 0.8035),
    endPosition: new THREE.Vector3(0.85825, 0.55, 0.8035),
    parent: parentElements[0],
    active: false,
  },
  ghost2: {
    triggerPos: new THREE.Vector3(0.9085, 0.55, 0.8035),
    ghostTextPos: new THREE.Vector3(0.95875, 0.55, 0.85375),
    camTextPos: new THREE.Vector3(0.95875, 0.55, 0.904),
    endPosition: new THREE.Vector3(0.95875, 0.55, 1.0045),
    parent: parentElements[1],
    active: false,
  },
  ghost3: {
    triggerPos: new THREE.Vector3(0.75775, 0.55, 1.05475),
    ghostTextPos: new THREE.Vector3(0.7075, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.55675, 0.55, 1.0045),
    parent: parentElements[2],
    active: false,
  },
  ghost4: {
    triggerPos: new THREE.Vector3(0.65725, 0.55, 1.0045),
    ghostTextPos: new THREE.Vector3(0.5065, 0.55, 1.0045),
    camTextPos: new THREE.Vector3(0.45625, 0.55, 1.0045),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.0045),
    parent: parentElements[3],
    active: false,
  },
  ghost5: {
    triggerPos: new THREE.Vector3(0.15475, 0.55, 1.15525),
    ghostTextPos: new THREE.Vector3(0.205, 0.55, 1.2055),
    camTextPos: new THREE.Vector3(0.25525, 0.55, 1.2055),
    endPosition: new THREE.Vector3(0.35575, 0.55, 1.2055),
    parent: parentElements[4],
    active: false,
  },
};

const previousPositions = {
  ghost1: null,
  ghost2: null,
  ghost3: null,
  ghost4: null,
  ghost5: null,
};

/*------------------
Utility Functions
------------------*/
function smoothStep(x) {
  return x * x * (3 - 2 * x);
}

function getCameraLookAtPoint() {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  const lookAtPoint = new THREE.Vector3();
  lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
  return lookAtPoint;
}

window.setCamera = function (lookAt) {
  if (typeof lookAt === "string") {
    const [x, y, z] = lookAt.split(",").map(Number);
    lookAt = new THREE.Vector3(x, y, z);
  }
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  camera.updateMatrix();
  camera.updateMatrixWorld();
};

/*------------------
Scroll handling
------------------*/
window.addEventListener("scroll", () => {
  const top = window.scrollY;
  const wasMovingForward = isMovingForward;
  isMovingForward = top > oldTop;
  oldTop = top;

  if (!homePositionsSaved && window.scrollY === 0) {
    homePositionsSaved = true;
    Object.entries(ghosts).forEach(([key, ghost]) => {
      homeAnimationPositions[key] = {
        position: ghost.position.clone(),
        lookAt: ghost.getWorldDirection(new THREE.Vector3()).clone(),
        rotation: ghost.rotation.clone()
      };
    });
  }

  if (window.scrollY > 0 && animationRunning) {
    pauseTime = Date.now();
    animationRunning = false;
  }

  else if (window.scrollY === 0 && !animationRunning) {
    if (pauseTime) {
      timeOffset += Date.now() - pauseTime;
    }
    animationRunning = true;

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
  }
});

/*------------------
Animation state management
------------------*/
function resetCameraState(isReverse = false) {
  pacman.visible = true;
  rotationStarted = false;
  cachedStartYAngle = null;
  startEndProgress = 0;
  startedInitEndScreen = false;

  if (!isReverse) {
    canvas.style.display = "none";
    camera.lookAt(finalLookAt);
    endScreenPassed = true;
  } else {
    endScreenPassed = false;
  }
}

function resetGhostsState() {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      ghost.scale.set(1, 1, 1);
      ghost.material.opacity = 1;
      ghost.visible = false;

      const { parent } = triggerPositions[key];
      const ghostText = parent;
      const camText = parent.querySelector(".cmp--pov-cam");

      ghostText.classList.add("hidden");
      camText.classList.add("hidden");

      ghost.previousProgress = 0;
      triggerPositions[key].active = false;
      previousPositions[key] = false;
    }
  });
}

function resetState(isReverse = false) {
  resetGhostsState();
  resetCameraState(isReverse);
}

/*------------------
Camera animation
------------------*/
function updateCamera(progress) {
  const position = paths.cameraPOVPath.getPointAt(progress);
  camera.position.copy(position);
  camera.fov = wideFOV;

  if (canvas.style.display === "none" && progress < 0.99) {
    canvas.style.display = "block";
  }
  if (pacman.visible) {
    pacman.visible = false;
  }

  const tangent = paths.cameraPOVPath.getTangentAt(progress).normalize();
  const defaultLookAt = position.clone().add(tangent);

  if (progress === 0) {
    camera.lookAt(new THREE.Vector3(camera.position.x, 2, camera.position.z));
  } else if (progress < 0.1) {
    const transitionProgress = progress / 0.1;
    const upLookAt = new THREE.Vector3(camera.position.x, 1, camera.position.z);
    const frontLookAt = new THREE.Vector3(camera.position.x, 0.5, camera.position.z + 1);

    const interpolatedLookAt = new THREE.Vector3();
    interpolatedLookAt.lerpVectors(upLookAt, frontLookAt, smoothStep(transitionProgress));

    camera.lookAt(interpolatedLookAt);
  }

  const point1Progress = findClosestProgressOnPath(paths.cameraPOVPath, povStartPoint1);
  const point2Progress = findClosestProgressOnPath(paths.cameraPOVPath, povStartPoint2);
  const startRotationProgress = findClosestProgressOnPath(paths.cameraPOVPath, startRotationPoint);
  const endRotationProgress = findClosestProgressOnPath(paths.cameraPOVPath, endRotationPoint);

  if (progress <= point2Progress && cachedHomeEndRotation) {
    handleHomeTransition(progress, position, defaultLookAt, point1Progress, point2Progress);
  } else if (progress >= startRotationProgress && progress <= endRotationProgress) {
    handleRotationPhase(progress, position, defaultLookAt, startRotationProgress,
      endRotationProgress);
  } else if (progress > startEndScreenSectionProgress && endScreenPassed) {
    handleEndSequence(progress);
  } else {
    handleDefaultOrientation(progress, startRotationProgress, endRotationProgress, defaultLookAt);
  }

  camera.updateProjectionMatrix();
}

function handleHomeTransition(progress, position, defaultLookAt, point1Progress, point2Progress) {
  const transitionProgress = (progress - point1Progress) / (point2Progress - point1Progress);

  if (transitionProgress >= 0 && transitionProgress <= 1) {
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(position, defaultLookAt, camera.up)
    );

    const easedProgress = smoothStep(transitionProgress);
    const newQuaternion = new THREE.Quaternion()
      .copy(cachedHomeEndRotation)
      .slerp(targetQuaternion, easedProgress);

    camera.quaternion.copy(newQuaternion);
  } else if (transitionProgress > 1) {
    camera.lookAt(defaultLookAt);
  }
}

function handleRotationPhase(progress, position, defaultLookAt, startRotationProgress,
  endRotationProgress) {
  const sectionProgress = (progress - startRotationProgress) / (endRotationProgress -
    startRotationProgress);

  if (cachedStartYAngle === null) {
    const startDir = new THREE.Vector2(defaultLookAt.x - position.x, defaultLookAt.z - position.z)
      .normalize();
    cachedStartYAngle = Math.atan2(startDir.y, startDir.x);
    cachedStartYAngle = cachedStartYAngle > 3 ? cachedStartYAngle / 2 : cachedStartYAngle;
  }

  const targetDir = new THREE.Vector2(targetLookAt.x - position.x, targetLookAt.z - position.z)
    .normalize();
  let targetYAngle = Math.atan2(targetDir.y, targetDir.x);

  let angleDiff = targetYAngle - cachedStartYAngle;
  if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  else if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  angleDiff = -angleDiff * 1.75;
  targetYAngle = cachedStartYAngle + angleDiff;

  const easedProgress = smoothStep(sectionProgress);
  const newYAngle = cachedStartYAngle * (1 - easedProgress) + targetYAngle * easedProgress;

  const radius = 1.0;
  const newLookAt = new THREE.Vector3(
    position.x + Math.cos(newYAngle) * radius,
    position.y,
    position.z + Math.sin(newYAngle) * radius
  );

  camera.lookAt(newLookAt);

  if (progress >= endRotationProgress) {
    cachedStartYAngle = null;
  }
  rotationStarted = true;

  if (progress >= startEndScreenSectionProgress && !startedInitEndScreen) {
    startedInitEndScreen = true;
    initEndScreen();
  }
}

function handleEndSequence(progress) {
  if (startEndProgress === 0 && progress !== 1) {
    const truncatedProgress = Math.floor(progress * 100) / 100;
    startEndProgress = truncatedProgress === 0.99 ? rotationStartingPoint : progress;
  }

  const animationProgress = (progress - startEndProgress) / (1 - startEndProgress);

  if (isMovingForward && animationProgress > 0) {
    const currentLookAt = getCameraLookAtPoint();

    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      currentLookAt,
      finalLookAt,
      smoothStep(animationProgress)
    );

    const startFOV = wideFOV;
    const targetFOV = wideFOV / 4;
    camera.fov = startFOV + (targetFOV - startFOV) * smoothStep(animationProgress);

    camera.lookAt(interpolatedLookAt);
  } else if (animationProgress > 0) {
    const interpolatedLookAt = new THREE.Vector3().lerpVectors(
      reverseFinalLookAt,
      finalLookAt,
      smoothStep(animationProgress)
    );

    const startFOV = wideFOV / 4;
    const targetFOV = wideFOV;
    camera.fov = targetFOV - (targetFOV - startFOV) * smoothStep(animationProgress);

    camera.lookAt(interpolatedLookAt);
  }
}

function handleDefaultOrientation(progress, startRotationProgress, endRotationProgress,
  defaultLookAt) {
  if ((progress < startRotationProgress || progress > endRotationProgress) && !
    startedInitEndScreen) {
    cachedStartYAngle = null;
    rotationStarted = false;
    endScreenPassed = false;
    startedInitEndScreen = false;
    finalSection.style.opacity = 0;
  }

  if (!rotationStarted && !startedInitEndScreen) {
    camera.lookAt(defaultLookAt);
  }

  if (!(endScreenPassed && progress > 0.8)) {
    startEndProgress = 0;
  }
}

/*------------------
Ghost animation
------------------*/
function handleAnimationStart() {
  const pathMapping = getPathsForSection("pov");
  Object.entries(ghosts).forEach(([key, ghost]) => {
    const pathKey = pathMapping[key];
    if (paths[pathKey]) {
      const position = paths[pathKey].getPointAt(0);
      ghost.position.copy(position);
      const tangent = paths[pathKey].getTangentAt(0).normalize();
      ghost.lookAt(position.clone().add(tangent));

      if (key !== "pacman") {
        ghost.visible = false;
      }
    }
  });

  pacman.visible = false;
}

function updateGhosts(cameraPosition) {
  const pathMapping = getPathsForSection("pov");

  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key === "pacman") return;

    const pathKey = pathMapping[key];
    if (paths[pathKey] && triggerPositions[key]) {
      updateGhost(key, ghost, pathKey, cameraPosition);
    }
  });
}

function findClosestProgressOnPath(path, targetPoint, samples = 2000) {
  if (!path || !targetPoint) return 0;

  let closestProgress = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < samples; i++) {
    try {
      const t = i / (samples - 1);
      const pointOnPath = path.getPointAt(t);
      if (!pointOnPath) continue;

      const distance = pointOnPath.distanceTo(targetPoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProgress = t;
      }
    } catch (error) {}
  }

  return closestProgress;
}

function updateGhost(key, ghost, pathKey, cameraPosition) {
  const { triggerPos, ghostTextPos, camTextPos, endPosition, parent } = triggerPositions[key];
  if (!triggerPos || !endPosition) return;

  const ghostText = parent;
  const camText = parent.querySelector(".cmp--pov-cam");

  ghost.scale.set(0.5, 0.5, 0.5);

  // Grundlegende Initialisierung
  if (triggerPositions[key].hasBeenTriggered === undefined) {
    triggerPositions[key].hasBeenTriggered = false;
    triggerPositions[key].hasBeenDeactivated = false;
    triggerPositions[key].triggerCameraProgress = null;
    triggerPositions[key].ghostTextCameraProgress = null;
    triggerPositions[key].camTextCameraProgress = null;
    triggerPositions[key].endCameraProgress = null;
    triggerPositions[key].currentPathT = 0;
    triggerPositions[key].ghostTextOpacity = 0;
    triggerPositions[key].camTextOpacity = 0;
    triggerPositions[key].lastProgress = 0;

    // Ghost und Text unsichtbar machen
    ghost.visible = false;
    ghostText.classList.add("hidden");
    camText.classList.add("hidden");
    ghostText.style.opacity = 0;
    camText.style.opacity = 0;
  }

  // Position der Kamera auf dem Pfad bestimmen
  const currentCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath, cameraPosition, 800);

  // Pfad-Positionen ermitteln (falls noch nicht geschehen)
  if (triggerPositions[key].triggerCameraProgress === null) {
    triggerPositions[key].triggerCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath,
      triggerPos, 800);

    if (ghostTextPos) {
      triggerPositions[key].ghostTextCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath,
        ghostTextPos, 800);
    } else {
      triggerPositions[key].ghostTextCameraProgress = triggerPositions[key].triggerCameraProgress;
    }

    if (camTextPos) {
      triggerPositions[key].camTextCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath,
        camTextPos, 800);
    } else {
      triggerPositions[key].camTextCameraProgress = triggerPositions[key].ghostTextCameraProgress;
    }

    triggerPositions[key].endCameraProgress = findClosestProgressOnPath(paths.cameraPOVPath,
      endPosition, 800);
  }

  // Konstanten für die Sichtbarkeitsbereiche
  const triggerProgress = triggerPositions[key].triggerCameraProgress;
  const ghostTextProgress = triggerPositions[key].ghostTextCameraProgress;
  const camTextProgress = triggerPositions[key].camTextCameraProgress;
  const endProgress = triggerPositions[key].endCameraProgress;

  // 1. Ghost-Sichtbarkeit und Position
  if (currentCameraProgress >= triggerProgress && currentCameraProgress <= endProgress) {
    // Ghost sichtbar machen, wenn noch nicht aktiv
    if (!ghost.visible) {
      ghost.visible = true;
      triggerPositions[key].hasBeenTriggered = true;
    }

    // Ghost Position aktualisieren
    const normalizedProgress = (currentCameraProgress - triggerProgress) / (endProgress -
      triggerProgress);
    let ghostProgress = Math.max(0, Math.min(1, normalizedProgress));

    // Parameter-Smoothing
    if (triggerPositions[key].currentPathT === undefined) {
      triggerPositions[key].currentPathT = ghostProgress;
    } else {
      const parameterSmoothingFactor = 0.1;
      triggerPositions[key].currentPathT += (ghostProgress - triggerPositions[key].currentPathT) *
        parameterSmoothingFactor;
    }

    // Finaler Progress mit Smoothing
    ghostProgress = triggerPositions[key].currentPathT;

    // Ghost-Position aktualisieren
    const pathPoint = paths[pathKey].getPointAt(ghostProgress);
    ghost.position.copy(pathPoint);

    // Ghost-Ausrichtung aktualisieren
    const tangent = paths[pathKey].getTangentAt(ghostProgress).normalize();
    const lookAtPoint = ghost.position.clone().add(tangent);

    if (!triggerPositions[key].currentRotation) {
      triggerPositions[key].currentRotation = new THREE.Quaternion();
      ghost.getWorldQuaternion(triggerPositions[key].currentRotation);
    }
    const targetQuaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4().lookAt(
      ghost.position,
      lookAtPoint,
      new THREE.Vector3(0, 1, 0)
    );
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);

    // Sanft zur Ziel-Rotation interpolieren
    const rotationSmoothingFactor = 0.15; // Anpassen für schnellere/langsamere Drehungen
    triggerPositions[key].currentRotation.slerp(targetQuaternion, rotationSmoothingFactor);

    // Anwenden der geglätteten Rotation
    ghost.quaternion.copy(triggerPositions[key].currentRotation);
    // Fade-Out am Ende
    if (ghostProgress > 0.9) {
      ghost.material.opacity = 1 - (ghostProgress - 0.9) / 0.1;
    } else {
      ghost.material.opacity = 1;
    }
  } else {
    // Ghost unsichtbar machen, wenn außerhalb des Bereichs
    ghost.visible = false;
    triggerPositions[key].hasBeenTriggered = false;
  }

  // 2. TEXT-VISIBILITY: Angepasste Timing-Bereiche

  // Berechne die Länge des gesamten Ghost-Abschnitts
  const sectionLength = endProgress - triggerProgress;

  // Text soll später erscheinen und länger sichtbar bleiben
  const fadeInStart = ghostTextProgress; // Exakt am Trigger-Punkt starten
  const fadeInEnd = fadeInStart + (sectionLength * 0.07); // Kurze Einblenddauer
  const stayVisibleUntil = endProgress - (sectionLength * 0.15); // Länger sichtbar bleiben
  const fadeOutEnd = endProgress; // Ausblenden bis zum Ende

  // Ghost-Text Sichtbarkeit berechnen
  let targetGhostOpacity = 0;

  if (currentCameraProgress >= fadeInStart && currentCameraProgress < fadeInEnd) {
    // Einblendphase
    const fadeProgress = (currentCameraProgress - fadeInStart) / (fadeInEnd - fadeInStart);
    targetGhostOpacity = fadeProgress;
  } else if (currentCameraProgress >= fadeInEnd && currentCameraProgress < stayVisibleUntil) {
    // Voll sichtbare Phase
    targetGhostOpacity = 1.0;
  } else if (currentCameraProgress >= stayVisibleUntil && currentCameraProgress <= fadeOutEnd) {
    // Ausblendphase
    const fadeProgress = (currentCameraProgress - stayVisibleUntil) / (fadeOutEnd -
      stayVisibleUntil);
    targetGhostOpacity = 1.0 - fadeProgress;
  }

  // Ähnliche Logik für CAM-Text, aber leicht versetzt
  const camFadeInStart = camTextProgress;
  const camFadeInEnd = camFadeInStart + (sectionLength * 0.07);
  const camStayVisibleUntil = stayVisibleUntil;

  let targetCamOpacity = 0;

  if (currentCameraProgress >= camFadeInStart && currentCameraProgress < camFadeInEnd) {
    // Einblendphase
    const fadeProgress = (currentCameraProgress - camFadeInStart) / (camFadeInEnd - camFadeInStart);
    targetCamOpacity = fadeProgress * 0.8; // Maximale Opazität 0.8
  } else if (currentCameraProgress >= camFadeInEnd && currentCameraProgress < camStayVisibleUntil) {
    // Voll sichtbare Phase
    targetCamOpacity = 0.8;
  } else if (currentCameraProgress >= camStayVisibleUntil && currentCameraProgress <= fadeOutEnd) {
    // Ausblendphase
    const fadeProgress = (currentCameraProgress - camStayVisibleUntil) / (fadeOutEnd -
      camStayVisibleUntil);
    targetCamOpacity = 0.8 * (1.0 - fadeProgress);
  }

  // 3. OPAZITÄTS-UPDATES

  // Angepasste Übergangsgeschwindigkeiten
  const fadeInSpeed = 0.2; // Schnelleres Einblenden
  const fadeOutSpeed = 0.1; // Langsameres Ausblenden

  // Update Ghost-Text Opazität
  if (targetGhostOpacity > triggerPositions[key].ghostTextOpacity) {
    triggerPositions[key].ghostTextOpacity += (targetGhostOpacity - triggerPositions[key]
      .ghostTextOpacity) * fadeInSpeed;
  } else {
    triggerPositions[key].ghostTextOpacity += (targetGhostOpacity - triggerPositions[key]
      .ghostTextOpacity) * fadeOutSpeed;
  }

  // Update CAM-Text Opazität
  if (targetCamOpacity > triggerPositions[key].camTextOpacity) {
    triggerPositions[key].camTextOpacity += (targetCamOpacity - triggerPositions[key]
      .camTextOpacity) * fadeInSpeed;
  } else {
    triggerPositions[key].camTextOpacity += (targetCamOpacity - triggerPositions[key]
      .camTextOpacity) * fadeOutSpeed;
  }

  // 4. DOM-AKTUALISIERUNGEN

  // Opazitätswerte abrunden
  const ghostTextOpacity = Math.max(0, Math.min(1, Math.round(triggerPositions[key]
    .ghostTextOpacity * 1000) / 1000));
  const camTextOpacity = Math.max(0, Math.min(1, Math.round(triggerPositions[key].camTextOpacity *
    1000) / 1000));

  // DOM nur aktualisieren wenn nötig
  if (ghostTextOpacity > 0.01) {
    if (ghostText.classList.contains("hidden")) {
      ghostText.classList.remove("hidden");
    }
    ghostText.style.opacity = ghostTextOpacity;
  } else if (ghostTextOpacity <= 0.01 && !ghostText.classList.contains("hidden")) {
    ghostText.classList.add("hidden");
    ghostText.style.opacity = 0;
  }

  if (camTextOpacity > 0.01) {
    if (camText.classList.contains("hidden")) {
      camText.classList.remove("hidden");
    }
    camText.style.opacity = camTextOpacity;
  } else if (camTextOpacity <= 0.01 && !camText.classList.contains("hidden")) {
    camText.classList.add("hidden");
    camText.style.opacity = 0;
  }

  // Position für nächste Iteration speichern
  triggerPositions[key].lastProgress = currentCameraProgress;
}

function handleAnimationUpdate() {
  const overallProgress = this.targets()[0].progress;
  const cameraPosition = paths.cameraPOVPath.getPointAt(overallProgress);

  if (previousCameraPosition) {
    updateGhosts(cameraPosition);
    updateCamera(overallProgress);
    previousCameraPosition.copy(cameraPosition);
  } else {
    previousCameraPosition = cameraPosition.clone();
  }
}

function handleLeavePOV() {
  Object.entries(ghosts).forEach(([key, ghost]) => {
    if (key !== "pacman") {
      if (triggerPositions[key]) {
        triggerPositions[key].hasBeenTriggered = false;
        triggerPositions[key].hasBeenDeactivated = false;
        triggerPositions[key].active = false;
      }

      const parent = triggerPositions[key] ? triggerPositions[key].parent : null;
      if (parent) {
        parent.classList.add("hidden");
        const camText = parent.querySelector(".cmp--pov-cam");
        if (camText) {
          camText.classList.add("hidden");
          // Explizites Zurücksetzen der Opazität
          camText.style.opacity = 0;
        }
        // Explizites Zurücksetzen der Parent-Opazität
        parent.style.opacity = 0;
      }
    }

    if (homeAnimationPositions[key]) {
      ghost.position.copy(homeAnimationPositions[key].position);

      if (key === "pacman") {
        ghost.rotation.copy(homeAnimationPositions[key].rotation);
        ghost.previousZRotation = Math.atan2(
          homeAnimationPositions[key].lookAt.x,
          homeAnimationPositions[key].lookAt.z
        );
      } else {
        const target = new THREE.Vector3().addVectors(
          ghost.position,
          homeAnimationPositions[key].lookAt
        );
        ghost.lookAt(target);
      }

      ghost.visible = true;
      ghost.material.opacity = 1;
    }
  });

  pacman.visible = true;
  animationRunning = true;
}

/*------------------
Main animation Loop
------------------*/
function animate() {
  const currentTime = Date.now();
  const adjustedTime = currentTime - timeOffset;

  if (animationRunning) {
    const t = ((adjustedTime / 6000) % 6) / 6;
    const pathMapping = getPathsForSection("home");

    if (!pacman.visible) {
      pacman.visible = true;
    }

    const delta = clock.getDelta();
    if (pacmanMixer) {
      pacmanMixer.update(delta);
    }

    Object.entries(ghosts).forEach(([key, ghost]) => {
      const pathKey = pathMapping[key];
      if (paths[pathKey]) {
        const position = paths[pathKey].getPointAt(t);
        ghost.position.copy(position);
        const tangent = paths[pathKey].getTangentAt(t).normalize();
        ghost.lookAt(position.clone().add(tangent));

        if (key === "pacman") {
          const zRotation = Math.atan2(tangent.x, tangent.z);

          if (ghost.previousZRotation === undefined) {
            ghost.previousZRotation = zRotation;
          }

          let rotationDiff = zRotation - ghost.previousZRotation;

          if (rotationDiff > Math.PI) {
            rotationDiff -= 2 * Math.PI;
          } else if (rotationDiff < -Math.PI) {
            rotationDiff += 2 * Math.PI;
          }

          const smoothFactor = 0.1;
          const smoothedRotation = ghost.previousZRotation + rotationDiff * smoothFactor;

          ghost.previousZRotation = smoothedRotation;
          ghost.rotation.set(Math.PI / 2, Math.PI, smoothedRotation + Math.PI / 2);
        }
      }
    });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
animationRunning = window.scrollY === 0;

/*------------------
Initialization
------------------*/
function initGsap() {
  setupScrollIndicator();
  initIntro();
  initCameraHome();
  initPovAnimations();
}

setTimeout(initGsap, 200);

/*------------------
Responsiveness
------------------*/
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
