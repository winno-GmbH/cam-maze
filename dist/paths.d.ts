import * as THREE from 'three';
import { PathPoint, PathData, PathMapping } from './types';
export declare function createPath(pathPoints: PathPoint[]): THREE.CurvePath<THREE.Vector3>;
export declare const cameraHomePath: THREE.CubicBezierCurve3;
export declare const pathsData: {
    [key: string]: PathData;
};
export declare function getPathsForSection(section: string): PathMapping;
export declare const paths: {
    [key: string]: THREE.CurvePath<THREE.Vector3>;
};
