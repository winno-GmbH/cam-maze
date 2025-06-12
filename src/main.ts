import "./style.css";
import { initAnimationSystem } from "./animation-system";
import { loadModel } from "./objects";
import { setupLighting } from "./lighting";
import { setupRenderer } from "./renderer";
import {
  createMaterialControls,
  updateGhostMaterials,
  createTestGlassSphere,
  MaterialControlsType,
} from "./material-controls";
import { scene } from "./scene";

// Global variables for material testing
let materialControls: MaterialControlsType;
let testSphere: THREE.Mesh | null = null;

async function init() {
  // Setup Three.js environment
  setupRenderer();
  setupLighting();

  try {
    // Load 3D model
    await loadModel();
    console.log("✅ Model loaded successfully");

    // Initialize animation system
    initAnimationSystem();
    console.log("✅ Animation system initialized");

    // Setup material controls for development
    setupMaterialControls();
    console.log("✅ Material controls initialized");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
  }
}

// Setup material controls for testing
function setupMaterialControls() {
  // Create Leva controls
  materialControls = createMaterialControls();

  // Create test sphere for material testing (optional - can be commented out)
  // testSphere = createTestGlassSphere(scene);

  // Update materials when controls change
  const updateMaterials = () => {
    updateGhostMaterials(materialControls);

    // Also update test sphere if it exists
    if (
      testSphere &&
      testSphere.material instanceof THREE.MeshPhysicalMaterial
    ) {
      applyMaterialControls(testSphere.material, materialControls);
    }
  };

  // Setup animation loop for material updates
  function materialUpdateLoop() {
    const newControls = createMaterialControls();

    // Check if controls have changed
    if (JSON.stringify(newControls) !== JSON.stringify(materialControls)) {
      materialControls = newControls;
      updateMaterials();
    }

    requestAnimationFrame(materialUpdateLoop);
  }

  // Start material update loop
  materialUpdateLoop();
}

// Start the application
init();
