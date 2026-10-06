// TODO: Validate
import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const endcard = ".base-container.show endcard-web-component";

// TODO: Validate
const enterTheatreMode = clickWhenShown(
  'button[data-controls="theatreScreen"][aria-pressed="false"]',
);

// TODO: Validate
const skipIntro = clickWhenShown(
  'button.skip-button.button_visible[data-skip="skip"]',
  /skip intro/i,
);

// TODO: Validate
const closeEndcard = (): boolean => {
  const close = document
    .querySelector(endcard)
    ?.shadowRoot?.querySelector<HTMLElement>(".endcard-close-button");
  close?.click();
  return Boolean(close);
};

// TODO: Validate
const isInEndcard = (selector: string): boolean =>
  Array.from(document.querySelectorAll("endcard-web-component")).some(
    (component) => component.shadowRoot?.querySelector(selector),
  );

// TODO: Validate
const isUpNextShown = (): boolean =>
  isInEndcard('.endcard-timer[aria-label^="Up Next" i]');

// TODO: Validate
const isRecommendationShown = (): boolean =>
  isInEndcard(".endcard-footer .watch-button-text");

// TODO: Validate
const restoreCredits = clickWhenShown(
  ".player-wrapper.uec-credits-box .tween-down-thumbnail.show",
);

// TODO: Validate
const player = {
  name: "Pluto TV",
  watcForhUrlChange: true,
  watchForVideoForCompletion: true,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      endSelector: endcard,
      isEnded: isUpNextShown,
      clickButtons: [enterTheatreMode, ...introButtons],
    });
  } else {
    initVideoPlugin({
      ...player,
      isEnded: isRecommendationShown,
      clickButtons: [
        enterTheatreMode,
        ...introButtons,
        closeEndcard,
        restoreCredits,
      ],
    });
  }
}
