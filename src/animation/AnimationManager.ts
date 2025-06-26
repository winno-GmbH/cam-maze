import { HomeLoopController } from "./HomeLoopController";

export class AnimationManager {
  private homeLoopController: HomeLoopController;
  private currentAnimation: string | null = null;

  constructor() {
    this.homeLoopController = new HomeLoopController();
    console.log("🎬 AnimationManager initialized");
  }

  public startHomeLoop(): void {
    console.log("🎬 Starting Home Loop animation");
    this.stopCurrentAnimation();
    this.homeLoopController.start();
    this.currentAnimation = "homeLoop";
  }

  public stopHomeLoop(): void {
    console.log("🎬 Stopping Home Loop animation");
    this.homeLoopController.stop();
    if (this.currentAnimation === "homeLoop") {
      this.currentAnimation = null;
    }
  }

  private stopCurrentAnimation(): void {
    if (this.currentAnimation === "homeLoop") {
      this.homeLoopController.stop();
    }
    // Add other animation stops here as we implement them
    this.currentAnimation = null;
  }

  public update(): void {
    // Update current animation
    if (this.currentAnimation === "homeLoop") {
      this.homeLoopController.update();
    }
  }

  public getCurrentAnimation(): string | null {
    return this.currentAnimation;
  }

  public isHomeLoopRunning(): boolean {
    return this.homeLoopController.isRunning();
  }
}
