import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
  shouldSkipIntros,
  waitForElement,
} from "../../shared";

export { hostnames } from "./matches.cjs";

// TODO: Validate
const skipIntro = clickWhenShown(
  'button[aria-label="Skip Intro"]:not([aria-hidden="true"])',
);

// TODO: Validate
const skipCredits = clickWhenShown(
  'button[aria-label="Skip Credits"]:not([aria-hidden="true"])',
);

// TODO: Validate
function fitPlayerToWrapper(): void {
  waitForElement<HTMLElement>(".video-player-wrapper", 60_000)
    .then((wrapper) =>
      wrapper.style.setProperty(
        "grid-template-rows",
        "minmax(0, 1fr)",
        "important",
      ),
    )
    .catch(() => {});
}

// TODO: Validate
export function init(): void {
  fitPlayerToWrapper();
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
