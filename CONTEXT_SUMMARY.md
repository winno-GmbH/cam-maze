# Home Scroll Animation - Context Summary

## Overview

The `home-scroll.ts` file implements a scroll-triggered animation where objects (ghosts and pacman) animate from their current positions to a center position while rotating to a "lay down" orientation and fading out (opacity 1.0 → 0.0). The camera also animates along a predefined path.

## Key Architecture Decisions

### 1. Material Cloning (Critical)

**Problem**: Materials are shared between objects:

- All ghosts share `ghostMaterial` (from `materials.ts`)
- Pacman shares materials from `materialMap` (from `materials.ts`)

**Solution**: Materials are cloned when creating animations so each object has its own material instance. This allows independent opacity animation per object.

**Implementation**:

- Materials are cloned in `createObjectAnimations()` before creating animations
- Current opacity is preserved from original materials before cloning
- Cloned materials replace original materials on meshes

### 2. Individual Animations with Manual Stagger

**Approach**: Each object gets its own `fromTo` animation with manual position calculation on the timeline.

**Stagger Logic**:

- `staggerAmount = 0.15` (15% of timeline)
- Each object starts at: `staggerPosition = index * (staggerAmount / totalObjects)`
- This creates sequential animation where objects animate one after another

### 3. Path-Based Position Animation

- Objects animate along `THREE.CurvePath` paths created by `getHomeScrollPaths(startPositions)`
- Animation uses `progress` value (0 → 1) to calculate position: `path.getPointAt(progress)`
- Each object has its own unique path from current position to center

### 4. Timeline Management

**Critical Order**:

1. `createObjectAnimations()` - Clears timeline, creates object animations
2. `createCameraAnimation()` - Adds camera animation at position 0

**Why**: `createObjectAnimations()` calls `homeScrollTimeline.clear()`, which removes all animations. Camera animation must be added AFTER to avoid being cleared.

### 5. Opacity Animation

- Opacity is read from materials BEFORE cloning (preserves current state)
- Animation starts from current opacity (not always 1.0) to avoid visual jumps
- Opacity animates from current value → 0.0
- Materials are updated directly in `onUpdate` by traversing the object each frame

## Animation Properties

Each object animates:

- **Position**: Along a `THREE.CurvePath` (progress: 0 → 1)
- **Rotation**: From current rotation → laydown rotation (LAY_DOWN_QUAT_1 or LAY_DOWN_QUAT_2)
- **Opacity**: From current opacity → 0.0

## Key Functions

### `createObjectAnimations()`

1. Clears timeline
2. Kills existing GSAP tweens
3. Creates paths for each object
4. For each object:
   - Gets current opacity from original materials
   - Clones materials (preserving opacity)
   - Creates animation props with current rotation and opacity
   - Creates individual `fromTo` animation with stagger position

### `createCameraAnimation()`

1. Creates camera path from `getCameraHomeScrollPathPoints()`
2. Animates camera position along path
3. Animates camera lookAt along a bezier curve
4. Starts at timeline position 0 (parallel to object animations)

## ScrollTrigger Events

### `onEnter` / `onEnterBack`

1. Gets current positions from objects
2. Gets current rotations from `getCurrentRotations()`
3. Applies `applyHomeScrollPreset()` to set initial state
4. Updates `startPositions` with preset positions
5. Recreates animations with fresh FROM values

### `onScrubComplete`

- Calls `homeLoopHandler()` to resume home-loop animation

## Important Notes

1. **Material Cloning**: Essential for independent opacity animation. Without cloning, all objects sharing a material would animate opacity simultaneously.

2. **Opacity Preservation**: Current opacity is read BEFORE cloning to preserve visual state and avoid jumps.

3. **Timeline Order**: Camera animation must be created AFTER object animations to avoid being cleared.

4. **Path Creation**: Paths are created fresh each time based on `startPositions`, which are updated when entering the scroll section.

5. **Direct Material Updates**: In `onUpdate`, materials are accessed directly from objects via `traverse()` to ensure we're updating the correct (cloned) materials.

## Dependencies

- `getHomeScrollPaths()` - Creates paths for objects
- `getCameraHomeScrollPathPoints()` - Creates camera path points
- `applyHomeScrollPreset()` - Sets initial object state
- `getCurrentRotations()` - Gets current object rotations
- `updateObjectRotation()` - Updates rotation state
- `LAY_DOWN_QUAT_1` / `LAY_DOWN_QUAT_2` - Target rotation quaternions

## Removed/Unused Code

The following were removed as they're no longer needed:

- `startOpacities` - Opacity is now read directly from materials
- `characterSpeeds` - Not used in current implementation
- Debug `console.log` statements
