# CAM 3D Animation - TypeScript Project

This project contains a sophisticated 3D animation system built with Three.js and GSAP, converted from JavaScript to TypeScript for better maintainability and type safety.

## 🚨 CRITICAL SETUP REQUIREMENTS

### Required External Scripts

Your HTML **MUST** include these scripts in this exact order:

```html
<!-- THREE.js Core -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r157/three.min.js"></script>

<!-- GLTFLoader (REQUIRED for 3D model loading) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.157.0/examples/js/loaders/GLTFLoader.js"></script>

<!-- GSAP with ScrollTrigger -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/ScrollTrigger.min.js"></script>

<!-- Your compiled script -->
<script src="script.js"></script>
```

### Required DOM Structure

Your HTML must include these elements:

- `.el--home-maze.el` - Container for the 3D scene
- `.sc--intro`, `.sc--home`, `.sc--pov`, `.sc--final` - Section containers
- `.cmp--pov.cmp` - POV component containers (5 total)
- `.cmp--pov-cam` - CAM text containers inside POV components

**See `example.html` for a complete working example.**

## Project Structure

```
/
├── src/
│   ├── main.ts           # Main application entry point
│   ├── types.ts          # TypeScript type definitions
│   ├── config.ts         # Configuration constants
│   ├── materials.ts      # Three.js materials
│   ├── paths.ts          # Animation paths (shortened)
│   ├── scene.ts          # Scene and renderer setup
│   ├── camera.ts         # Camera management
│   ├── objects.ts        # 3D object loading and management
│   ├── animations.ts     # GSAP animations and timeline
│   ├── events.ts         # Event handlers
│   ├── utils.ts          # Utility functions
│   └── declarations.d.ts # External library type declarations
├── example.html          # Complete working example
├── package.json          # Dependencies and scripts
├── webpack.config.js     # Webpack configuration
├── tsconfig.json         # TypeScript configuration
└── script.js            # Compiled output (generated)
```

## Setup Instructions

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Compile TypeScript to JavaScript:**

   ```bash
   npm run compile
   ```

3. **For development with auto-compilation:**

   ```bash
   npm run dev
   ```

4. **Use the example HTML:**
   - Copy `example.html` as your starting point
   - Or ensure your HTML has all required external scripts and DOM elements

## 🔧 Troubleshooting

### "Nothing is visible" Issue

This is usually caused by:

1. **Missing GLTFLoader script** - The most common issue
2. **Missing DOM elements** - Check that all required CSS classes exist
3. **External scripts not loading** - Check browser console for 404 errors
4. **Script loading order** - External scripts must load before `script.js`

### Debug Commands

```javascript
// Check app status
CAMApp.getInitializationStatus();
```

## Important Notes

### Path Definitions

The path definitions in `src/paths.ts` have been shortened to save space. Each path array shows only the first point with a comment indicating where to add the remaining points. You'll need to add the complete path data from the original script.

### Graceful Degradation

The application will continue to work even if:

- GLTFLoader is not available (skips 3D model loading)
- GSAP is not available (skips scroll animations)
- Some DOM elements are missing (logs warnings but continues)

## Features

- **Modular Architecture**: Clean separation of concerns across multiple TypeScript modules
- **Type Safety**: Full TypeScript typing for better development experience
- **Error Resilience**: Graceful fallbacks when external dependencies are missing
- **Hot Reloading**: Development mode with automatic recompilation
- **Optimized Build**: Production-ready webpack configuration
- **3D Animation**: Complex Three.js animations with GSAP integration
- **Scroll-based Interactions**: ScrollTrigger-based timeline animations

## Development

- **Compile once**: `npm run compile`
- **Watch mode**: `npm run dev`
- **Build**: `npm run build` (alias for compile)

## Browser Compatibility

This project uses modern JavaScript features and requires:

- ES2020 support
- WebGL support for Three.js
- Modern browser with CSS Grid and Flexbox support

## Performance Notes

- Uses optimized Three.js rendering with shadow mapping
- Implements efficient path interpolation
- Mobile-optimized pixel ratios
- Debounced scroll handling for smooth performance
- Graceful degradation when 3D models fail to load
