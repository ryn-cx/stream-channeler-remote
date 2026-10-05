// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // HiDive runs a video.js-based player, so the ".video-js" wrapper holds both
  // the video and the site's controls.
  initVideoPlugin({
    name: "HiDive",
    playerSelectors: [
      ".video-js",
      "#video-player",
      ".player-container",
      ".vjs-player",
    ],
  });
}
