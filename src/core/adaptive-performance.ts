class AdaptivePerformance {
  private frameCount = 0;
  private lastFpsCheck = 0;
  private currentFps = 60;
  private updateInterval = 1;
  private frameSkipCounter = 0;
  private readonly targetFps = 60;
  private readonly minFps = 15;
  private readonly maxUpdateInterval = 4;

  update(): boolean {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsCheck >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = now;

      if (this.currentFps < this.minFps) {
        this.updateInterval = Math.min(
          this.maxUpdateInterval,
          Math.ceil(this.targetFps / this.currentFps)
        );
      } else if (this.currentFps >= this.targetFps * 0.9) {
        this.updateInterval = 1;
      } else {
        this.updateInterval = Math.max(
          1,
          Math.ceil(this.targetFps / this.currentFps)
        );
      }
    }

    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.updateInterval) {
      this.frameSkipCounter = 0;
      return true;
    }

    return false;
  }

  getCurrentFps(): number {
    return this.currentFps;
  }

  getUpdateInterval(): number {
    return this.updateInterval;
  }

  shouldSkipFrame(): boolean {
    return this.frameSkipCounter !== 0;
  }

  reset(): void {
    this.frameCount = 0;
    this.lastFpsCheck = performance.now();
    this.currentFps = 60;
    this.updateInterval = 1;
    this.frameSkipCounter = 0;
  }
}

export const adaptivePerformance = new AdaptivePerformance();

