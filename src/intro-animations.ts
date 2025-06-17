// Intro animations for the intro section
// Extracted from old animation-system.ts and adapted for current structure

let isHeaderAnimating = false;
let isBodyAnimating = false;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateIntroHeaderDirect(directProgress: number) {
  const introHeader = document.querySelector(".sc_h--intro") as HTMLElement;
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

  // State-tracked positioning
  const shouldBeFixed = directProgress > 0 && directProgress < 1;

  if (shouldBeFixed && !isHeaderAnimating) {
    // Start animation - add fixed class once
    isHeaderAnimating = true;
    introHeader.classList.add("intro-text-fixed");
  } else if (!shouldBeFixed && isHeaderAnimating) {
    // End animation - remove fixed class once
    isHeaderAnimating = false;
    introHeader.classList.remove("intro-text-fixed");
  }

  // Always update transform and opacity based on current state
  if (isHeaderAnimating) {
    introHeader.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale})`,
      "important"
    );
  } else {
    introHeader.style.setProperty("transform", `scale(${scale})`, "important");
  }
  introHeader.style.opacity = opacity.toString();
}

function animateIntroBodyDirect(directProgress: number) {
  const introBody = document.querySelector(".sc_b--intro") as HTMLElement;
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

  // State-tracked positioning
  const shouldBeFixed = directProgress > 0 && directProgress < 1;

  if (shouldBeFixed && !isBodyAnimating) {
    // Start animation - add fixed class once
    isBodyAnimating = true;
    introBody.classList.add("intro-text-fixed");
  } else if (!shouldBeFixed && isBodyAnimating) {
    // End animation - remove fixed class once
    isBodyAnimating = false;
    introBody.classList.remove("intro-text-fixed");
  }

  // Always update transform and opacity based on current state
  if (isBodyAnimating) {
    introBody.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale})`,
      "important"
    );
  } else {
    introBody.style.setProperty("transform", `scale(${scale})`, "important");
  }
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

    // Header animation: top top to center center
    gsap.fromTo(
      ".sc_h--intro",
      {
        scale: 0,
        opacity: 0,
        className: "+=intro-text-fixed",
        x: "-50%",
        y: "-50%",
      },
      {
        scale: 1.5,
        opacity: 0,
        scrollTrigger: {
          trigger: ".sc--intro",
          start: "top top",
          end: "center center",
          scrub: 0.3,
          invalidateOnRefresh: true,
        },
        onComplete: () => {
          document
            .querySelector(".sc_h--intro")
            ?.classList.remove("intro-text-fixed");
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

    // Body animation: center center to bottom bottom
    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".sc--intro",
          start: "center center",
          end: "bottom bottom",
          scrub: 0.3,
          invalidateOnRefresh: true,
        },
      })
      .fromTo(
        ".sc_b--intro",
        {
          scale: 0.5,
          opacity: 0,
          className: "+=intro-text-fixed",
          x: "-50%",
          y: "-50%",
        },
        {
          keyframes: [
            { scale: 0.5, opacity: 0, duration: 0 },
            { scale: 0.8, opacity: 1, duration: 0.3 },
            { scale: 1.2, opacity: 1, duration: 0.4 },
            { scale: 1.5, opacity: 0, duration: 0.3 },
          ],
          onComplete: () => {
            document
              .querySelector(".sc_b--intro")
              ?.classList.remove("intro-text-fixed");
          },
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

    // Test if we can find intro elements
    const intro = document.querySelector(".sc--intro");
    const header = document.querySelector(".sc_h--intro");
    const body = document.querySelector(".sc_b--intro");

    // Manual intro animation: Use the exact backup.js timing
    if (intro && header && body) {
      const rect = intro.getBoundingClientRect();

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
