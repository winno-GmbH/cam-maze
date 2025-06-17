// Final animations for the final section
// Similar to intro animations but for the final section

// State tracking to prevent conflicts
let isFinalHeaderAnimating = false;
let isFinalBodyAnimating = false;

// Smooth easing function for opacity transitions
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Setup final section animations (set initial states)
function setupFinalAnimations() {
  // Setup final header animation (.sc_h--final)
  const finalHeader = document.querySelector(".sc_h--final");
  if (finalHeader) {
    // Set initial state - VISIBLE but transparent
    (finalHeader as HTMLElement).style.transform = "scale(0)";
    (finalHeader as HTMLElement).style.opacity = "0";
    (finalHeader as HTMLElement).style.display = "block"; // VISIBLE for animations
  }

  // Setup final body animation (.sc_b--final)
  const finalBody = document.querySelector(".sc_b--final");
  if (finalBody) {
    // Set initial state - transparent but no display manipulation
    (finalBody as HTMLElement).style.transform = "scale(0.5)";
    (finalBody as HTMLElement).style.opacity = "0";
    // Removed display: block - let CSS handle positioning
  }

  // INJECT CSS FOR FIXED POSITIONING - Override any sticky behavior
  if (!document.getElementById("final-fixed-styles")) {
    const style = document.createElement("style");
    style.id = "final-fixed-styles";
    style.textContent = `
      .final-text-fixed {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        z-index: 1000 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Manual animation functions for final header
function animateFinalHeaderDirect(directProgress: number) {
  const finalHeader = document.querySelector(".sc_h--final") as HTMLElement;
  if (!finalHeader) {
    return;
  }

  // Header animation: directProgress goes from 0-1 for the full header animation
  // EXACT SAME as intro header animation
  let scale = 0;
  let opacity = 0;

  if (directProgress > 0 && directProgress < 1) {
    if (directProgress <= 0.2) {
      // 0% - 20%: scale 0->0.8, opacity 0->1 (EXACT SAME as intro)
      const keyframeProgress = directProgress / 0.2;
      const easedProgress = easeInOutCubic(keyframeProgress);
      scale = easedProgress * 0.8;
      opacity = easedProgress; // 0.0 -> 1.0
    } else if (directProgress <= 0.8) {
      // 20% - 80%: scale 0.8->1.2, opacity stays 1 (EXACT SAME as intro)
      const keyframeProgress = (directProgress - 0.2) / 0.6;
      scale = 0.8 + keyframeProgress * 0.4; // 0.8 -> 1.2
      opacity = 1;
    } else {
      // 80% - 100%: scale 1.2->1.5, opacity 1->0 (EXACT SAME as intro)
      const keyframeProgress = (directProgress - 0.8) / 0.2;
      scale = 1.2 + keyframeProgress * 0.3; // 1.2 -> 1.5
      opacity = 1 - keyframeProgress; // 1 -> 0.0
    }
  } else if (directProgress >= 1) {
    // Header finished (EXACT SAME as intro)
    scale = 1.5;
    opacity = 0;
  } else {
    // Header not started (EXACT SAME as intro)
    scale = 0;
    opacity = 0;
  }

  // ROBUST STATE-TRACKED POSITIONING (EXACT SAME as intro)
  const shouldBeFixed = directProgress > 0 && directProgress < 1;

  if (shouldBeFixed && !isFinalHeaderAnimating) {
    // Start animation - add fixed class once
    isFinalHeaderAnimating = true;
    finalHeader.classList.add("final-text-fixed");
  } else if (!shouldBeFixed && isFinalHeaderAnimating) {
    // End animation - remove fixed class once
    isFinalHeaderAnimating = false;
    finalHeader.classList.remove("final-text-fixed");
  }

  // Always update transform and opacity based on current state (EXACT SAME as intro)
  if (isFinalHeaderAnimating) {
    finalHeader.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale})`,
      "important"
    );
  } else {
    finalHeader.style.setProperty("transform", `scale(${scale})`, "important");
  }
  finalHeader.style.opacity = opacity.toString();
}

