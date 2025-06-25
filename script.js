/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/animation.ts":
/*!**************************!*\
  !*** ./src/animation.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   animationSystem: () => (/* binding */ animationSystem),
/* harmony export */   initAnimationSystem: () => (/* binding */ initAnimationSystem),
/* harmony export */   startAnimationLoop: () => (/* binding */ startAnimationLoop)
/* harmony export */ });
/* harmony import */ var _camera__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./camera */ "./src/camera.ts");
/* harmony import */ var _scene__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scene */ "./src/scene.ts");
/* harmony import */ var _objects__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./objects */ "./src/objects.ts");
/* harmony import */ var _paths__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./paths */ "./src/paths.ts");




class AnimationSystem {
    constructor() {
        this.state = "IDLE";
        this.animationTime = 0;
        this.animationDuration = 6000; // 6 seconds like in backup.js
        this.isAnimating = false;
        this.timeOffset = 0;
        this.animationRunning = true;
        // Path data for each object
        this.homePaths = {};
        const homePathData = (0,_paths__WEBPACK_IMPORTED_MODULE_3__.getPathsForSection)("home");
        this.homePaths = homePathData;
        "AnimationSystem: Home paths loaded:",
            Object.keys(this.homePaths);
        ;
    }
    // Start the home animation
    startHomeAnimation() {
        if (this.isAnimating)
            return;
        this.state = "HOME_ANIMATION";
        this.isAnimating = true;
        this.animationTime = 0;
        this.timeOffset = Date.now();
    }
    // Update animation
    update() {
        if (!this.isAnimating)
            return;
        const deltaTime = _scene__WEBPACK_IMPORTED_MODULE_1__.clock.getDelta();
        this.animationTime += deltaTime;
        if (this.state === "HOME_ANIMATION") {
            this.updateHomeAnimation();
        }
    }
    updateHomeAnimation() {
        const currentTime = Date.now();
        const adjustedTime = currentTime - this.timeOffset;
        // Use the same timing logic as backup.js
        const t = ((adjustedTime / this.animationDuration) % 6) / 6;
        const pathMapping = (0,_paths__WEBPACK_IMPORTED_MODULE_3__.getPathsForSection)("home");
        if (!_objects__WEBPACK_IMPORTED_MODULE_2__.pacman.visible) {
            _objects__WEBPACK_IMPORTED_MODULE_2__.pacman.visible = true;
        }
        // Update Pacman mixer if available
        // Note: You'll need to import pacmanMixer from objects.ts if you want this
        // if (pacmanMixer) {
        //   pacmanMixer.update(deltaTime);
        // }
        // Animate all objects along their paths (same logic as backup.js)
        Object.entries(_objects__WEBPACK_IMPORTED_MODULE_2__.ghosts).forEach(([key, ghost]) => {
            const pathKey = pathMapping[key];
            if (pathKey && _paths__WEBPACK_IMPORTED_MODULE_3__.paths[pathKey]) {
                const path = _paths__WEBPACK_IMPORTED_MODULE_3__.paths[pathKey];
                if (path) {
                    const position = path.getPointAt(t);
                    ghost.position.copy(position);
                    const tangent = path.getTangentAt(t).normalize();
                    ghost.lookAt(position.clone().add(tangent));
                    if (key === "pacman") {
                        const zRotation = Math.atan2(tangent.x, tangent.z);
                        if (ghost.previousZRotation === undefined) {
                            ghost.previousZRotation = zRotation;
                        }
                        let rotationDiff = zRotation - ghost.previousZRotation;
                        if (rotationDiff > Math.PI) {
                            rotationDiff -= 2 * Math.PI;
                        }
                        else if (rotationDiff < -Math.PI) {
                            rotationDiff += 2 * Math.PI;
                        }
                        const smoothFactor = 0.1;
                        const smoothedRotation = ghost.previousZRotation + rotationDiff * smoothFactor;
                        ghost.previousZRotation = smoothedRotation;
                        ghost.rotation.set(Math.PI / 2, Math.PI, smoothedRotation + Math.PI / 2);
                    }
                }
            }
        });
    }
    // Public getters
    getState() {
        return this.state;
    }
    isAnimationActive() {
        return this.isAnimating;
    }
    // Render function
    render() {
        _scene__WEBPACK_IMPORTED_MODULE_1__.renderer.render(_scene__WEBPACK_IMPORTED_MODULE_1__.scene, _camera__WEBPACK_IMPORTED_MODULE_0__.camera);
    }
}
const animationSystem = new AnimationSystem();
function animate() {
    animationSystem.render();
}
function startAnimationLoop() {
    animate();
}
function initAnimationSystem() {
    (0,_camera__WEBPACK_IMPORTED_MODULE_0__.initCamera)();
    startAnimationLoop();
}


