import { loadModel } from "./objects";

async function init() {
  console.log("🚀 Starting application initialization...");

  try {
    await loadModel();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

init();
