import * as THREE from "three";
import { camera } from "./camera";

let hudContainer: HTMLDivElement | null = null;
let rotationXSlider: HTMLInputElement | null = null;
let rotationYSlider: HTMLInputElement | null = null;
let rotationZSlider: HTMLInputElement | null = null;

export function createCameraRotationHUD(): void {
  // Remove existing HUD if it exists
  if (hudContainer) {
    hudContainer.remove();
  }

  // Create HUD container
  hudContainer = document.createElement("div");
  hudContainer.style.position = "fixed";
  hudContainer.style.top = "20px";
  hudContainer.style.right = "20px";
  hudContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  hudContainer.style.padding = "20px";
  hudContainer.style.borderRadius = "8px";
  hudContainer.style.color = "white";
  hudContainer.style.fontFamily = "monospace";
  hudContainer.style.zIndex = "10000";
  hudContainer.style.minWidth = "300px";

  // Title
  const title = document.createElement("h3");
  title.textContent = "Camera Rotation";
  title.style.margin = "0 0 15px 0";
  title.style.fontSize = "16px";
  hudContainer.appendChild(title);

  // Helper function to create slider
  const createSlider = (
    label: string,
    min: number,
    max: number,
    value: number,
    step: number = 0.1
  ): HTMLInputElement => {
    const container = document.createElement("div");
    container.style.marginBottom = "15px";

    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}: `;
    labelEl.style.display = "block";
    labelEl.style.marginBottom = "5px";
    container.appendChild(labelEl);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = step.toString();
    slider.style.width = "100%";
    container.appendChild(slider);

    const valueDisplay = document.createElement("span");
    valueDisplay.textContent = value.toFixed(2);
    valueDisplay.style.marginLeft = "10px";
    valueDisplay.style.color = "#4CAF50";
    container.appendChild(valueDisplay);

    slider.addEventListener("input", () => {
      const val = parseFloat(slider.value);
      valueDisplay.textContent = val.toFixed(2);
      updateCameraRotation();
    });

    hudContainer!.appendChild(container);
    return slider;
  };

  // Get current camera rotation in degrees
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion);
  const currentX = (euler.x * 180) / Math.PI;
  const currentY = (euler.y * 180) / Math.PI;
  const currentZ = (euler.z * 180) / Math.PI;

  // Create sliders
  rotationXSlider = createSlider("X Rotation", -180, 180, currentX);
  rotationYSlider = createSlider("Y Rotation", -180, 180, currentY);
  rotationZSlider = createSlider("Z Rotation", -180, 180, currentZ);

  // Update function
  function updateCameraRotation(): void {
    if (!rotationXSlider || !rotationYSlider || !rotationZSlider) return;

    const xDeg = parseFloat(rotationXSlider.value);
    const yDeg = parseFloat(rotationYSlider.value);
    const zDeg = parseFloat(rotationZSlider.value);

    const euler = new THREE.Euler(
      (xDeg * Math.PI) / 180,
      (yDeg * Math.PI) / 180,
      (zDeg * Math.PI) / 180,
      "XYZ"
    );

    camera.rotation.copy(euler);
    camera.updateProjectionMatrix();
  }

  // Add to document
  document.body.appendChild(hudContainer);
}

export function removeCameraRotationHUD(): void {
  if (hudContainer) {
    hudContainer.remove();
    hudContainer = null;
    rotationXSlider = null;
    rotationYSlider = null;
    rotationZSlider = null;
  }
}

