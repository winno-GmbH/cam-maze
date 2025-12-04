declare const gsap: {
  registerPlugin: (plugin: any) => void;
  set: (target: any, vars: any) => any;
  to: (target: any, vars: any) => any;
  fromTo: (target: any, fromVars: any, toVars: any) => any;
  timeline: (vars?: any) => any;
  killTweensOf: (target: any) => void;
};

declare const ScrollTrigger: any;

declare namespace THREE {
  class GLTFLoader {
    constructor();
    load(
      url: string,
      onLoad: (gltf: any) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
}
