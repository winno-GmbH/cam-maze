// Export the main animation controller
export { animationController } from "./AnimationController";

// Export animation state management functions
export {
  startScrollAnimation,
  returnToHomeLoop,
  pauseAnimations,
  resumeAnimations,
} from "./AnimationController";

// Export types
export type { AnimationState } from "./AnimationController";

// Export HomeLoop functions (for direct access if needed)
export { updateHomeLoop, startHomeLoop, stopHomeLoop } from "./HomeLoop";
