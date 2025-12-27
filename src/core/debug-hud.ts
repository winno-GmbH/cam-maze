import * as THREE from "three";
import {
  getPillDebugInfo,
  setPillVisibility,
  setPillMeshVisibility,
  setPillMaterialColor,
  setPillMeshMaterialColor,
  resetPillMaterials,
} from "./debug-pill";

let hudContainer: HTMLDivElement | null = null;
let isVisible = false;

export function createPillDebugHUD(): void {
  if (hudContainer) {
    return; // Already created
  }

  // Create container
  hudContainer = document.createElement("div");
  hudContainer.id = "pill-debug-hud";
  hudContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 20px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    z-index: 10000;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  `;

  // Toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = "Show/Hide Pill Debug";
  toggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10001;
    font-size: 14px;
  `;
  toggleBtn.addEventListener("click", () => {
    isVisible = !isVisible;
    if (hudContainer) {
      hudContainer.style.display = isVisible ? "block" : "none";
      if (isVisible) {
        updateHUD();
      }
    }
  });

  document.body.appendChild(toggleBtn);
  document.body.appendChild(hudContainer);
  hudContainer.style.display = "none";

  updateHUD();
}

function updateHUD(): void {
  if (!hudContainer) return;

  const info = getPillDebugInfo();

  hudContainer.innerHTML = `
    <h3 style="margin-top: 0; color: #4CAF50;">Pill Debug Panel</h3>
    
    <div style="margin-bottom: 15px;">
      <strong>Pill Structure:</strong><br>
      Total Groups: ${info.totalChildren}<br>
      Total Meshes: ${info.meshes.length}
    </div>

    <div style="margin-bottom: 15px;">
      <strong>Quick Controls:</strong><br>
      <button id="pill-vis-all" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Show All</button>
      <button id="pill-hide-all" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Hide All</button>
      <button id="pill-reset-colors" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Reset Colors</button>
    </div>

    <div style="margin-bottom: 15px;">
      <strong>Shell Controls:</strong><br>
      <button id="pill-shell-show" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Show Shell</button>
      <button id="pill-shell-hide" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Hide Shell</button>
      <button id="pill-shell-red" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Shell Red</button>
      <button id="pill-shell-green" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Shell Green</button>
    </div>

    <div style="margin-bottom: 15px;">
      <strong>Inlay Controls:</strong><br>
      <button id="pill-inlay-show" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Show Inlay</button>
      <button id="pill-inlay-hide" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Hide Inlay</button>
      <button id="pill-inlay-orange" style="margin: 5px 5px 5px 0; padding: 5px 10px; cursor: pointer;">Inlay Orange</button>
    </div>

    <div style="margin-bottom: 15px;">
      <strong>Global Color:</strong><br>
      <input type="color" id="pill-color-picker" value="#00ff00" style="width: 100px; height: 30px; margin-top: 5px;">
      <button id="pill-apply-color" style="margin-left: 10px; padding: 5px 10px; cursor: pointer;">Apply to All</button>
    </div>

    <div style="margin-bottom: 15px;">
      <strong>Mesh List (${info.meshes.length}):</strong><br>
      <div style="max-height: 300px; overflow-y: auto; background: rgba(255,255,255,0.1); padding: 10px; margin-top: 5px; border-radius: 4px;">
        ${info.meshes
          .map(
            (mesh, idx) => `
          <div style="margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 3px;">
            <div><strong>${idx + 1}. ${mesh.name || "unnamed"}</strong></div>
            <div style="font-size: 11px; color: #ccc;">
              Visible: <span style="color: ${mesh.visible ? "#4CAF50" : "#f44336"}">${mesh.visible}</span> | 
              Material: ${mesh.materialType} | 
              Color: ${mesh.materialColor ? "#" + mesh.materialColor.toString(16).padStart(6, "0") : "N/A"}
            </div>
            <div style="margin-top: 5px;">
              <button class="mesh-toggle" data-name="${mesh.name}" style="padding: 3px 8px; margin-right: 5px; cursor: pointer; font-size: 10px;">
                ${mesh.visible ? "Hide" : "Show"}
              </button>
              <button class="mesh-color" data-name="${mesh.name}" style="padding: 3px 8px; cursor: pointer; font-size: 10px;">
                Set Red
              </button>
              <button class="mesh-color-green" data-name="${mesh.name}" style="padding: 3px 8px; cursor: pointer; font-size: 10px;">
                Set Green
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // Attach event listeners
  attachEventListeners();
}

