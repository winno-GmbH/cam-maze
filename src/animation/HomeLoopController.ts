import * as THREE from "three";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
gsap.registerPlugin(MotionPathPlugin);
import { scene, clock } from "../core/scene";
import { pacman, ghosts, pacmanMixer } from "../core/objects";
import { paths } from "../paths/paths";

export class HomeLoopController {
  private isActive: boolean = false;
  private pacmanTimeline: any = null;
  private ghostTimelines: any[] = [];
  private animationId: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log("🏠 HomeLoopController initialized");
  }

  public start(): void {
    if (this.isActive) {
      console.log("🏠 Home Loop is already running");
      return;
    }

    console.log("🏠 Starting Home Loop animation");
    this.isActive = true;

    // Start Pacman animation
    this.startPacmanAnimation();

    // Start ghost animations
    this.startGhostAnimations();

    // Start the render loop
    this.startRenderLoop();
  }

  public stop(): void {
    if (!this.isActive) {
      console.log("🏠 Home Loop is not running");
      return;
    }

    console.log("🏠 Stopping Home Loop animation");
    this.isActive = false;

    // Stop Pacman animation
    if (this.pacmanTimeline) {
      this.pacmanTimeline.kill();
      this.pacmanTimeline = null;
    }

    // Stop ghost animations
    this.ghostTimelines.forEach((timeline) => timeline.kill());
    this.ghostTimelines = [];

    // Stop render loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private startPacmanAnimation(): void {
    // Create a repeating timeline for Pacman's home path
    this.pacmanTimeline = gsap.timeline({ repeat: -1 });

    // Convert Three.js CurvePath to points for GSAP motionPath
    const pathPoints = this.convertCurvePathToPoints(paths.pacmanHome);

    // Animate Pacman along the home path
    this.pacmanTimeline.to(pacman.position, {
      duration: 8,
      ease: "power2.inOut",
      motionPath: {
        path: pathPoints,
        alignOrigin: [0.5, 0.5, 0.5],
        autoRotate: true,
        useRadians: true,
      },
    });
  }

  private startGhostAnimations(): void {
    const ghostKeys = ["ghost1", "ghost2", "ghost3", "ghost4", "ghost5"];
    const ghostPaths = [
      paths.ghost1Home,
      paths.ghost2Home,
      paths.ghost3Home,
      paths.ghost4Home,
      paths.ghost5Home,
    ];

    ghostKeys.forEach((ghostKey, index) => {
      const ghost = ghosts[ghostKey as keyof typeof ghosts];
      if (ghost && ghostPaths[index]) {
        const timeline = gsap.timeline({ repeat: -1 });

        // Convert Three.js CurvePath to points for GSAP motionPath
        const pathPoints = this.convertCurvePathToPoints(ghostPaths[index]);

        // Stagger the ghost animations
        timeline.to(ghost.position, {
          duration: 10 + index * 2, // Different durations for variety
          ease: "power2.inOut",
          motionPath: {
            path: pathPoints,
            alignOrigin: [0.5, 0.5, 0.5],
            autoRotate: true,
            useRadians: true,
          },
        });

        this.ghostTimelines.push(timeline);
      }
    });
  }

  private convertCurvePathToPoints(
    curvePath: THREE.CurvePath<THREE.Vector3>
  ): { x: number; y: number; z: number }[] {
    const points: { x: number; y: number; z: number }[] = [];
    const divisions = 100; // Number of points to generate

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      const point = curvePath.getPointAt(t);
      points.push({
        x: point.x,
        y: point.y,
        z: point.z,
      });
    }

    return points;
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (!this.isActive) return;

      // Update Pacman animation mixer
      if (pacmanMixer) {
        const delta = clock.getDelta();
        pacmanMixer.update(delta);
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  public update(): void {
    // This method can be called from the main render loop
    // to ensure animations are updated every frame
    if (this.isActive && pacmanMixer) {
      const delta = clock.getDelta();
      pacmanMixer.update(delta);
    }
  }

  public isRunning(): boolean {
    return this.isActive;
  }
}
