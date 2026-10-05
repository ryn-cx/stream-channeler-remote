// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initVideoPlugin({
    name: "Paramount+",
    playerSelectors: [
      ".aa-player-container",
      "#player-container",
      ".video-player-container",
      ".player-wrapper",
    ],
  });
}
