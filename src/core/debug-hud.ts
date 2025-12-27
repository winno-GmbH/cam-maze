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
    background: rgba(20, 20, 20, 0.95);
    color: #e0e0e0;
    padding: 20px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 10000;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
    border: 2px solid #4CAF50;
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
    <h3 style="margin-top: 0; color: #4CAF50; font-size: 16px; text-shadow: 0 0 5px rgba(76, 175, 80, 0.5);">Pill Debug Panel</h3>
    
    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <strong style="color: #ffffff;">Pill Structure:</strong><br>
      Total Groups: <span style="color: #4CAF50;">${info.totalChildren}</span><br>
      Total Meshes: <span style="color: #4CAF50;">${info.meshes.length}</span>
    </div>

    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <strong style="color: #ffffff;">Quick Controls:</strong><br>
      <button id="pill-vis-all" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; font-weight: bold;">Show All</button>
      <button id="pill-hide-all" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; font-weight: bold;">Hide All</button>
      <button id="pill-reset-colors" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 4px; font-weight: bold;">Reset Colors</button>
    </div>

    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <strong style="color: #ffffff;">Shell Controls:</strong><br>
      <button id="pill-shell-show" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; font-weight: bold;">Show Shell</button>
      <button id="pill-shell-hide" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; font-weight: bold;">Hide Shell</button>
      <button id="pill-shell-red" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; font-weight: bold;">Shell Red</button>
      <button id="pill-shell-green" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; font-weight: bold;">Shell Green</button>
    </div>

    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <strong style="color: #ffffff;">Inlay Controls:</strong><br>
      <button id="pill-inlay-show" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; font-weight: bold;">Show Inlay</button>
      <button id="pill-inlay-hide" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; font-weight: bold;">Hide Inlay</button>
      <button id="pill-inlay-orange" style="margin: 5px 5px 5px 0; padding: 6px 12px; cursor: pointer; background: #ff9800; color: white; border: none; border-radius: 4px; font-weight: bold;">Inlay Orange</button>
    </div>

    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <strong style="color: #ffffff;">Global Color:</strong><br>
      <input type="color" id="pill-color-picker" value="#00ff00" style="width: 100px; height: 35px; margin-top: 5px; border: 2px solid #4CAF50; border-radius: 4px; cursor: pointer;">
      <button id="pill-apply-color" style="margin-left: 10px; padding: 6px 12px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 4px; font-weight: bold;">Apply to All</button>
    </div>

    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <strong style="color: #ffffff;">Mesh List (${info.meshes.length}):</strong><br>
      <div style="max-height: 300px; overflow-y: auto; background: rgba(255,255,255,0.08); padding: 10px; margin-top: 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
        ${info.meshes
          .map(
            (mesh, idx) => `
          <div style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 3px; border: 1px solid rgba(255,255,255,0.15);">
            <div style="color: #ffffff; font-weight: bold; margin-bottom: 5px;">${idx + 1}. ${mesh.name || "unnamed"}</div>
            <div style="font-size: 12px; color: #d0d0d0; line-height: 1.6;">
              Visible: <span style="color: ${mesh.visible ? "#4CAF50" : "#f44336"}; font-weight: bold;">${mesh.visible}</span> | 
              Material: <span style="color: #FFD700;">${mesh.materialType}</span> | 
              Color: <span style="color: ${mesh.materialColor ? "#" + mesh.materialColor.toString(16).padStart(6, "0") : "#999"}; font-weight: bold;">${mesh.materialColor ? "#" + mesh.materialColor.toString(16).padStart(6, "0").toUpperCase() : "N/A"}</span>
            </div>
            <div style="margin-top: 8px;">
              <button class="mesh-toggle" data-name="${mesh.name}" style="padding: 4px 10px; margin-right: 5px; cursor: pointer; font-size: 11px; background: ${mesh.visible ? "#f44336" : "#4CAF50"}; color: white; border: none; border-radius: 3px; font-weight: bold;">
                ${mesh.visible ? "Hide" : "Show"}
              </button>
              <button class="mesh-color" data-name="${mesh.name}" style="padding: 4px 10px; margin-right: 5px; cursor: pointer; font-size: 11px; background: #f44336; color: white; border: none; border-radius: 3px; font-weight: bold;">
                Set Red
              </button>
              <button class="mesh-color-green" data-name="${mesh.name}" style="padding: 4px 10px; cursor: pointer; font-size: 11px; background: #4CAF50; color: white; border: none; border-radius: 3px; font-weight: bold;">
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

