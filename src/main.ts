import { loadModel } from "./objects";

async function init() {
  try {
    await loadModel();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
