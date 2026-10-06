import {
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const deepButtons = (root: ParentNode): HTMLButtonElement[] => [
  ...Array.from(root.querySelectorAll("button")),
  ...Array.from(root.querySelectorAll("*")).flatMap((el) =>
    el.shadowRoot ? deepButtons(el.shadowRoot) : [],
  ),
];

// TODO: Validate
const findButton = (
  overlay: string,
  label: RegExp,
): HTMLButtonElement | undefined => {
  const shadowRoot = document.querySelector(overlay)?.shadowRoot;
  if (!shadowRoot) return undefined;
  return deepButtons(shadowRoot).find(
    (button) =>
      label.test(button.getAttribute("aria-label") ?? "") ||
      label.test(button.textContent?.trim() ?? ""),
  );
};

// TODO: Validate
const click = (button: HTMLElement | undefined): boolean => {
  button?.click();
  return button !== undefined;
};

// TODO: Validate
const isEndCardCloseShown = (): boolean =>
  findButton("end-card-overlay", /^Close$/) !== undefined;

// TODO: Validate
const closeEndCard = (): boolean =>
  click(findButton("end-card-overlay", /^Close$/));

// TODO: Validate
const clickSkipButton =
  (label: RegExp): (() => boolean) =>
  () => {
    const skip = findButton("skip-overlay", label);
    return click(
      skip?.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        ? skip
        : undefined,
    );
  };

// TODO: Validate
const clickSkipCredits = clickSkipButton(/skip credits/i);

// TODO: Validate
const skipIntro = clickSkipButton(/skip intro/i);

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      name: "Disney+",
      // Detect the end of a series or the end of a movie.
      endSelector: '[data-testid="explore-post-play-view"]',
      isEnded: isEndCardCloseShown,
      // Sometimes there is a skip credits button sometimes there is not, it just
      // depends on the media.
      clickButtons: [...introButtons, clickSkipCredits],
    });
  } else {
    initVideoPlugin({
      name: "Disney+",
      clickButtons: [...introButtons, closeEndCard],
      // The URL eventually changes, but there may be a small delay and some credits are
      // actually skipped.
      watcForhUrlChange: true,
    });
  }
}
