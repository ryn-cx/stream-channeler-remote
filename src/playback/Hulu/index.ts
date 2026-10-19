// TODO: Validate
import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames } from "./matches.cjs";

// TODO: Validate
const skipIntro = clickWhenShown(
  'button[data-testid="player-skip-button"]',
  /skip intro/i,
);

// TODO: Validate
const player = {
  name: "Hulu",
  watchForVideoForCompletion: true,
  debug: true,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({ ...player, clickButtons: introButtons });
  } else {
    initVideoPlugin({ ...player, clickButtons: introButtons });
  }
}
