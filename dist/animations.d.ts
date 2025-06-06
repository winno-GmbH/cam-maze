import { TriggerPosition } from './types';
export declare const triggerPositions: {
    [key: string]: TriggerPosition;
};
export declare function setupScrollIndicator(): void;
export declare function setupIntroHeader(): void;
export declare function initIntro(): void;
export declare function initCameraHome(): void;
export declare function initEndScreen(): void;
export declare function setupPovTimeline(): void;
export declare function initPovAnimations(): void;
export declare function handleAnimationStart(): void;
export declare function handleAnimationUpdate(this: any): void;
export declare function handleLeavePOV(): void;
export declare function resetState(isReverse?: boolean): void;
export declare function animate(): void;
export declare function initGsap(): void;
