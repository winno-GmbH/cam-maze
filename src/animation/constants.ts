export const SCALE = {
  PACMAN_HOME: 0.05,
  PACMAN_INTRO: 0.1,
  GHOST_NORMAL: 1.0,
  GHOST_INTRO: 1.5,
  GHOST_POV: 0.5,
} as const;

export const OPACITY = {
  FULL: 1.0,
  HIDDEN: 0.0,
} as const;

export const SCROLL_SELECTORS = {
  HOME: ".sc--home.sc",
  INTRO: ".sc--intro.sc",
  POV: ".sc--pov.sc",
  OUTRO: ".sc--outro.sc",
} as const;

export const TANGENT_SMOOTHING = {
  HOME_LOOP: 0.06,
  POV: 0.08,
} as const;

export const PARAMETER_SMOOTHING_FACTOR = 0.1;
export const GHOST_FADE_THRESHOLD = 0.9;
export const GHOST_FADE_OUT_DURATION = 0.1;

export const INTRO_WALK_DISTANCE = 10.0;
export const INTRO_FADE_IN_DURATION = 0.2;
export const INTRO_POSITION_OFFSET = {
  x: 4.3,
  y: -2.0,
  z: 0.0,
} as const;

export const FIND_CLOSEST_SAMPLES = 800;

export const SCRUB_DURATION = 0.5;
export const STAGGER_AMOUNT = 0.15;
export const ROTATION_TRANSITION_DURATION = 1.5;

export const POV_SEQUENCE_PHASE_END = 0.05;
export const POV_TRANSITION_PHASE_END = 0.07;
export const POV_Y_CONSTRAINT_THRESHOLD = 0.15;
export const OPACITY_VISIBILITY_THRESHOLD = 0.01;

export const KEYFRAME_SCALE = {
  START: 0.5,
  MID: 0.8,
  LARGE: 1.2,
  END: 1.5,
} as const;

export const KEYFRAME_DURATION = {
  NONE: 0,
  FADE_IN: 0.3,
  HOLD: 0.4,
  FADE_OUT: 0.3,
} as const;

export const PACMAN_MOUTH_SPEED = {
  INTRO: 4.0,
  NORMAL: 1.0,
} as const;

export const INTRO_EDGE_OFFSET = {
  PERCENTAGE: 0.25,
  MIN: 2.0,
} as const;

export const INTRO_OBJECT_ROTATIONS = {
  PILL: { x: 90, y: 20, z: 180 },
} as const;

export const INTRO_OBJECT_ANIMATION_OFFSETS = {
  PACMAN: {
    behindOffset: 1.5,
    zOffset: 0.5,
    xOffset: 0,
    yOffset: 0,
    zPhase: 0,
  },
  GHOST1: {
    behindOffset: 0.0,
    zOffset: 0.5,
    xOffset: 0.5,
    yOffset: -0.5,
    zPhase: Math.PI * 1.0,
  },
  GHOST2: {
    behindOffset: -0.005,
    zOffset: 0.5,
    xOffset: 0,
    yOffset: -1,
    zPhase: Math.PI * 1.5,
  },
  GHOST3: {
    behindOffset: -0.01,
    zOffset: 0.5,
    xOffset: 0.5,
    yOffset: 0.5,
    zPhase: Math.PI * 1.0,
  },
  GHOST4: {
    behindOffset: -0.015,
    zOffset: 0.5,
    xOffset: 0.75,
    yOffset: 0.25,
    zPhase: Math.PI * 1.0,
  },
  GHOST5: {
    behindOffset: -0.02,
    zOffset: 0.5,
    xOffset: 0,
    yOffset: -0.5,
    zPhase: Math.PI * 1.0,
  },
  PILL: {
    behindOffset: 1 - INTRO_POSITION_OFFSET.x,
    zOffset: 1.1 - INTRO_POSITION_OFFSET.z,
    xOffset: 0,
    yOffset: -1.5 - INTRO_POSITION_OFFSET.y,
    zPhase: 0,
  },
} as const;

export const INTRO_GHOST_BOUNCE = {
  FREQUENCY: 5,
  AMPLITUDE: 0.01,
  Y_MULTIPLIER: 1.5,
} as const;

export function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}
