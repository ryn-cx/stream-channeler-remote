// TODO: Validate
import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const skipIntro = clickWhenShown("button.MuiButton-root", /skip introduction/i);

// TODO: Validate
const isWatchNextShown = (): boolean =>
  Array.from(document.querySelectorAll("button.MuiButton-root")).some(
    (button) => /watch next/i.test(button.textContent ?? ""),
  );

// TODO: Validate
const player = {
  name: "Roku",
  watchForVideoForCompletion: true,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      isEnded: isWatchNextShown,
      clickButtons: introButtons,
    });
  } else {
    initVideoPlugin({ ...player, clickButtons: introButtons });
  }
}
