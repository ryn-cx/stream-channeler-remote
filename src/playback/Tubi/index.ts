// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initVideoPlugin({
    name: "Tubi",
    playerSelectors: [
      "#video-player-container",
      '[data-id="video-player"]',
      ".video-player",
      ".web-player",
    ],
  });
}
