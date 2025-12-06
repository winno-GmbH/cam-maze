import * as THREE from "three";

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  memoryTotal: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

class PerformanceMonitor {
  private enabled: boolean = false;
  private statsElement: HTMLDivElement | null = null;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;
  private frameTime: number = 0;
  private renderer: THREE.WebGLRenderer | null = null;
  private throttleFactor: number = 1.0;
  private artificialDelay: number = 0;

  enable(renderer: THREE.WebGLRenderer): void {
    this.enabled = true;
    this.renderer = renderer;
    this.createStatsPanel();
    this.startMonitoring();
  }

  disable(): void {
    this.enabled = false;
    if (this.statsElement) {
      this.statsElement.remove();
      this.statsElement = null;
    }
  }

  toggle(renderer: THREE.WebGLRenderer): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable(renderer);
    }
  }

  private createStatsPanel(): void {
    if (this.statsElement) {
      return;
    }

    this.statsElement = document.createElement("div");
    this.statsElement.id = "performance-monitor";
    this.statsElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      min-width: 200px;
      line-height: 1.6;
    `;
    document.body.appendChild(this.statsElement);
  }

  private startMonitoring(): void {
    if (!this.enabled || !this.statsElement) return;

    const currentTime = performance.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.frameCount++;
    this.frameTime = delta;

    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / (delta || 1));
      this.updateStats();
    }

    requestAnimationFrame(() => this.startMonitoring());
  }

  private updateStats(): void {
    if (!this.statsElement || !this.renderer) return;

    const stats: PerformanceStats = {
      fps: this.fps,
      frameTime: Math.round(this.frameTime * 100) / 100,
      memoryUsed: 0,
      memoryTotal: 0,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };

    if ((performance as any).memory) {
      stats.memoryUsed = Math.round(
        (performance as any).memory.usedJSHeapSize / 1048576
      );
      stats.memoryTotal = Math.round(
        (performance as any).memory.totalJSHeapSize / 1048576
      );
    }

    const fpsColor = stats.fps >= 55 ? "#0f0" : stats.fps >= 30 ? "#ff0" : "#f00";
    const frameTimeColor = stats.frameTime < 16.67 ? "#0f0" : stats.frameTime < 33.33 ? "#ff0" : "#f00";

    this.statsElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #0f0; padding-bottom: 5px;">
        Performance Monitor
      </div>
      <div>FPS: <span style="color: ${fpsColor}">${stats.fps}</span></div>
      <div>Frame Time: <span style="color: ${frameTimeColor}">${stats.frameTime}ms</span></div>
      ${stats.memoryUsed > 0 ? `<div>Memory: ${stats.memoryUsed}MB / ${stats.memoryTotal}MB</div>` : ""}
      <div>Draw Calls: ${stats.drawCalls}</div>
      <div>Triangles: ${stats.triangles.toLocaleString()}</div>
      <div>Geometries: ${stats.geometries}</div>
      <div>Textures: ${stats.textures}</div>
    `;
  }

  getStats(): PerformanceStats | null {
    if (!this.renderer) return null;

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsed: (performance as any).memory
        ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
        : 0,
      memoryTotal: (performance as any).memory
        ? Math.round((performance as any).memory.totalJSHeapSize / 1048576)
        : 0,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  setThrottleFactor(factor: number): void {
    this.throttleFactor = Math.max(0.1, Math.min(10, factor));
  }

  setArtificialDelay(ms: number): void {
    this.artificialDelay = Math.max(0, ms);
  }

  simulateSlowDevice(level: "low" | "medium" | "very-low" = "medium"): void {
    switch (level) {
      case "low":
        this.setThrottleFactor(2.0);
        this.setArtificialDelay(8);
        break;
      case "medium":
        this.setThrottleFactor(3.0);
        this.setArtificialDelay(16);
        break;
      case "very-low":
        this.setThrottleFactor(5.0);
        this.setArtificialDelay(33);
        break;
    }
  }

  resetThrottle(): void {
    this.throttleFactor = 1.0;
    this.artificialDelay = 0;
  }

  getThrottleFactor(): number {
    return this.throttleFactor;
  }

  getArtificialDelay(): number {
    return this.artificialDelay;
  }
}

export const performanceMonitor = new PerformanceMonitor();