function attachEventListeners(): void {
  if (!hudContainer) return;

  // Quick controls
  const showAllBtn = hudContainer.querySelector("#pill-vis-all");
  const hideAllBtn = hudContainer.querySelector("#pill-hide-all");
  const resetColorsBtn = hudContainer.querySelector("#pill-reset-colors");

  showAllBtn?.addEventListener("click", () => {
    setPillVisibility(true);
    updateHUD();
  });

  hideAllBtn?.addEventListener("click", () => {
    setPillVisibility(false);
    updateHUD();
  });

  resetColorsBtn?.addEventListener("click", () => {
    resetPillMaterials();
    updateHUD();
  });

  // Shell controls
  const shellShowBtn = hudContainer.querySelector("#pill-shell-show");
  const shellHideBtn = hudContainer.querySelector("#pill-shell-hide");
  const shellRedBtn = hudContainer.querySelector("#pill-shell-red");
  const shellGreenBtn = hudContainer.querySelector("#pill-shell-green");

  shellShowBtn?.addEventListener("click", () => {
    setPillMeshVisibility("shell", true);
    updateHUD();
  });

  shellHideBtn?.addEventListener("click", () => {
    setPillMeshVisibility("shell", false);
    updateHUD();
  });

  shellRedBtn?.addEventListener("click", () => {
    setPillMeshMaterialColor("shell", 0xff0000);
    updateHUD();
  });

  shellGreenBtn?.addEventListener("click", () => {
    setPillMeshMaterialColor("shell", 0x00ff00);
    updateHUD();
  });

  // Inlay controls
  const inlayShowBtn = hudContainer.querySelector("#pill-inlay-show");
  const inlayHideBtn = hudContainer.querySelector("#pill-inlay-hide");
  const inlayOrangeBtn = hudContainer.querySelector("#pill-inlay-orange");

  inlayShowBtn?.addEventListener("click", () => {
    setPillMeshVisibility("inlay", true);
    updateHUD();
  });

  inlayHideBtn?.addEventListener("click", () => {
    setPillMeshVisibility("inlay", false);
    updateHUD();
  });

  inlayOrangeBtn?.addEventListener("click", () => {
    setPillMeshMaterialColor("inlay", 0xff8800);
    updateHUD();
  });

  // Global color picker
  const colorPicker = hudContainer.querySelector("#pill-color-picker") as HTMLInputElement;
  const applyColorBtn = hudContainer.querySelector("#pill-apply-color");

  applyColorBtn?.addEventListener("click", () => {
    if (colorPicker) {
      const color = parseInt(colorPicker.value.replace("#", ""), 16);
      setPillMaterialColor(color);
      updateHUD();
    }
  });

  // Individual mesh controls
  const meshToggleBtns = hudContainer.querySelectorAll(".mesh-toggle");
  meshToggleBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const name = target.getAttribute("data-name");
      if (name) {
        const info = getPillDebugInfo();
        const mesh = info.meshes.find((m) => m.name === name);
        if (mesh) {
          setPillMeshVisibility(name, !mesh.visible);
          updateHUD();
        }
      }
    });
  });

  const meshColorBtns = hudContainer.querySelectorAll(".mesh-color");
  meshColorBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const name = target.getAttribute("data-name");
      if (name) {
        setPillMeshMaterialColor(name, 0xff0000);
        updateHUD();
      }
    });
  });

  const meshColorGreenBtns = hudContainer.querySelectorAll(".mesh-color-green");
  meshColorGreenBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const name = target.getAttribute("data-name");
      if (name) {
        setPillMeshMaterialColor(name, 0x00ff00);
        updateHUD();
      }
    });
  });
}

// Auto-refresh HUD periodically
let refreshInterval: number | null = null;

export function startHUDRefresh(intervalMs: number = 500): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  refreshInterval = window.setInterval(() => {
    if (isVisible && hudContainer) {
      updateHUD();
    }
  }, intervalMs);
}

export function stopHUDRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

