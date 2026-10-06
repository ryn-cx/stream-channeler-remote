import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const skipIntro = clickWhenShown(
  'button[aria-label="Skip Intro"]:not([aria-hidden="true"])',
);

// TODO: Validate
const skipCredits = clickWhenShown(
  'button[aria-label="Skip Credits"]:not([aria-hidden="true"])',
);

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      name: "Crunchyroll",
      playerToFullscreen: [".video-player-wrapper"],
      // Episodes in the middle of a series automatically navigate to the next one.
      // watchUrl: true,
      // The last episode of a series opens a recommendations dialog instead of changing
      // the URL.
      // endSelector: "dialog.erc-end-slate-recommendations-carousel[open]",
      watchForVideoForCompletion: true,
      clickButtons: [...introButtons, skipCredits],
    });
  } else {
    initVideoPlugin({
      name: "Crunchyroll",
      playerToFullscreen: [".video-player-wrapper"],
      // Episodes in the middle of a series automatically navigate to the next one.
      // watchUrl: true,
      // The last episode of a series opens a recommendations dialog instead of changing
      // the URL.
      // endSelector: "dialog.erc-end-slate-recommendations-carousel[open]",
      watchForVideoForCompletion: true,
      clickButtons: introButtons,
    });
  }
}
