// TODO: Validate
import {
  initVideoPlugin,
  shouldSkipCredits,
  sleep,
  waitForElement,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
async function startVideo(): Promise<void> {
  const watchNow = await waitForElement<HTMLElement>(
    ".tVideoEpisodePlayer__watchNowBtn",
  );
  watchNow.click();
  const iframe = await waitForElement<HTMLElement>(".world-player-iframe");
  iframe.classList.add("world-player-fullscreen");
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(1000);
    if (document.querySelector(".tVideoEpisodePlayer.is-show")) return;
    watchNow.click();
  }
}

// TODO: Validate
const player = {
  name: "NHKWorld",
  start: startVideo,
  watchForVideoForCompletion: 1,
};

// TODO: Validate
export function init(): void {
  if (shouldSkipCredits()) {
    initVideoPlugin(player);
  } else {
    initVideoPlugin(player);
  }
}
