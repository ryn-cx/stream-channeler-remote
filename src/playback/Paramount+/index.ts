// TODO: Validate
import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const findInEndcard = (selector: string): HTMLElement | null =>
  document
    .querySelector("endcard-web-component")
    ?.shadowRoot?.querySelector<HTMLElement>(selector) ?? null;

// TODO: Validate
const isEndcardShown = (): boolean => findInEndcard(".endcard") !== null;

// TODO: Validate
const closeEndcard = (): boolean => {
  const close = findInEndcard(".endcard-close-button");
  close?.click();
  return close !== null;
};

// TODO: Validate
const skipIntro = clickWhenShown(
  'button.skip-button.button_visible[data-skip="skip"]',
);

// TODO: Validate
const player = {
  name: "Paramount+",
  watchForVideoForCompletion: true,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      isEnded: isEndcardShown,
      clickButtons: introButtons,
    });
  } else {
    initVideoPlugin({
      ...player,
      clickButtons: [...introButtons, closeEndcard],
    });
  }
}