// Manual animation functions for final body
function animateFinalBodyDirect(directProgress: number) {
  const finalBody = document.querySelector(".sc_b--final") as HTMLElement;
  if (!finalBody) {
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
    // Body not started
    scale = 0.5;
    opacity = 0;
  }

  // ROBUST STATE-TRACKED POSITIONING
  const shouldBeFixed = directProgress > 0 && directProgress < 1;

  if (shouldBeFixed && !isFinalBodyAnimating) {
    // Start animation - add fixed class once
    isFinalBodyAnimating = true;
    finalBody.classList.add("final-text-fixed");
  } else if (!shouldBeFixed && isFinalBodyAnimating) {
    // End animation - remove fixed class once
    isFinalBodyAnimating = false;
    finalBody.classList.remove("final-text-fixed");
  }

  // Always update transform and opacity based on current state
  if (isFinalBodyAnimating) {
    finalBody.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale})`,
      "important"
    );
  } else {
    finalBody.style.setProperty("transform", `scale(${scale})`, "important");
  }
  finalBody.style.opacity = opacity.toString();
}

// GSAP-based final animations (similar to intro animations)
async function setupGSAPFinalAnimations() {
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

    // SMOOTH GSAP settings to prevent flickering + fast scroll issues
    gsap.config({
      force3D: true, // Hardware acceleration
      nullTargetWarn: false,
      autoSleep: 60, // Keep animations responsive
    });

    // Optimize ScrollTrigger for smooth performance + fast scroll handling
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load", // Reduce refresh triggers
      limitCallbacks: true, // Prevent callback overload during fast scrolling
    });

    // Final header animation - EXACT SAME as intro header
    gsap.fromTo(
      ".sc_h--final",
      {
        scale: 0,
        opacity: 0,
        className: "+=final-text-fixed", // Add CSS class for fixed positioning
        x: "-50%",
        y: "-50%",
      },
      {
        scale: 1.5,
        opacity: 0,
        scrollTrigger: {
          trigger: ".sc--final.sc",
          start: "top top", // EXACT SAME as intro
          end: "center center", // EXACT SAME as intro
          scrub: 0.3, // EXACT SAME as intro
          invalidateOnRefresh: true, // EXACT SAME as intro
        },
        onComplete: () => {
          // Reset positioning after animation
          document
            .querySelector(".sc_h--final")
            ?.classList.remove("final-text-fixed");
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

    // Final body animation - similar to intro body
    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".sc--final.sc",
          start: "center center", // Same timing as intro
          end: "bottom bottom", // Same timing as intro
          scrub: 0.3, // OPTIMIZED: Faster response for fast scrolling
          invalidateOnRefresh: true, // Ensure proper recalculation
        },
      })
      .fromTo(
        ".sc_b--final",
        {
          scale: 0.5,
          opacity: 0,
          className: "+=final-text-fixed", // Add CSS class for fixed positioning
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
            // Reset positioning after animation
            document
              .querySelector(".sc_b--final")
              ?.classList.remove("final-text-fixed");
          },
        }
      );

    console.log("✅ GSAP final animations setup successful");
  } catch (error) {
    console.error("❌ GSAP final animations setup failed:", error);
    setupManualFinalAnimations();
  }
}

// Manual final animations fallback
function setupManualFinalAnimations() {
  console.log("🔄 Setting up manual final animations fallback");

  // Manual scroll handler for final section
  window.addEventListener("scroll", () => {
    // Test if we can find final elements
    const finalSection = document.querySelector(".sc--final.sc");
    const header = document.querySelector(".sc_h--final");
    const body = document.querySelector(".sc_b--final");

    // WORKING FINAL ANIMATION: Use the EXACT SAME timing as intro
    if (finalSection && header && body) {
      const rect = finalSection.getBoundingClientRect();

      if (rect.top <= 0 && rect.bottom >= 0) {
        // Section is visible - calculate progress
        const scrolledDistance = Math.abs(rect.top);
        const overallProgress = Math.min(1, scrolledDistance / rect.height);

        // HEADER: 0% to 50% (EXACT SAME as intro: "top top" to "center center")
        if (overallProgress <= 0.5) {
          const headerProgress = overallProgress / 0.5;
          animateFinalHeaderDirect(headerProgress);
          animateFinalBodyDirect(0);
        } else {
          // BODY: 50% to 100% (EXACT SAME as intro: "center center" to "bottom bottom")
          const bodyProgress = (overallProgress - 0.5) / 0.5;
          animateFinalHeaderDirect(1);
          animateFinalBodyDirect(bodyProgress);
        }
      } else {
        // Section not visible - reset
        animateFinalHeaderDirect(0);
        animateFinalBodyDirect(0);
      }
    }
  });
}

// Export function to initialize final animations
export function initFinalAnimations() {
  setupFinalAnimations();
  setupGSAPFinalAnimations();
}
