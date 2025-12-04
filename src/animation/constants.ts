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

