let introScrollTimeline: gsap.core.Timeline | null = null;

export function initIntroScrollAnimation() {
  introScrollTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".sc--intro",
      start: "top center",
      end: "bottom bottom",
      scrub: 0.5,
    }
  }).fromTo(
    ".sc_h--intro", { scale: 0.5, opacity: 0 },
    {
      keyframes: [
        { scale: 0.5, opacity: 0, duration: 0 },
        { scale: 0.8, opacity: 1, duration: 0.3 },
        { scale: 1.2, opacity: 1, duration: 0.4 },
        { scale: 1.5, opacity: 0, duration: 0.3 }
      ]
    }
  ).fromTo(
    ".sc_b--intro", { scale: 0.5, opacity: 0 },
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