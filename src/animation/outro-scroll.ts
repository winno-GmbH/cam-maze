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
  outroScrollTimeline = gsap
    .timeline({
      scrollTrigger: {
        trigger: SCROLL_SELECTORS.OUTRO,
        start: "top center",
        end: "bottom bottom",
        scrub: SCRUB_DURATION,
        markers: false,
        onEnter: () => {
          const scrollDir = getScrollDirection();
          applyOutroScrollPreset(true, scrollDir);
        },
        onEnterBack: () => {
          const scrollDir = getScrollDirection();
          applyOutroScrollPreset(true, scrollDir);
        },
      },
    })
    .addLabel("outro-text-start", 0)
    .fromTo(
      ".sc_b--outro",
      { scale: KEYFRAME_SCALE.START, opacity: OPACITY.HIDDEN },
      {
        keyframes: [
          {
            scale: KEYFRAME_SCALE.START,
            opacity: OPACITY.HIDDEN,
            duration: KEYFRAME_DURATION.NONE,
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
    )
    .addLabel("outro-text-fade-in", KEYFRAME_DURATION.NONE)
    .addLabel(
      "outro-text-hold",
      KEYFRAME_DURATION.NONE + KEYFRAME_DURATION.FADE_IN
    )
    .addLabel(
      "outro-text-fade-out",
      KEYFRAME_DURATION.NONE +
        KEYFRAME_DURATION.FADE_IN +
        KEYFRAME_DURATION.HOLD
    )
    .addLabel(
      "outro-text-end",
      KEYFRAME_DURATION.NONE +
        KEYFRAME_DURATION.FADE_IN +
        KEYFRAME_DURATION.HOLD +
        KEYFRAME_DURATION.FADE_OUT
    );
}