/***/ }),

/***/ "./src/camera.ts":
/*!***********************!*\
  !*** ./src/camera.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   camera: () => (/* binding */ camera),
/* harmony export */   endQuaternion: () => (/* binding */ endQuaternion),
/* harmony export */   getCameraLookAtPoint: () => (/* binding */ getCameraLookAtPoint),
/* harmony export */   initCamera: () => (/* binding */ initCamera),
/* harmony export */   setupCameraResize: () => (/* binding */ setupCameraResize),
/* harmony export */   startQuaternion: () => (/* binding */ startQuaternion)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./src/config.ts");


const camera = new three__WEBPACK_IMPORTED_MODULE_0__.PerspectiveCamera(_config__WEBPACK_IMPORTED_MODULE_1__.CAMERA_CONFIG.originalFOV, window.innerWidth / window.innerHeight, _config__WEBPACK_IMPORTED_MODULE_1__.CAMERA_CONFIG.near, _config__WEBPACK_IMPORTED_MODULE_1__.CAMERA_CONFIG.far);
function initCamera() {
    camera.position.copy(_config__WEBPACK_IMPORTED_MODULE_1__.startPosition);
    camera.lookAt(_config__WEBPACK_IMPORTED_MODULE_1__.lookAtPosition);
}
const startQuaternion = camera.quaternion.clone();
const endQuaternion = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion().setFromEuler(new three__WEBPACK_IMPORTED_MODULE_0__.Euler(-1.5708, 0, 0));
function getCameraLookAtPoint() {
    const direction = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    const lookAtPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
    lookAtPoint.copy(camera.position).add(direction.multiplyScalar(10));
    return lookAtPoint;
}
function setupCameraResize() {
    const updateCamera = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", updateCamera);
}


/***/ }),

/***/ "./src/config.ts":
/*!***********************!*\
  !*** ./src/config.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ASSETS: () => (/* binding */ ASSETS),
/* harmony export */   CAMERA_CONFIG: () => (/* binding */ CAMERA_CONFIG),
/* harmony export */   CAMERA_POSITIONS: () => (/* binding */ CAMERA_POSITIONS),
/* harmony export */   DOM_ELEMENTS: () => (/* binding */ DOM_ELEMENTS),
/* harmony export */   MAZE_CENTER: () => (/* binding */ MAZE_CENTER),
/* harmony export */   POV_POSITIONS: () => (/* binding */ POV_POSITIONS),
/* harmony export */   SELECTORS: () => (/* binding */ SELECTORS),
/* harmony export */   isMobile: () => (/* binding */ isMobile),
/* harmony export */   lookAtPosition: () => (/* binding */ lookAtPosition),
/* harmony export */   secondPosition: () => (/* binding */ secondPosition),
/* harmony export */   startPosition: () => (/* binding */ startPosition)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);

const isMobile = window.innerWidth < 768;
const CAMERA_CONFIG = {
    originalFOV: 50,
    wideFOV: 80,
    near: 0.001,
    far: 1000,
};
const ASSETS = {
    mazeTexture: "https://c-am.b-cdn.net/CAM/matcap24.png",
    mazeModel: "https://c-am.b-cdn.net/CAM/c-am-assets-3.glb",
};
const MAZE_CENTER = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45175, 0.5, 0.55675);
const POV_POSITIONS = {
    ghost1: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 0.75325),
    ghost2: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.9085, 0.55, 0.8035),
    ghost3: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 1.05475),
    ghost4: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 1.0045),
    ghost5: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.15525),
};
const CAMERA_POSITIONS = {
    startMobile: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.5, 2.5, 2.5),
    startDesktop: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-2, 2.5, 2),
    secondMobile: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.5, 2.5, 2),
    secondDesktop: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-1.5, 3, 2),
    mobileLookAt: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.5, 0.5, -1.5),
    desktopLookAt: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-1.25, 0.5, 0.25),
};
const startPosition = isMobile
    ? CAMERA_POSITIONS.startMobile
    : CAMERA_POSITIONS.startDesktop;
