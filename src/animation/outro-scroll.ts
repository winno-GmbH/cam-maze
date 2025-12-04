import gsap from "gsap";
import { applyOutroScrollPreset, getScrollDirection } from "./scene-presets";
import { SCROLL_SELECTORS } from "./constants";

let outroScrollTimeline: gsap.core.Timeline | null = null;

export function initOutroScrollAnimation() {
  outroScrollTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: SCROLL_SELECTORS.OUTRO,
      start: "top center",
      end: "bottom bottom",
      scrub: 0.5,
      onEnter: () => {
        const scrollDir = getScrollDirection();
        applyOutroScrollPreset(true, scrollDir);
      },
      onEnterBack: () => {
        const scrollDir = getScrollDirection();
        applyOutroScrollPreset(true, scrollDir);
      },
    }
  }).fromTo(
    ".sc_b--outro", { scale: 0.5, opacity: 0 },
    {
      keyframes: [
        { scale: 0.5, opacity: 0, duration: 0 },
        { scale: 0.8, opacity: 1, duration: 0.3 },
        { scale: 1.2, opacity: 1, duration: 0.4 },
        { scale: 1.5, opacity: 0, duration: 0.3 }
      ]
    }
  );
}