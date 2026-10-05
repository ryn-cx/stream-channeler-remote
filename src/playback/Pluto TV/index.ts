// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initVideoPlugin({
    name: "Pluto TV",
    playerSelectors: [
      '[data-testid="video-player"]',
      "#video-player",
      ".video-player",
      ".player-wrapper",
    ],
  });
}
