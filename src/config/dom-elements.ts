// Import scroll selectors from animation constants for consistency
import { SCROLL_SELECTORS } from "../animation/constants";

const SELECTORS = {
  mazeContainer: ".el--home-maze.el",
  canvas: "canvas",

  homeSection: SCROLL_SELECTORS.HOME,
  introSection: SCROLL_SELECTORS.INTRO,
  povSection: SCROLL_SELECTORS.POV,
  finalSection: SCROLL_SELECTORS.OUTRO,
  finalContainer: ".cr--outro.cr",

  scrollComponent: ".cmp--scroll.cmp",
  parentElements: ".cmp--pov.cmp",

  pov: ".pov",
  cam: ".cam",
};

export const DOM_ELEMENTS = {
  mazeContainer: document.querySelector(SELECTORS.mazeContainer) as HTMLElement,
  canvas: document.querySelector(SELECTORS.canvas) as HTMLCanvasElement,

  homeSection: document.querySelector(SELECTORS.homeSection) as HTMLElement,
  introSection: document.querySelector(SELECTORS.introSection) as HTMLElement,
  povSection: document.querySelector(SELECTORS.povSection) as HTMLElement,
  finalSection: document.querySelector(SELECTORS.finalSection) as HTMLElement,
  finalContainer: document.querySelector(
    SELECTORS.finalContainer
  ) as HTMLElement,

  parentElements: document.querySelectorAll(
    SELECTORS.parentElements
  ) as NodeListOf<Element>,
};
