// Handle intro section scroll animations (like backup.js)
export function handleIntroScroll() {
  const introSection = document.querySelector(".sc--intro") as HTMLElement;
  if (!introSection) return;

  const rect = introSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const sectionHeight = introSection.offsetHeight;

  // Check if we're scrolling through the intro section
  const isInIntroSection = rect.top < windowHeight && rect.bottom > 0;

  if (!isInIntroSection) return;

  // Calculate scroll progress within the intro section
  const scrolledIntoSection = Math.max(0, -rect.top);
  const scrollProgress = Math.min(scrolledIntoSection / sectionHeight, 1);

  console.log(`Intro Scroll Progress: ${scrollProgress.toFixed(3)}`);

  // Header animation: from 0% to 50% of intro section (like backup.js "top top" to "center center")
  const headerProgress = Math.min(scrollProgress * 2, 1); // 0-50% becomes 0-100%
  animateIntroHeader(headerProgress);

  // Body animation: from 50% to 100% of intro section (like backup.js "center center" to "bottom bottom")
  const bodyProgress = Math.max(0, (scrollProgress - 0.5) * 2); // 50-100% becomes 0-100%
  animateIntroBody(bodyProgress);
}

function animateIntroHeader(progress: number) {
  const introHeader = document.querySelector(".sc_h--intro") as HTMLElement;
  if (!introHeader) return;

  // Make visible
  introHeader.style.display = "block";

  // Keyframe progress mapping (like backup.js)
  let scale = 0;
  let opacity = 0;

  if (progress <= 0.3) {
    // 0% - 30%: scale 0->0.8, opacity 0->1
    const localProgress = progress / 0.3;
    scale = localProgress * 0.8;
    opacity = localProgress;
  } else if (progress <= 0.7) {
    // 30% - 70%: scale 0.8->1.2, opacity stays 1
    const localProgress = (progress - 0.3) / 0.4;
    scale = 0.8 + localProgress * 0.4; // 0.8 -> 1.2
    opacity = 1;
  } else {
    // 70% - 100%: scale 1.2->1.5, opacity 1->0
    const localProgress = (progress - 0.7) / 0.3;
    scale = 1.2 + localProgress * 0.3; // 1.2 -> 1.5
    opacity = 1 - localProgress; // 1 -> 0
  }

  introHeader.style.transform = `scale(${scale})`;
  introHeader.style.opacity = opacity.toString();
}

function animateIntroBody(progress: number) {
  const introBody = document.querySelector(".sc_b--intro") as HTMLElement;
  if (!introBody) return;

  // Make visible
  introBody.style.display = "block";

  // Same keyframe logic as header but starting from scale 0.5
  let scale = 0.5;
  let opacity = 0;

  if (progress <= 0.3) {
    // 0% - 30%: scale 0.5->0.8, opacity 0->1
    const localProgress = progress / 0.3;
    scale = 0.5 + localProgress * 0.3; // 0.5 -> 0.8
    opacity = localProgress;
  } else if (progress <= 0.7) {
    // 30% - 70%: scale 0.8->1.2, opacity stays 1
    const localProgress = (progress - 0.3) / 0.4;
    scale = 0.8 + localProgress * 0.4; // 0.8 -> 1.2
    opacity = 1;
  } else {
    // 70% - 100%: scale 1.2->1.5, opacity 1->0
    const localProgress = (progress - 0.7) / 0.3;
    scale = 1.2 + localProgress * 0.3; // 1.2 -> 1.5
    opacity = 1 - localProgress; // 1 -> 0
  }

  introBody.style.transform = `scale(${scale})`;
  introBody.style.opacity = opacity.toString();
}

// Setup intro animations
export function setupIntroAnimations() {
  console.log("Setting up intro animations...");

  // Setup intro header animation (.sc_h--intro)
  const introHeader = document.querySelector(".sc_h--intro");
  if (introHeader) {
    // Set initial state
    (introHeader as HTMLElement).style.transform = "scale(0)";
    (introHeader as HTMLElement).style.opacity = "0";
    (introHeader as HTMLElement).style.display = "none"; // Hidden initially

    console.log("✅ Intro header element found and initialized");
  } else {
    console.warn("❌ Intro header element (.sc_h--intro) not found in DOM");
  }

  // Setup intro body animation (.sc_b--intro)
  const introBody = document.querySelector(".sc_b--intro");
  if (introBody) {
    // Set initial state
    (introBody as HTMLElement).style.transform = "scale(0.5)";
    (introBody as HTMLElement).style.opacity = "0";
    (introBody as HTMLElement).style.display = "none"; // Hidden initially

    console.log("✅ Intro body element found and initialized");
  } else {
    console.warn("❌ Intro body element (.sc_b--intro) not found in DOM");
  }

  // Debug: List all elements in DOM for troubleshooting
  const allElements = document.querySelectorAll('[class*="intro"]');
  console.log(
    `Found ${allElements.length} elements with 'intro' in class name:`,
    Array.from(allElements).map((el) => el.className)
  );
}

// Initialize intro animations
export function initIntroAnimations() {
  setupIntroAnimations();
  window.addEventListener("scroll", handleIntroScroll);
  console.log("Intro animations initialized");
}
