import * as THREE from "three";
import ScrollTrigger from "gsap/ScrollTrigger";
import { pill } from "./objects";

// Global variable to store Y rotation in degrees
let pillYRotationDegrees = 20;

export function getPillYRotationDegrees(): number {
  return pillYRotationDegrees;
}

// Global variables to store Pacman rotation offsets in degrees (for home-scroll animation)
let pacmanRotationX = 0;
let pacmanRotationY = 90; // Default +90 degrees on Y-axis
let pacmanRotationZ = 0;

export function getPacmanRotationOffsets(): { x: number; y: number; z: number } {
  return { x: pacmanRotationX, y: pacmanRotationY, z: pacmanRotationZ };
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

let pacmanHudContainer: HTMLDivElement | null = null;
let isPacmanHudVisible = false;

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

export function createPacmanRotationHUD(): void {
  if (pacmanHudContainer) {
    return; // Already created
  }

  // Create container
  pacmanHudContainer = document.createElement("div");
  pacmanHudContainer.id = "pacman-rotation-hud";
  pacmanHudContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 320px;
    background: rgba(20, 20, 20, 0.95);
    color: #e0e0e0;
    padding: 20px;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
    border: 2px solid #FFD700;
    max-height: 90vh;
    overflow-y: auto;
  `;

  // Toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = "Show/Hide Pacman Rotation";
  toggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    left: 360px;
    padding: 10px 15px;
    background: #FFD700;
    color: #000;
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
    isPacmanHudVisible = !isPacmanHudVisible;
    if (pacmanHudContainer) {
      pacmanHudContainer.style.display = isPacmanHudVisible ? "block" : "none";
    }
  });

  document.body.appendChild(toggleBtn);
  document.body.appendChild(pacmanHudContainer);
  pacmanHudContainer.style.display = "none";

  updatePacmanHUD();
}

function updatePacmanHUD(): void {
  if (!pacmanHudContainer) return;

  pacmanHudContainer.innerHTML = `
    <h3 style="margin-top: 0; color: #FFD700; font-size: 16px; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);">Pacman Rotation (Home-Scroll)</h3>
    
    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <label for="pacman-x-rotation-slider" style="display: block; margin-bottom: 10px;">
        <strong style="color: #ffffff;">X Rotation (degrees):</strong>
        <span id="pacman-x-rotation-value" style="color: #FFD700; margin-left: 10px; font-weight: bold;">${pacmanRotationX}</span>°
      </label>
      <input 
        type="range" 
        id="pacman-x-rotation-slider" 
        min="-180" 
        max="180" 
        value="${pacmanRotationX}"
        step="1"
        style="width: 100%; height: 8px; border-radius: 5px; outline: none; background: #333; cursor: pointer;"
      />
    </div>
    
    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <label for="pacman-y-rotation-slider" style="display: block; margin-bottom: 10px;">
        <strong style="color: #ffffff;">Y Rotation (degrees):</strong>
        <span id="pacman-y-rotation-value" style="color: #FFD700; margin-left: 10px; font-weight: bold;">${pacmanRotationY}</span>°
      </label>
      <input 
        type="range" 
        id="pacman-y-rotation-slider" 
        min="-180" 
        max="180" 
        value="${pacmanRotationY}"
        step="1"
        style="width: 100%; height: 8px; border-radius: 5px; outline: none; background: #333; cursor: pointer;"
      />
    </div>
    
    <div style="margin-bottom: 15px; color: #e0e0e0;">
      <label for="pacman-z-rotation-slider" style="display: block; margin-bottom: 10px;">
        <strong style="color: #ffffff;">Z Rotation (degrees):</strong>
        <span id="pacman-z-rotation-value" style="color: #FFD700; margin-left: 10px; font-weight: bold;">${pacmanRotationZ}</span>°
      </label>
      <input 
        type="range" 
        id="pacman-z-rotation-slider" 
        min="-180" 
        max="180" 
        value="${pacmanRotationZ}"
        step="1"
        style="width: 100%; height: 8px; border-radius: 5px; outline: none; background: #333; cursor: pointer;"
      />
    </div>
    
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444; color: #aaa; font-size: 11px;">
      <p style="margin: 0;">These values adjust the end rotation of Pacman in the home-scroll animation. Changes are applied instantly.</p>
    </div>
  `;

  // Attach event listeners
  const xSlider = pacmanHudContainer.querySelector("#pacman-x-rotation-slider") as HTMLInputElement;
  const ySlider = pacmanHudContainer.querySelector("#pacman-y-rotation-slider") as HTMLInputElement;
  const zSlider = pacmanHudContainer.querySelector("#pacman-z-rotation-slider") as HTMLInputElement;
  const xValueDisplay = pacmanHudContainer.querySelector("#pacman-x-rotation-value");
  const yValueDisplay = pacmanHudContainer.querySelector("#pacman-y-rotation-value");
  const zValueDisplay = pacmanHudContainer.querySelector("#pacman-z-rotation-value");
  
  if (xSlider) {
    xSlider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      pacmanRotationX = parseFloat(target.value);
      if (xValueDisplay) {
        xValueDisplay.textContent = `${pacmanRotationX}°`;
      }
      // Recreate home-scroll animation to apply new end rotation
      // Only if home-scroll is currently active
      const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
      if (homeScrollTrigger?.isActive) {
        const { initHomeScrollAnimation } = require("../animation/home-scroll");
        initHomeScrollAnimation();
      }
    });
  }
  
  if (ySlider) {
    ySlider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      pacmanRotationY = parseFloat(target.value);
      if (yValueDisplay) {
        yValueDisplay.textContent = `${pacmanRotationY}°`;
      }
      // Recreate home-scroll animation to apply new end rotation
      // Only if home-scroll is currently active
      const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
      if (homeScrollTrigger?.isActive) {
        const { initHomeScrollAnimation } = require("../animation/home-scroll");
        initHomeScrollAnimation();
      }
    });
  }
  
  if (zSlider) {
    zSlider.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      pacmanRotationZ = parseFloat(target.value);
      if (zValueDisplay) {
        zValueDisplay.textContent = `${pacmanRotationZ}°`;
      }
      // Recreate home-scroll animation to apply new end rotation
      // Only if home-scroll is currently active
      const homeScrollTrigger = ScrollTrigger.getById("homeScroll");
      if (homeScrollTrigger?.isActive) {
        const { initHomeScrollAnimation } = require("../animation/home-scroll");
        initHomeScrollAnimation();
      }
    });
  }
}
