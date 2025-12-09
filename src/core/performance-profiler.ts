interface ProfileEntry {
  name: string;
  totalTime: number;
  callCount: number;
  maxTime: number;
  minTime: number;
}

class PerformanceProfiler {
  private profiles: Map<string, ProfileEntry> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private enabled: boolean = true;
  private reportInterval: number = 5000;
  private lastReportTime: number = 0;
  private displayElement: HTMLDivElement | null = null;

  constructor() {
    this.lastReportTime = performance.now();
    if (typeof window !== "undefined") {
      (window as any).enableProfiler = () => this.enable();
      (window as any).disableProfiler = () => this.disable();
      (window as any).resetProfiler = () => this.reset();
      (window as any).getProfilerStats = () => this.getStats();
    }
  }

  enable(): void {
    this.enabled = true;
    this.createDisplay();
    console.log("Performance Profiler enabled");
  }

  disable(): void {
    this.enabled = false;
    if (this.displayElement) {
      this.displayElement.remove();
      this.displayElement = null;
    }
    console.log("Performance Profiler disabled");
  }

  start(name: string): void {
    if (!this.enabled) return;
    this.activeTimers.set(name, performance.now());
  }

  end(name: string): void {
    if (!this.enabled) return;
    const startTime = this.activeTimers.get(name);
    if (startTime === undefined) return;

    const duration = performance.now() - startTime;
    this.activeTimers.delete(name);

    let entry = this.profiles.get(name);
    if (!entry) {
      entry = {
        name,
        totalTime: 0,
        callCount: 0,
        maxTime: 0,
        minTime: Infinity,
      };
      this.profiles.set(name, entry);
    }

    entry.totalTime += duration;
    entry.callCount++;
    entry.maxTime = Math.max(entry.maxTime, duration);
    entry.minTime = Math.min(entry.minTime, duration);

    const now = performance.now();
    if (now - this.lastReportTime >= this.reportInterval) {
      this.report();
      this.lastReportTime = now;
    }
  }

  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  private report(): void {
    const entries = Array.from(this.profiles.values())
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 20);

    console.group("🔍 Performance Profiler Report");
    console.table(
      entries.map((entry) => ({
        Name: entry.name,
        "Total Time (ms)": entry.totalTime.toFixed(2),
        Calls: entry.callCount,
        "Avg Time (ms)": (entry.totalTime / entry.callCount).toFixed(3),
        "Max Time (ms)": entry.maxTime.toFixed(3),
        "Min Time (ms)": entry.minTime.toFixed(3),
        "% of Total": (
          (entry.totalTime / this.getTotalTime()) *
          100
        ).toFixed(1),
      }))
    );
    console.groupEnd();

    this.updateDisplay(entries);
  }

  private getTotalTime(): number {
    return Array.from(this.profiles.values()).reduce(
      (sum, entry) => sum + entry.totalTime,
      0
    );
  }

  private createDisplay(): void {
    if (this.displayElement) return;

    this.displayElement = document.createElement("div");
    this.displayElement.id = "performance-profiler-display";
    this.displayElement.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 5px;
      max-width: 500px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 10000;
      border: 2px solid #0f0;
    `;
    document.body.appendChild(this.displayElement);
  }

  private updateDisplay(entries: ProfileEntry[]): void {
    if (!this.displayElement) return;

    const totalTime = this.getTotalTime();
    const html = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #0ff;">
        Performance Profiler (Last 5s)
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #0f0;">
            <th style="text-align: left; padding: 4px;">Name</th>
            <th style="text-align: right; padding: 4px;">Avg (ms)</th>
            <th style="text-align: right; padding: 4px;">Total (ms)</th>
            <th style="text-align: right; padding: 4px;">%</th>
            <th style="text-align: right; padding: 4px;">Calls</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (entry) => `
            <tr style="border-bottom: 1px solid #333;">
              <td style="padding: 2px;">${entry.name}</td>
              <td style="text-align: right; padding: 2px; color: ${
                entry.totalTime / entry.callCount > 5 ? "#f00" : "#0f0"
              }">
                ${(entry.totalTime / entry.callCount).toFixed(2)}
              </td>
              <td style="text-align: right; padding: 2px;">
                ${entry.totalTime.toFixed(1)}
              </td>
              <td style="text-align: right; padding: 2px; color: ${
                (entry.totalTime / totalTime) * 100 > 10 ? "#ff0" : "#0f0"
              }">
                ${((entry.totalTime / totalTime) * 100).toFixed(1)}%
              </td>
              <td style="text-align: right; padding: 2px;">
                ${entry.callCount}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      <div style="margin-top: 10px; font-size: 10px; color: #888;">
        Total: ${totalTime.toFixed(1)}ms | 
        <button onclick="window.disableProfiler()" style="background: #f00; color: #fff; border: none; padding: 2px 6px; cursor: pointer; border-radius: 3px;">Disable</button>
        <button onclick="window.resetProfiler()" style="background: #ff0; color: #000; border: none; padding: 2px 6px; cursor: pointer; border-radius: 3px; margin-left: 5px;">Reset</button>
      </div>
    `;
    this.displayElement.innerHTML = html;
  }

  reset(): void {
    this.profiles.clear();
    this.activeTimers.clear();
    this.lastReportTime = performance.now();
    if (this.displayElement) {
      this.displayElement.innerHTML = "<div>Profiler reset. Waiting for data...</div>";
    }
    console.log("Performance Profiler reset");
  }

  getStats(): Record<string, any> {
    const entries = Array.from(this.profiles.values());
    return {
      totalTime: this.getTotalTime(),
      entries: entries.map((entry) => ({
        name: entry.name,
        totalTime: entry.totalTime,
        callCount: entry.callCount,
        avgTime: entry.totalTime / entry.callCount,
        maxTime: entry.maxTime,
        minTime: entry.minTime,
        percentage: (entry.totalTime / this.getTotalTime()) * 100,
      })),
    };
  }
}

export const performanceProfiler = new PerformanceProfiler();

