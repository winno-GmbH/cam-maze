// Intro animations for the intro section
// Extracted from old animation-system.ts and adapted for current structure

import { DOM_ELEMENTS } from "./selectors";

let isHeaderAnimating = false;
let isBodyAnimating = false;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateIntroHeaderDirect(directProgress: number) {
  const introHeader = DOM_ELEMENTS.introHeader;
  if (!introHeader) {
    return;
  }

  // Header animation: directProgress goes from 0-1 for the full header animation
  let scale = 0;
  let opacity = 0;

  if (directProgress > 0 && directProgress < 1) {
    if (directProgress <= 0.2) {
      // 0% - 20%: scale 0->0.8, opacity 0->1
      const keyframeProgress = directProgress / 0.2;
      const easedProgress = easeInOutCubic(keyframeProgress);
      scale = easedProgress * 0.8;
      opacity = easedProgress; // 0.0 -> 1.0
    } else if (directProgress <= 0.8) {
      // 20% - 80%: scale 0.8->1.2, opacity stays 1
      const keyframeProgress = (directProgress - 0.2) / 0.6;
      scale = 0.8 + keyframeProgress * 0.4; // 0.8 -> 1.2
      opacity = 1;
    } else {
      // 80% - 100%: scale 1.2->1.5, opacity 1->0
      const keyframeProgress = (directProgress - 0.8) / 0.2;
      scale = 1.2 + keyframeProgress * 0.3; // 1.2 -> 1.5
      opacity = 1 - keyframeProgress; // 1 -> 0.0
    }
  } else if (directProgress >= 1) {
    // Header finished
    scale = 1.5;
    opacity = 0;
  } else {
    // Header not started
    scale = 0;
    opacity = 0;
  }

  // Update transform and opacity
  introHeader.style.setProperty("transform", `scale(${scale})`, "important");
  introHeader.style.opacity = opacity.toString();
}

function animateIntroBodyDirect(directProgress: number) {
  const introBody = DOM_ELEMENTS.introBody;
  if (!introBody) {
    return;
  }

  // Body animation: directProgress goes from 0-1 for the full body animation
  let scale = 0.5;
  let opacity = 0;

  if (directProgress > 0 && directProgress < 1) {
    if (directProgress <= 0.2) {
      // 0% - 20%: scale 0.5->0.8, opacity 0->1
      const keyframeProgress = directProgress / 0.2;
      const easedProgress = easeInOutCubic(keyframeProgress);
      scale = 0.5 + easedProgress * 0.3; // 0.5 -> 0.8
      opacity = easedProgress; // 0.0 -> 1.0
    } else if (directProgress <= 0.8) {
      // 20% - 80%: scale 0.8->1.2, opacity stays 1
      const keyframeProgress = (directProgress - 0.2) / 0.6;
      scale = 0.8 + keyframeProgress * 0.4; // 0.8 -> 1.2
      opacity = 1;
    } else {
      // 80% - 100%: scale 1.2->1.5, opacity 1->0
      const keyframeProgress = (directProgress - 0.8) / 0.2;
      scale = 1.2 + keyframeProgress * 0.3; // 1.2 -> 1.5
      opacity = 1 - keyframeProgress; // 1 -> 0.0
    }
  } else if (directProgress >= 1) {
    // Body finished
    scale = 1.5;
    opacity = 0;
  } else {
    // Body not started yet
    scale = 0.5;
    opacity = 0;
  }

  // Update transform and opacity
  introBody.style.setProperty("transform", `scale(${scale})`, "important");
  introBody.style.opacity = opacity.toString();
}

