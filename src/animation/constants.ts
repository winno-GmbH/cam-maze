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

// ============================================================================
// ANIMATION TIMING CONSTANTS
// ============================================================================
export const SCRUB_DURATION = 0.5; // Default scrub duration for GSAP ScrollTrigger
export const STAGGER_AMOUNT = 0.15; // Stagger amount as fraction of timeline (15%)
export const ROTATION_TRANSITION_DURATION = 1.5; // Seconds to transition from laying down to upright

// ============================================================================
// POV SCROLL CONSTANTS
// ============================================================================
export const POV_SEQUENCE_PHASE_END = 0.05; // First 5% of camera path
export const POV_TRANSITION_PHASE_END = 0.07; // Next 2% of camera path (total 7%)
export const POV_Y_CONSTRAINT_THRESHOLD = 0.15; // Constrain Y component for first 15% of path
export const OPACITY_VISIBILITY_THRESHOLD = 0.01; // Threshold for element visibility (opacity > 0.01)

// ============================================================================
// KEYFRAME ANIMATION CONSTANTS
// ============================================================================
export const KEYFRAME_SCALE = {
  START: 0.5,
  MID: 0.8,
  LARGE: 1.2,
  END: 1.5,
} as const;

export const KEYFRAME_DURATION = {
  FADE_IN: 0.3,
  HOLD: 0.4,
  FADE_OUT: 0.3,
} as const;

// ============================================================================
// INTRO SCROLL GHOST OFFSETS
// ============================================================================
export const INTRO_GHOST_OFFSETS = {
  GHOST1: -0.5,
  GHOST2: -1.0,
  GHOST3: -1.5,
  GHOST4: -2.0,
  GHOST5: -2.5,
} as const;

