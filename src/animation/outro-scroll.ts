import gsap from "gsap";
import { applyOutroScrollPreset, getScrollDirection } from "./scene-presets";
import {
  SCROLL_SELECTORS,
  SCRUB_DURATION,
  KEYFRAME_SCALE,
  KEYFRAME_DURATION,
  OPACITY,
} from "./constants";

let outroScrollTimeline: gsap.core.Timeline | null = null;

export function initOutroScrollAnimation() {
  outroScrollTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: SCROLL_SELECTORS.OUTRO,
      start: "top center",
      end: "bottom bottom",
      scrub: SCRUB_DURATION,
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
    ".sc_b--outro",
    { scale: KEYFRAME_SCALE.START, opacity: OPACITY.HIDDEN },
    {
      keyframes: [
        {
          scale: KEYFRAME_SCALE.START,
          opacity: OPACITY.HIDDEN,
          duration: 0,
        },
        {
          scale: KEYFRAME_SCALE.MID,
          opacity: OPACITY.FULL,
          duration: KEYFRAME_DURATION.FADE_IN,
        },
        {
          scale: KEYFRAME_SCALE.LARGE,
          opacity: OPACITY.FULL,
          duration: KEYFRAME_DURATION.HOLD,
        },
        {
          scale: KEYFRAME_SCALE.END,
          opacity: OPACITY.HIDDEN,
          duration: KEYFRAME_DURATION.FADE_OUT,
        },
      ],
    }
  );
}
