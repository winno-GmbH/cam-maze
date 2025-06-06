import { initRenderer, setupLighting, renderer, scene } from './scene';
import { initCamera, setupCameraResize, camera } from './camera';
import { loadModel } from './objects';
import { initEventHandlers, animationState } from './events';
import { initGsap, animate } from './animations';

// Main Application Class
class CAMApplication {
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      console.log('Initializing CAM 3D Animation...');

      // Initialize core systems
      this.initCore();

      // Load 3D assets
      await this.loadAssets();

      // Setup animations and interactions
      this.setupAnimations();

      // Start the application immediately
      this.start();

      this.initialized = true;
      console.log('CAM 3D Animation initialized successfully');

    } catch (error) {
      console.error('Failed to initialize CAM 3D Animation:', error);
      // Still start animation loop even if model fails to load
      this.startBasicAnimation();
    }
  }

  private initCore(): void {
    // Initialize renderer and scene
    initRenderer();
    setupLighting();

    // Initialize camera
    initCamera();
    setupCameraResize();

    // Setup event handlers
    initEventHandlers();
  }

  private async loadAssets(): Promise<void> {
    console.log('Loading 3D assets...');
    await loadModel();
    console.log('3D assets loaded successfully');
  }

  private setupAnimations(): void {
    console.log('Setting up animations...');
    
    // Initialize GSAP animations with a delay to ensure DOM is ready
    setTimeout(() => {
      initGsap();
    }, 200);
  }

  private start(): void {
    console.log('Starting animation loop...');
    
    // Start the main animation loop immediately
    this.startBasicAnimation();
    
    // Set initial animation state
    animationState.animationRunning = window.scrollY === 0;
  }

  private startBasicAnimation(): void {
    // Start animation loop immediately like in original
    animate();
    animationState.animationRunning = window.scrollY === 0;
    
    // Render the initial frame
    renderer.render(scene, camera);
  }

  public getInitializationStatus(): boolean {
    return this.initialized;
  }

  public restart(): void {
    if (this.initialized) {
      animationState.animationRunning = true;
      animate();
    }
  }

  public pause(): void {
    animationState.animationRunning = false;
  }

  public resume(): void {
    animationState.animationRunning = true;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new CAMApplication();
  
  // Expose app instance to global scope for debugging
  (window as any).CAMApp = app;
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM still loading, wait for DOMContentLoaded
} else {
  // DOM already loaded
  const app = new CAMApplication();
  (window as any).CAMApp = app;
}

/* Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    animationState.animationRunning = false;
  } else {
    animationState.animationRunning = window.scrollY === 0;
  }
});
*/

// Export for external use
export { CAMApplication };