const secondPosition = isMobile
    ? CAMERA_POSITIONS.secondMobile
    : CAMERA_POSITIONS.secondDesktop;
const lookAtPosition = isMobile
    ? CAMERA_POSITIONS.mobileLookAt
    : CAMERA_POSITIONS.desktopLookAt;
// DOM Selectors
const SELECTORS = {
    mazeContainer: ".el--home-maze.el",
    homeSection: ".sc--home.sc",
    introSection: ".sc--intro.sc",
    povSection: ".sc--pov.sc",
    finalSection: ".sc--final.sc",
    scrollComponent: ".cmp--scroll.cmp",
    parentElements: ".cmp--pov.cmp",
    pov: ".pov",
    cam: ".cam",
    finalContainer: ".cr--final.cr",
};
// DOM Elements
const DOM_ELEMENTS = {
    mazeContainer: document.querySelector(SELECTORS.mazeContainer),
    canvas: document.querySelector("canvas"),
    finalSection: document.querySelector(SELECTORS.finalSection),
    finalContainer: document.querySelector(SELECTORS.finalContainer),
    parentElements: document.querySelectorAll(SELECTORS.parentElements),
};


/***/ }),

/***/ "./src/materials.ts":
/*!**************************!*\
  !*** ./src/materials.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   floorMaterial: () => (/* binding */ floorMaterial),
/* harmony export */   ghostCoverMaterials: () => (/* binding */ ghostCoverMaterials),
/* harmony export */   ghostMaterial: () => (/* binding */ ghostMaterial),
/* harmony export */   materialMap: () => (/* binding */ materialMap),
/* harmony export */   mazeMaterial: () => (/* binding */ mazeMaterial),
/* harmony export */   mazeTexture: () => (/* binding */ mazeTexture),
/* harmony export */   topMaterial: () => (/* binding */ topMaterial)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./src/config.ts");


const textureLoader = new three__WEBPACK_IMPORTED_MODULE_0__.TextureLoader();
const mazeTexture = textureLoader.load(_config__WEBPACK_IMPORTED_MODULE_1__.ASSETS.mazeTexture);
const mazeMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.MeshMatcapMaterial({
    matcap: mazeTexture,
});
const topMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.MeshStandardMaterial({
    color: 0xf2f9f9,
    metalness: 0.4,
    roughness: 0,
    envMapIntensity: 10,
});
const ghostMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.MeshPhysicalMaterial({
    color: 0xffffff,
    opacity: 1,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: three__WEBPACK_IMPORTED_MODULE_0__.NormalBlending,
    side: three__WEBPACK_IMPORTED_MODULE_0__.DoubleSide,
    roughness: 0.75,
    metalness: 0.2,
    transmission: 0.5,
});
const floorMaterial = new three__WEBPACK_IMPORTED_MODULE_0__.MeshStandardMaterial({
    color: 0xffffff,
    opacity: 0.8,
    transparent: true,
    roughness: 0.5,
    metalness: 0.1,
});
const pacmanMaterials = {
    blue: new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: 0x1469d3,
        transparent: true,
        opacity: 1,
    }),
    white: new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
    }),
    default: new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
        color: 0x1469d3,
        transparent: true,
        opacity: 1,
    }),
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
    default: pacmanMaterials.blue,
};
const ghostCoverMaterials = Array(5).fill(ghostMaterial);


/***/ }),

/***/ "./src/objects.ts":
/*!************************!*\
  !*** ./src/objects.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clock: () => (/* reexport safe */ _scene__WEBPACK_IMPORTED_MODULE_2__.clock),
/* harmony export */   ghosts: () => (/* binding */ ghosts),
/* harmony export */   loadModel: () => (/* binding */ loadModel),
/* harmony export */   pacman: () => (/* binding */ pacman),
/* harmony export */   pacmanMixer: () => (/* binding */ pacmanMixer)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./src/config.ts");
/* harmony import */ var _scene__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./scene */ "./src/scene.ts");
/* harmony import */ var _materials__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./materials */ "./src/materials.ts");





