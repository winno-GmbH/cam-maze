/**
 * ANIMATION CONSTANTS
 * 
 * Centralized constants to avoid magic numbers and improve maintainability.
 * All scale, opacity, and color values used across animations should be defined here.
 */

// ============================================================================
// SCALE CONSTANTS
// ============================================================================
export const SCALE = {
  PACMAN_HOME: 0.05, // Original model size for pacman in home scene
  PACMAN_INTRO: 0.1, // Pacman scale in intro scene
  GHOST_NORMAL: 1.0, // Normal ghost scale
  GHOST_POV: 0.5, // Ghost scale in POV scene
} as const;

// ============================================================================
// OPACITY CONSTANTS
// ============================================================================
export const OPACITY = {
  FULL: 1.0,
  HIDDEN: 0.0,
} as const;

// ============================================================================
// COLOR CONSTANTS
// ============================================================================
export const COLOR = {
  WHITE: 0xffffff,
} as const;

// ============================================================================
// SCROLL TRIGGER SELECTORS
// ============================================================================
// These should match the selectors in config/dom-elements.ts
export const SCROLL_SELECTORS = {
  HOME: ".sc--home.sc",
  INTRO: ".sc--intro.sc",
  POV: ".sc--pov.sc",
  OUTRO: ".sc--outro.sc",
} as const;

// ============================================================================
// ANIMATION TIMING CONSTANTS
// ============================================================================
export const TANGENT_SMOOTHING = {
  HOME_LOOP: 0.06,
  POV: 0.08,
} as const;

export const PARAMETER_SMOOTHING_FACTOR = 0.1;
export const GHOST_FADE_THRESHOLD = 0.9;
export const GHOST_FADE_OUT_DURATION = 0.1; // Last 10% of progress

// ============================================================================
// INTRO SCROLL CONSTANTS
// ============================================================================
export const INTRO_WALK_DISTANCE = 10.0;
export const INTRO_FADE_IN_DURATION = 0.2; // Fade in over 20% of progress
export const INTRO_BEHIND_OFFSET_STEP = -0.5;
export const INTRO_BASE_X_OFFSET = -5.0;
export const INTRO_POSITION_OFFSET = {
  x: 4.3,
  y: -2.0,
  z: 0.0,
} as const;

// ============================================================================
// PATH FINDING CONSTANTS
// ============================================================================
export const FIND_CLOSEST_SAMPLES = 800; // Default samples for findClosestProgressOnPath

