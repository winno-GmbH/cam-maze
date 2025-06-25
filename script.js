/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

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
/* harmony import */ var _objects__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./objects */ "./src/objects.ts");

async function init() {
    try {
        await (0,_objects__WEBPACK_IMPORTED_MODULE_0__.loadModel)();
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