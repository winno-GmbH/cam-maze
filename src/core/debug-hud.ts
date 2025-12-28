import * as THREE from "three";
import { pill } from "./objects";

// Global variable to store Y rotation in degrees
let pillYRotationDegrees = 20;

export function getPillYRotationDegrees(): number {
  return pillYRotationDegrees;
}

function applyPillRotation(): void {
  if (!pill) return;
  
  // Set rotation: X=1.571 (90°), Y from slider, Z=180° (π)
  const targetEuler = new THREE.Euler(
    1.571, // X: 90 degrees (π/2)
    (pillYRotationDegrees * Math.PI) / 180, // Y: from HUD slider
    (180 * Math.PI) / 180, // Z: 180 degrees (π)
    "XYZ"
  );
  pill.rotation.copy(targetEuler);
}

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
    width: 300px;
    background: rgba(20, 20, 20, 0.95);
    color: #e0e0e0;
    padding: 20px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
    border: 2px solid #4CAF50;
  `;

  // Toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = "Show/Hide Pill Rotation";
  toggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 340px;
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
    }
  });

  document.body.appendChild(toggleBtn);
  document.body.appendChild(hudContainer);
  hudContainer.style.display = "none";

  updateHUD();
  // Apply initial rotation
  applyPillRotation();
}

function updateHUD(): void {
  if (!hudContainer) return;

  hudContainer.innerHTML = `
    <h3 style="margin-top: 0; color: #4CAF50; font-size: 16px; text-shadow: 0 0 5px rgba(76, 175, 80, 0.5);">Pill Y Rotation</h3>
    
    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <label for="pill-y-rotation-slider" style="display: block; margin-bottom: 10px;">
        <strong style="color: #ffffff;">Y Rotation (degrees):</strong>
        <span id="pill-y-rotation-value" style="color: #4CAF50; margin-left: 10px; font-weight: bold;">${pillYRotationDegrees}</span>°
      </label>
      <input 
        type="range" 
        id="pill-y-rotation-slider" 
        min="0" 
        max="360" 
        value="${pillYRotationDegrees}"
        step="1"
        style="width: 100%; height: 8px; border-radius: 5px; outline: none; background: #333; cursor: pointer;"
      />
    </div>
  `;

  // Attach event listener
  const slider = hudContainer.querySelector("#pill-y-rotation-slider") as HTMLInputElement;
  const valueDisplay = hudContainer.querySelector("#pill-y-rotation-value");
  
  if (slider) {
    slider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      pillYRotationDegrees = parseFloat(target.value);
      if (valueDisplay) {
        valueDisplay.textContent = `${pillYRotationDegrees}°`;
      }
      // Apply rotation immediately when slider changes
      applyPillRotation();
    });
  }
}

// Auto-refresh HUD periodically (disabled since we don't need it for slider)
let refreshInterval: number | null = null;

export function startHUDRefresh(intervalMs: number = 1000): void {
  // No longer needed for slider, but keeping function signature for compatibility
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
}

export function stopHUDRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
