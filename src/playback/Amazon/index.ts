import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

const videoSelector = "#dv-web-player video";

const hideNextUpButton =
  ".atvwebplayersdk-nextupcard-show .atvwebplayersdk-nextupcardhide-button";
const stopAutoplayButton = 'button[aria-label="Stop autoplay"]';

const hideNextUp = clickWhenShown(hideNextUpButton);
const stopAutoplay = clickWhenShown(stopAutoplayButton);
const skipIntro = clickWhenShown('button[aria-label="Skip Intro"]');

const player = {
  name: "Amazon",
  videoSelector,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      // hideNextUpButton is shown at the end of a series or movie.
      // stopAutoplayButton is shown at the end of an episode that has an episode
      // following it.
      endSelector: [hideNextUpButton, stopAutoplayButton],
      clickButtons: introButtons,
    });
  } else {
    initVideoPlugin({
      ...player,
      // hideNextUpButton is shown at the end of a series or movie.
      // stopAutoplayButton is shown at the end of an episode that has an episode
      // following it.
      clickButtons: [...introButtons, hideNextUp, stopAutoplay],
      watchForVideoForCompletion: true,
    });
  }
}
