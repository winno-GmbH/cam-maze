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
    right: 390px;
    padding: 10px 15px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10001;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  `;
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
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

  // Preserve scroll positions
  const containerScrollTop = hudContainer.scrollTop;
  const meshListScrollable = hudContainer.querySelector('[style*="overflow-y"]') as HTMLElement;
  const meshListScrollTop = meshListScrollable ? meshListScrollable.scrollTop : 0;

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

  // Restore scroll positions after DOM update
  if (containerScrollTop > 0) {
    hudContainer.scrollTop = containerScrollTop;
  }

  // Restore mesh list scroll position
  const newMeshListScrollable = hudContainer.querySelector('[style*="overflow-y"]') as HTMLElement;
  if (newMeshListScrollable && meshListScrollTop > 0) {
    newMeshListScrollable.scrollTop = meshListScrollTop;
  }

  // Attach event listeners
  attachEventListeners();
}

function attachEventListeners(): void {
  if (!hudContainer) return;

  // Quick controls
  const showAllBtn = hudContainer.querySelector("#pill-vis-all");
  const hideAllBtn = hudContainer.querySelector("#pill-hide-all");
  const resetColorsBtn = hudContainer.querySelector("#pill-reset-colors");

  showAllBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillVisibility(true);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  hideAllBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillVisibility(false);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  resetColorsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    resetPillMaterials();
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  // Shell controls
  const shellShowBtn = hudContainer.querySelector("#pill-shell-show");
  const shellHideBtn = hudContainer.querySelector("#pill-shell-hide");
  const shellRedBtn = hudContainer.querySelector("#pill-shell-red");
  const shellGreenBtn = hudContainer.querySelector("#pill-shell-green");

  shellShowBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshVisibility("shell", true);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  shellHideBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshVisibility("shell", false);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  shellRedBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshMaterialColor("shell", 0xff0000);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  shellGreenBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshMaterialColor("shell", 0x00ff00);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  // Inlay controls
  const inlayShowBtn = hudContainer.querySelector("#pill-inlay-show");
  const inlayHideBtn = hudContainer.querySelector("#pill-inlay-hide");
  const inlayOrangeBtn = hudContainer.querySelector("#pill-inlay-orange");

  inlayShowBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshVisibility("inlay", true);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  inlayHideBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshVisibility("inlay", false);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  inlayOrangeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setUserInteracting(true);
    setPillMeshMaterialColor("inlay", 0xff8800);
    setTimeout(() => {
      updateHUD();
      setUserInteracting(false);
    }, 100);
  });

  // Global color picker
  const colorPicker = hudContainer.querySelector("#pill-color-picker") as HTMLInputElement;
  const applyColorBtn = hudContainer.querySelector("#pill-apply-color");

  applyColorBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (colorPicker) {
      setUserInteracting(true);
      const color = parseInt(colorPicker.value.replace("#", ""), 16);
      setPillMaterialColor(color);
      setTimeout(() => {
        updateHUD();
        setUserInteracting(false);
      }, 100);
    }
  });

  // Individual mesh controls
  const meshToggleBtns = hudContainer.querySelectorAll(".mesh-toggle");
  meshToggleBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const name = target.getAttribute("data-name");
      if (name) {
        setUserInteracting(true);
        const info = getPillDebugInfo();
        const mesh = info.meshes.find((m) => m.name === name);
        if (mesh) {
          setPillMeshVisibility(name, !mesh.visible);
          setTimeout(() => {
            updateHUD();
            setUserInteracting(false);
          }, 100);
        }
      }
    });
  });

  const meshColorBtns = hudContainer.querySelectorAll(".mesh-color");
  meshColorBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const name = target.getAttribute("data-name");
      if (name) {
        setUserInteracting(true);
        setPillMeshMaterialColor(name, 0xff0000);
        setTimeout(() => {
          updateHUD();
          setUserInteracting(false);
        }, 100);
      }
    });
  });

  const meshColorGreenBtns = hudContainer.querySelectorAll(".mesh-color-green");
  meshColorGreenBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const name = target.getAttribute("data-name");
      if (name) {
        setUserInteracting(true);
        setPillMeshMaterialColor(name, 0x00ff00);
        setTimeout(() => {
          updateHUD();
          setUserInteracting(false);
        }, 100);
      }
    });
  });

  // Prevent scroll jumping when scrolling in mesh list area
  const scrollableArea = hudContainer.querySelector('[style*="overflow-y"]') as HTMLElement;
  if (scrollableArea) {
    let scrollTimeout: number | null = null;
    scrollableArea.addEventListener("scroll", () => {
      setUserInteracting(true);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = window.setTimeout(() => {
        setUserInteracting(false);
      }, 1000);
    });

    // Prevent clicks from causing scroll jumps
    scrollableArea.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
}

// Auto-refresh HUD periodically
let refreshInterval: number | null = null;
let isUserInteracting = false;

export function startHUDRefresh(intervalMs: number = 1000): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  refreshInterval = window.setInterval(() => {
    if (isVisible && hudContainer && !isUserInteracting) {
      updateHUD();
    }
  }, intervalMs);
}

export function setUserInteracting(value: boolean): void {
  isUserInteracting = value;
}

export function stopHUDRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

