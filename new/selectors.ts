const SELECTORS = {
  mazeContainer: ".el--home-maze.el",

  homeSection: ".sc--home.sc",
  introSection: ".sc--intro.sc",
  introHeader: ".sc_h--intro",
  introBody: ".sc_b--intro",
  povSection: ".sc--pov.sc",
  finalSection: ".sc--final.sc",
  finalContainer: ".cr--final.cr",

  scrollComponent: ".cmp--scroll.cmp",
  parentElements: ".cmp--pov.cmp",

  pov: ".pov",
  cam: ".cam",
};

export const DOM_ELEMENTS = {
  mazeContainer: document.querySelector(SELECTORS.mazeContainer) as HTMLElement,
  canvas: document.querySelector("canvas") as HTMLCanvasElement,

  homeSection: document.querySelector(SELECTORS.homeSection) as HTMLElement,
  introSection: document.querySelector(SELECTORS.introSection) as HTMLElement,
  introHeader: document.querySelector(SELECTORS.introHeader) as HTMLElement,
  introBody: document.querySelector(SELECTORS.introBody) as HTMLElement,
  povSection: document.querySelector(SELECTORS.povSection) as HTMLElement,
  finalSection: document.querySelector(SELECTORS.finalSection) as HTMLElement,
  finalContainer: document.querySelector(
    SELECTORS.finalContainer
  ) as HTMLElement,

  parentElements: document.querySelectorAll(
    SELECTORS.parentElements
  ) as NodeListOf<Element>,
};
