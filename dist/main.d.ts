declare class CAMApplication {
    private initialized;
    constructor();
    private init;
    private initCore;
    private loadAssets;
    private setupAnimations;
    private start;
    private startBasicAnimation;
    getInitializationStatus(): boolean;
    restart(): void;
    pause(): void;
    resume(): void;
}
export { CAMApplication };