const loader = new three__WEBPACK_IMPORTED_MODULE_0__.GLTFLoader();
let pacmanMixer;
const pacman = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
_scene__WEBPACK_IMPORTED_MODULE_2__.scene.add(pacman);
const ghosts = {
    pacman: pacman,
    ghost1: new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry(), _materials__WEBPACK_IMPORTED_MODULE_3__.ghostMaterial),
    ghost2: new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry(), _materials__WEBPACK_IMPORTED_MODULE_3__.ghostMaterial),
    ghost3: new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry(), _materials__WEBPACK_IMPORTED_MODULE_3__.ghostMaterial),
    ghost4: new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry(), _materials__WEBPACK_IMPORTED_MODULE_3__.ghostMaterial),
    ghost5: new three__WEBPACK_IMPORTED_MODULE_0__.Mesh(new three__WEBPACK_IMPORTED_MODULE_0__.BufferGeometry(), _materials__WEBPACK_IMPORTED_MODULE_3__.ghostMaterial),
};
const ghostContainers = {
    Ghost_EUR: ghosts.ghost1,
    Ghost_CHF: ghosts.ghost2,
    Ghost_YEN: ghosts.ghost3,
    Ghost_USD: ghosts.ghost4,
    Ghost_GBP: ghosts.ghost5,
};
Object.values(ghosts).forEach((ghost) => _scene__WEBPACK_IMPORTED_MODULE_2__.scene.add(ghost));
async function loadModel() {
    return new Promise((resolve, reject) => {
        loader.load(_config__WEBPACK_IMPORTED_MODULE_1__.ASSETS.mazeModel, function (gltf) {
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.name === "CAM-Pacman") {
                    const children = [];
                    child.traverse((subChild) => {
                        if (subChild.isMesh &&
                            subChild.name !== "CAM-Pacman_Shell" &&
                            subChild.name !== "CAM-Pacman_Shell_Boolean") {
                            const material = _materials__WEBPACK_IMPORTED_MODULE_3__.materialMap[subChild.name] ||
                                _materials__WEBPACK_IMPORTED_MODULE_3__.materialMap.default;
                            subChild.material = material;
                            children.push(subChild);
                        }
                        else if (subChild.name === "CAM-Pacman_Shell" ||
                            subChild.name === "CAM-Pacman_Shell_Boolean") {
                            subChild.visible = false;
                        }
                    });
                    children.forEach((item) => ghosts.pacman.add(item));
                    ghosts.pacman.scale.set(0.05, 0.05, 0.05);
                    ghosts.pacman.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 4);
                    pacmanMixer = new three__WEBPACK_IMPORTED_MODULE_0__.AnimationMixer(ghosts.pacman);
                    const pacmanActions = {};
                    gltf.animations.forEach((clip) => {
                        const action = pacmanMixer.clipAction(clip);
                        pacmanActions[clip.name] = action;
                        action.setEffectiveWeight(1);
                        action.play();
                    });
                }
                else if (child.name &&
                    ghostContainers[child.name]) {
                    const ghostContainer = ghostContainers[child.name];
                    const ghostGroup = new three__WEBPACK_IMPORTED_MODULE_0__.Group();
                    child.rotation.z = Math.PI;
                    child.rotation.x = Math.PI / 2;
                    child.scale.set(0.75, 0.75, 0.75);
                    const children = [];
                    child.traverse((subChild) => {
                        if (subChild.isMesh) {
                            if (subChild.name && subChild.name.startsWith("Ghost_Mesh")) {
                                subChild.material = _materials__WEBPACK_IMPORTED_MODULE_3__.ghostMaterial;
                            }
                            else if (subChild.name &&
                                ["EUR", "CHF", "YEN", "USD", "GBP"].includes(subChild.name)) {
                                subChild.visible = false;
                            }
                            children.push(subChild);
                        }
                    });
                    children.forEach((item) => {
                        if (item.name &&
                            (item.name.includes("EUR") ||
                                item.name.startsWith("Ghost_Mesh"))) {
                            item.rotation.z = Math.PI;
                            item.rotation.x = Math.PI / 2;
                        }
                        else {
                            item.rotation.set(0, 0, 0);
                        }
                        ghostGroup.add(item);
                    });
                    ghostContainer.add(ghostGroup);
                }
                if (child.isMesh) {
                    if (child.name === "CAM-Arena_LowRes_Top") {
                        child.material = _materials__WEBPACK_IMPORTED_MODULE_3__.topMaterial;
                        child.castShadow = true;
                    }
                    else if (child.name === "CAM-Arena_LowRes_Bottom") {
                        child.material = _materials__WEBPACK_IMPORTED_MODULE_3__.mazeMaterial;
                        child.castShadow = true;
                    }
                    else if (child.name === "CAM-Floor") {
                        const clonedChild = child.clone();
                        child.position.y = -0.1;
                        child.position.x = 0;
                        child.position.z = 0;
                        child.material = new three__WEBPACK_IMPORTED_MODULE_0__.MeshBasicMaterial({
                            color: 0xffffff,
                            opacity: 1,
                            transparent: false,
                            depthWrite: true,
                            depthTest: true,
                            side: three__WEBPACK_IMPORTED_MODULE_0__.FrontSide,
                        });
                        child.receiveShadow = false;
                        child.castShadow = true;
                        child.scale.set(0.5, 0.5, 0.5);
                        clonedChild.material = _materials__WEBPACK_IMPORTED_MODULE_3__.floorMaterial;
                        clonedChild.position.y = -0.5;
                        clonedChild.receiveShadow = true;
                        _scene__WEBPACK_IMPORTED_MODULE_2__.scene.add(clonedChild);
                    }
                }
            });
            model.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            _scene__WEBPACK_IMPORTED_MODULE_2__.scene.add(model);
            model.position.set(0.5, 0.5, 0.5);
            resolve();
        }, function (progress) { }, function (error) {
            reject(error);
        });
    });
}