async function setupGSAPIntroAnimations() {
  try {
    // Dynamic import GSAP with validation
    const gsapModule = await import("gsap");
    const scrollTriggerModule = await import("gsap/ScrollTrigger");

    const gsap = gsapModule.gsap || gsapModule.default;
    const ScrollTrigger =
      scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;

    if (!gsap || !ScrollTrigger) {
      throw new Error("GSAP modules not loaded properly");
    }

    gsap.registerPlugin(ScrollTrigger);

    // Configure GSAP for smooth performance
    gsap.config({
      force3D: true, // Hardware acceleration
      nullTargetWarn: false,
      autoSleep: 60, // Keep animations responsive
    });

    // Optimize ScrollTrigger for smooth performance
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
      limitCallbacks: true,
    });

    console.log("🎬 Setting up GSAP intro animations");

    // Header animation with pin: top top to center center
    gsap.fromTo(
      DOM_ELEMENTS.introHeader,
      {
        scale: 0,
        opacity: 0,
      },
      {
        scale: 1.5,
        opacity: 0,
        scrollTrigger: {
          trigger: DOM_ELEMENTS.introSection,
          start: "top top",
          end: "center center",
          scrub: 0.3,
          pin: DOM_ELEMENTS.introHeader,
          pinSpacing: false,
          invalidateOnRefresh: true,
        },
        ease: "none",
        keyframes: [
          { scale: 0, opacity: 0, duration: 0 },
          { scale: 0.8, opacity: 1, duration: 0.3 },
          { scale: 1.2, opacity: 1, duration: 0.4 },
          { scale: 1.5, opacity: 0, duration: 0.3 },
        ],
      }
    );

    // Body animation with pin: center center to bottom bottom
    gsap
      .timeline({
        scrollTrigger: {
          trigger: DOM_ELEMENTS.introSection,
          start: "center center",
          end: "bottom bottom",
          scrub: 0.3,
          pin: DOM_ELEMENTS.introBody,
          pinSpacing: false,
          invalidateOnRefresh: true,
        },
      })
      .fromTo(
        DOM_ELEMENTS.introBody,
        {
          scale: 0.5,
          opacity: 0,
        },
        {
          keyframes: [
            { scale: 0.5, opacity: 0, duration: 0 },
            { scale: 0.8, opacity: 1, duration: 0.3 },
            { scale: 1.2, opacity: 1, duration: 0.4 },
            { scale: 1.5, opacity: 0, duration: 0.3 },
          ],
        }
      );

    console.log("✅ GSAP intro animations successfully setup");
  } catch (error) {
    console.error("❌ GSAP intro animations setup failed:", error);
    setupManualIntroAnimations();
  }
}

function setupManualIntroAnimations() {
  console.log("Using manual intro animations as fallback");

  let scrollCount = 0;
  window.addEventListener("scroll", () => {
    scrollCount++;

    // Manual intro animation: Use the exact backup.js timing
    if (
      DOM_ELEMENTS.introSection &&
      DOM_ELEMENTS.introHeader &&
      DOM_ELEMENTS.introBody
    ) {
      const rect = DOM_ELEMENTS.introSection.getBoundingClientRect();

      if (rect.top <= 0 && rect.bottom >= 0) {
        // Section is visible - calculate progress
        const scrolledDistance = Math.abs(rect.top);
        const overallProgress = Math.min(1, scrolledDistance / rect.height);

        // HEADER: 0% to 50% (backup.js: "top top" to "center center")
        if (overallProgress <= 0.5) {
          const headerProgress = overallProgress / 0.5;
          animateIntroHeaderDirect(headerProgress);
          animateIntroBodyDirect(0);
        } else {
          // BODY: 50% to 100% (backup.js: "center center" to "bottom bottom")
          const bodyProgress = (overallProgress - 0.5) / 0.5;
          animateIntroHeaderDirect(1);
          animateIntroBodyDirect(bodyProgress);
        }
      } else {
        // Section not visible - reset
        animateIntroHeaderDirect(0);
        animateIntroBodyDirect(0);
      }
    }
  });
}

export function initIntroAnimations() {
  console.log("🎬 Initializing intro animations...");
  setupGSAPIntroAnimations();
}
