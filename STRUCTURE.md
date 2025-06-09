# 🏗️ CAM 3D Animation Project Structure

## 📁 **File Organization**

### **Core System Files**

- `main.ts` - Entry point, initializes all systems
- `config.ts` - Global configuration, constants, and settings
- `types.ts` - TypeScript type definitions
- `utils.ts` - Utility functions (smoothStep, etc.)

### **3D Scene Management**

- `scene.ts` - Three.js scene, renderer, lighting setup
- `camera.ts` - Camera initialization and controls
- `objects.ts` - 3D model loading, ghost objects, pacman
- `materials.ts` - Three.js materials and textures
- `paths.ts` - Path definitions for ghost movements

### **Animation Systems**

- `animation-system.ts` - **Main animation loop** (home state only)
- `scroll-animations.ts` - **Scroll-based ghost/camera animations**
- `intro-animations.ts` - **Intro text scroll animations**

---

## 🔄 **System Flow**

### **1. Initialization** (`main.ts`)

```
Scene Setup → Camera → Model Loading → Animation System
```

### **2. Animation System** (`animation-system.ts`)

- **Responsibility**: Home state ghost movements only
- **Keeps running**: Basic pacman/ghost path animations
- **Delegates**: Scroll handling to other systems

### **3. Scroll System** (`scroll-animations.ts`)

- **Responsibility**: .sc--home scroll handling
- **Manages**: Ghost bezier curves, camera paths, state management
- **Triggers**: When user scrolls through home section

### **4. Intro System** (`intro-animations.ts`)

- **Responsibility**: .sc--intro text animations
- **Manages**: Header and body text scale/opacity animations
- **Triggers**: When user scrolls through intro section

---

## ✨ **Key Improvements**

### **Before Cleanup:**

- ❌ **Single 757-line file** (animation-system.ts)
- ❌ **Duplicate functions** (smoothStep, MAZE_CENTER)
- ❌ **Mixed responsibilities** (home + scroll + intro)
- ❌ **Hard to maintain**

### **After Cleanup:**

- ✅ **Modular structure** - each file has single responsibility
- ✅ **No duplicates** - shared utilities in utils.ts, config.ts
- ✅ **Clear separation** - home animations vs scroll vs intro
- ✅ **Easy to maintain** - find bugs quickly, extend features

---

## 🎯 **Module Responsibilities**

| Module                 | Purpose                    | Exports                                                  |
| ---------------------- | -------------------------- | -------------------------------------------------------- |
| `animation-system.ts`  | Home state animations only | `initAnimationSystem()`, `animationLoop()`               |
| `scroll-animations.ts` | Scroll-based ghost/camera  | `initScrollSystem()`, `handleScroll()`, bezier functions |
| `intro-animations.ts`  | Intro text animations      | `initIntroAnimations()`, `handleIntroScroll()`           |
| `config.ts`            | Constants & settings       | `MAZE_CENTER`, `CAMERA_CONFIG`, etc.                     |
| `utils.ts`             | Shared utilities           | `smoothStep()`, path utilities                           |

---

## 🚀 **Usage**

The main entry point (`main.ts`) handles initialization:

```typescript
// Initializes everything - scene, camera, models, animations
async function init() {
  initRenderer();
  setupLighting();
  initCamera();
  await loadModel();
  initAnimationSystem(); // This sets up all subsystems
}
```

**Animation System automatically initializes:**

- ✅ Home animations (animation-system.ts)
- ✅ Scroll system (scroll-animations.ts)
- ✅ Intro animations (intro-animations.ts)

---

## 🔧 **Adding New Features**

### **New Home Animation:**

→ Edit `animation-system.ts`

### **New Scroll Behavior:**

→ Edit `scroll-animations.ts`

### **New Text Animation:**

→ Edit `intro-animations.ts`

### **New Global Setting:**

→ Edit `config.ts`

This modular structure makes the codebase **scalable**, **maintainable**, and **easy to debug**! 🎉