/***/ }),

/***/ "./src/pathpoints.ts":
/*!***************************!*\
  !*** ./src/pathpoints.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cameraPOVPathPoints: () => (/* binding */ cameraPOVPathPoints),
/* harmony export */   ghost1HomePathPoints: () => (/* binding */ ghost1HomePathPoints),
/* harmony export */   ghost1POVPathPoints: () => (/* binding */ ghost1POVPathPoints),
/* harmony export */   ghost2HomePathPoints: () => (/* binding */ ghost2HomePathPoints),
/* harmony export */   ghost2POVPathPoints: () => (/* binding */ ghost2POVPathPoints),
/* harmony export */   ghost3HomePathPoints: () => (/* binding */ ghost3HomePathPoints),
/* harmony export */   ghost3POVPathPoints: () => (/* binding */ ghost3POVPathPoints),
/* harmony export */   ghost4HomePathPoints: () => (/* binding */ ghost4HomePathPoints),
/* harmony export */   ghost4POVPathPoints: () => (/* binding */ ghost4POVPathPoints),
/* harmony export */   ghost5HomePathPoints: () => (/* binding */ ghost5HomePathPoints),
/* harmony export */   ghost5POVPathPoints: () => (/* binding */ ghost5POVPathPoints),
/* harmony export */   pacmanHomePathPoints: () => (/* binding */ pacmanHomePathPoints)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);

const pacmanHomePathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.1), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, -0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.398, 0.55, -0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.4015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.502),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.6025),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.8035), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.398, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.7075, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.6025), type: "straight" },
];
const ghost1HomePathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 0.502), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, -0.0005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, -0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.301), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.8035), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.15975, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.26025, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.703), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.301), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.502),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 0.6025),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.004, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.0965, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.8035), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 0.502), type: "straight" },
];
const ghost2HomePathPoints = [
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.004, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.6025), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.6025),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.502),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.4015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 0.4015),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.502), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.3055, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 1.105), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, -0.0005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.15975, 0.55, -0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 0.1), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, -0.15125),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, -0.101),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, -0.0005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.301), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.3055, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.0965, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
];
const ghost3HomePathPoints = [
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.808, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 0.703), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, -0.15125),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, -0.101),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, -0.15125),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, -0.2015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, -0.0005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, -0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.301), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.26025, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.15975, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.009, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.904), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 1.105), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.7075, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 0.6025),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.004, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.808, 0.55, 0.8035),
        type: "curve",
        curveType: "upperArc",
    },
];
const ghost4HomePathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.8035), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.398, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.398, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 0.703), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 0.4015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 0.1), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.15975, 0.55, 0.0005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.26025, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.1), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.26025, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.15975, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.6025), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.4015), type: "straight" },
];
const ghost5HomePathPoints = [
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, -0.04975),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.0005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, -0.2015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.398, 0.55, 0.0005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.34775, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.2005), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.05425, 0.55, 0.301),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.04625, 0.55, 0.4015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.4015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.24725, 0.55, 0.502),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.14675, 0.55, 0.6025), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 0.6025),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.25525, 0.55, 0.703),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.3055, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.904),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 1.105),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, 1.105), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.46125, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.36075, 0.55, -0.2015), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.15975, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, -0.101), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.1),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.2005),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, 0.1), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.85825, 0.55, -0.101),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, -0.2015),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, -0.15125),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, -0.101),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.45625, 0.55, -0.04975),
        type: "curve",
        curveType: "lowerArc",
    },
];
const cameraPOVPathPoints = [
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, -0.5, 0.45175),
        type: "curve",
        curveType: "forwardDownArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 0.6025),
        type: "curve",
        curveType: "upperArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.607, 0.55, 0.703),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.65725, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.7075, 0.55, 0.8035), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.9085, 0.55, 0.8035),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 0.85375), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 1.15525),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.9085, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.808, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 1.15525), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.75775, 0.55, 1.05475),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.7075, 0.55, 1.0045), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.205, 0.55, 1.0045),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.05475), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.15525),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.205, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.5065, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 1.306),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(-0.44825, 1, 2.0095), type: "straight" },
];
const ghost1POVPathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.703), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 0.75325),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.009, 0.55, 0.8035), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.9085, 0.55, 0.8035), type: "straight" },
];
const ghost2POVPathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.05925, 0.55, 1.2055), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1.009, 0.55, 1.2055),
        type: "curve",
        curveType: "lowerArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 1.15525), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.95875, 0.55, 1.05475), type: "straight" },
];
const ghost3POVPathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.904), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.35575, 0.55, 0.95425),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.406, 0.55, 1.0045), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.5065, 0.55, 1.0045), type: "straight" },
];
const ghost4POVPathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.105), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.15475, 0.55, 1.05475),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.205, 0.55, 1.0045), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.3055, 0.55, 1.0045), type: "straight" },
];
const ghost5POVPathPoints = [
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 1.306), type: "straight" },
    {
        pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.55, 1.25575),
        type: "curve",
        curveType: "upperArc",
    },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.5065, 0.55, 1.2055), type: "straight" },
    { pos: new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.406, 0.55, 1.2055), type: "straight" },
];


/***/ }),

/***/ "./src/paths.ts":
/*!**********************!*\
  !*** ./src/paths.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cameraHomePath: () => (/* binding */ cameraHomePath),
/* harmony export */   getPathsForSection: () => (/* binding */ getPathsForSection),
/* harmony export */   paths: () => (/* binding */ paths)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./src/config.ts");
/* harmony import */ var _pathpoints__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pathpoints */ "./src/pathpoints.ts");



const cameraHomePath = new three__WEBPACK_IMPORTED_MODULE_0__.CubicBezierCurve3(_config__WEBPACK_IMPORTED_MODULE_1__.startPosition, _config__WEBPACK_IMPORTED_MODULE_1__.secondPosition, new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 3, 0.45175), new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(0.55675, 0.5, 0.45175));
const paths = {
    pacmanHome: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.pacmanHomePathPoints),
    ghost1Home: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost1HomePathPoints),
    ghost2Home: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost2HomePathPoints),
    ghost3Home: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost3HomePathPoints),
    ghost4Home: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost4HomePathPoints),
    ghost5Home: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost5HomePathPoints),
    cameraPOV: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.cameraPOVPathPoints),
    ghost1POV: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost1POVPathPoints),
    ghost2POV: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost2POVPathPoints),
    ghost3POV: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost3POVPathPoints),
    ghost4POV: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost4POVPathPoints),
    ghost5POV: createPath(_pathpoints__WEBPACK_IMPORTED_MODULE_2__.ghost5POVPathPoints),
};
function createPath(pathPoints) {
    const path = new three__WEBPACK_IMPORTED_MODULE_0__.CurvePath();
    for (let i = 0; i < pathPoints.length - 1; i++) {
        const current = pathPoints[i];
        const next = pathPoints[i + 1];
        if (current.type === "straight") {
            const line = new three__WEBPACK_IMPORTED_MODULE_0__.LineCurve3(current.pos, next.pos);
            path.add(line);
        }
        else if (current.type === "curve") {
            let midPoint;
            if (current.curveType === "upperArc") {
                midPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(current.pos.x, current.pos.y, next.pos.z);
            }
            else if (current.curveType === "lowerArc") {
                midPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(next.pos.x, current.pos.y, current.pos.z);
            }
            else if (current.curveType === "forwardDownArc") {
                midPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(current.pos.x, next.pos.y, current.pos.z);
            }
            else {
                midPoint = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(current.pos.x, current.pos.y, next.pos.z);
            }
            const curve = new three__WEBPACK_IMPORTED_MODULE_0__.QuadraticBezierCurve3(current.pos, midPoint, next.pos);
            path.add(curve);
        }
    }
    return path;
}
function getPathsForSection(section) {
    if (section === "home") {
        return {
            pacman: paths.pacmanHome,
            ghost1: paths.ghost1Home,
            ghost2: paths.ghost2Home,
            ghost3: paths.ghost3Home,
            ghost4: paths.ghost4Home,
            ghost5: paths.ghost5Home,
        };
    }
    else if (section === "pov") {
        return {
            pacman: paths.cameraPOV,
            ghost1: paths.ghost1POV,
            ghost2: paths.ghost2POV,
            ghost3: paths.ghost3POV,
            ghost4: paths.ghost4POV,
            ghost5: paths.ghost5POV,
        };
    }
    return {};
}


