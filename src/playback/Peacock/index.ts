// TODO: Validate
import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const skipIntro = clickWhenShown(
  'button[data-testid="skip-button"][aria-label="Skip Intro"]',
);

// TODO: Validate
const cancelWatchNext = clickWhenShown(
  'button[data-testid="binge-dismiss-button"]',
);

// TODO: Validate
const player = {
  name: "Peacock",
  watchForVideoForCompletion: true,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      endSelector: '[data-testid="vod-binge-container"]',
      clickButtons: introButtons,
    });
  } else {
    initVideoPlugin({
      ...player,
      clickButtons: [...introButtons, cancelWatchNext],
    });
  }
}
