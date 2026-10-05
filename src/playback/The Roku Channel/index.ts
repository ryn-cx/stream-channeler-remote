// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initVideoPlugin({
    name: "Roku Channel",
    playerSelectors: [
      '[data-testid="video-player"]',
      "#video-player",
      ".video-container",
      ".player-container",
    ],
  });
}
