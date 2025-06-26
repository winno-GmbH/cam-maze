import { updateHomeLoop, startHomeLoop, stopHomeLoop } from "./HomeLoop";

export type AnimationState = "home" | "scroll" | "transition";

class AnimationController {
  private currentState: AnimationState = "home";
  private isActive = true;

  constructor() {
    this.startHomeLoop();
  }

  public startHomeLoop() {
    this.currentState = "home";
    startHomeLoop();
  }

  public startScrollAnimation() {
    this.currentState = "scroll";
    stopHomeLoop();
    // TODO: Start scroll-based animations
    console.log("Starting scroll animation");
  }

  public pauseAllAnimations() {
    this.isActive = false;
    stopHomeLoop();
  }

  public resumeAnimations() {
    this.isActive = true;
    if (this.currentState === "home") {
      startHomeLoop();
    }
  }

  public update() {
    if (!this.isActive) return;

    switch (this.currentState) {
      case "home":
        updateHomeLoop();
        break;
      case "scroll":
        // TODO: Update scroll animations
        break;
      case "transition":
        // TODO: Handle transition animations
        break;
    }
  }

  public getCurrentState(): AnimationState {
    return this.currentState;
  }

  public isHomeLoopActive(): boolean {
    return this.currentState === "home";
  }
}

// Export singleton instance
export const animationController = new AnimationController();

// Export functions for external use
export function startScrollAnimation() {
  animationController.startScrollAnimation();
}

export function returnToHomeLoop() {
  animationController.startHomeLoop();
}

export function pauseAnimations() {
  animationController.pauseAllAnimations();
}

export function resumeAnimations() {
  animationController.resumeAnimations();
}