/***/ }),

/***/ "./src/scene.ts":
/*!**********************!*\
  !*** ./src/scene.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clock: () => (/* binding */ clock),
/* harmony export */   initRenderer: () => (/* binding */ initRenderer),
/* harmony export */   renderer: () => (/* binding */ renderer),
/* harmony export */   scene: () => (/* binding */ scene),
/* harmony export */   setupLighting: () => (/* binding */ setupLighting)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./src/config.ts");


const scene = new three__WEBPACK_IMPORTED_MODULE_0__.Scene();
const renderer = new three__WEBPACK_IMPORTED_MODULE_0__.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp",
});
const clock = new three__WEBPACK_IMPORTED_MODULE_0__.Clock();
function enhanceAntiAliasing() {
    if (_config__WEBPACK_IMPORTED_MODULE_1__.isMobile) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    else {
        renderer.setPixelRatio(window.devicePixelRatio);
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = three__WEBPACK_IMPORTED_MODULE_0__.PCFSoftShadowMap;
}
function setPixelRatio() {
    const pixelRatio = Math.min(window.devicePixelRatio, _config__WEBPACK_IMPORTED_MODULE_1__.isMobile ? 2 : 3);
    renderer.setPixelRatio(pixelRatio);
    if (_config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer) {
        renderer.setSize(_config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer.clientWidth, _config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer.clientHeight);
    }
    else {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
function initRenderer() {
    enhanceAntiAliasing();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = three__WEBPACK_IMPORTED_MODULE_0__.PCFSoftShadowMap;
    if (_config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer) {
        console.log("Found maze container, using it for renderer");
        renderer.setSize(_config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer.clientWidth, _config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer.clientHeight);
        _config__WEBPACK_IMPORTED_MODULE_1__.DOM_ELEMENTS.mazeContainer.appendChild(renderer.domElement);
    }
    else {
        console.log("Maze container not found, using body for renderer");
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setPixelRatio);
    }
    else {
        setPixelRatio();
    }
    window.addEventListener("resize", setPixelRatio);
}
function setupLighting() {
    const ambientLight = new three__WEBPACK_IMPORTED_MODULE_0__.AmbientLight(0xffffff);
    scene.add(ambientLight);
    const directionalLight = new three__WEBPACK_IMPORTED_MODULE_0__.DirectionalLight(0xffffff, 0.8);
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
}


/***/ }),

/***/ "three":
/*!************************!*\
  !*** external "THREE" ***!
  \************************/
/***/ ((module) => {

module.exports = THREE;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _scene__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./scene */ "./src/scene.ts");
/* harmony import */ var _objects__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./objects */ "./src/objects.ts");
/* harmony import */ var _animation__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./animation */ "./src/animation.ts");



async function init() {
    try {
        (0,_scene__WEBPACK_IMPORTED_MODULE_0__.initRenderer)();
        (0,_scene__WEBPACK_IMPORTED_MODULE_0__.setupLighting)();
        await (0,_objects__WEBPACK_IMPORTED_MODULE_1__.loadModel)();
        (0,_animation__WEBPACK_IMPORTED_MODULE_2__.initAnimationSystem)();
    }
    catch (error) {
        console.error("Initialization error:", error);
    }
}
init();

})();

/******/ })()
;
//# sourceMappingURL=script.js.map