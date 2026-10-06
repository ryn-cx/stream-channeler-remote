// TODO: Validate
import {
  type Logger,
  clickWhenShown,
  initVideoPlugin,
  waitForElement,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

function waitForWatchPage(): Promise<void> {
  return new Promise((resolve) => {
    const poll = window.setInterval(() => {
      if (location.pathname.startsWith("/video/watch/")) {
        clearInterval(poll);
        resolve();
      }
    }, 250);
  });
}

// TODO: Validate
// Movies link to their title page (/movie/<id>) rather than the player, so
// click Watch Now and wait for HBO Max to navigate to /video/watch/.
async function startMovie(log: Logger): Promise<void> {
  if (location.pathname.startsWith("/movie/")) {
    // The movie page's "Watch Now" button. The Trailer button shares its
    // data-testid, but only Watch Now has the LOUD (primary) appearance.
    const watchNow = await waitForElement<HTMLButtonElement>(
      'button[data-testid="play_button"][data-appearance="LOUD"]',
    );
    log.log("Clicking Watch Now");
    watchNow.click();
    await waitForWatchPage();
  }
}

// TODO: Validate
const skipIntro = clickWhenShown(
  '[data-testid="skip"]:not([style*="hidden"]) button[aria-label="Skip Intro"]',
);

// TODO: Validate
const cancelAutoplay = clickWhenShown(
  'button[data-testid="player-ux-up-next-dismiss"]',
);

// TODO: Validate
const player = {
  name: "HBO Max",
  playerToFullscreen: ['[data-testid="playerContainer"]'],
  start: startMovie,
};

// TODO: Validate
export function init(): void {
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      // Middle episode of a series.
      endSelector: 'button[data-testid="player-ux-up-next-button"]',
      clickButtons: introButtons,
      // Last episode of a series/movies.
      watchForVideoForCompletion: true,
    });
  } else {
    initVideoPlugin({
      ...player,
      clickButtons: [...introButtons, cancelAutoplay],
      watchForVideoForCompletion: true,
    });
  }
}
