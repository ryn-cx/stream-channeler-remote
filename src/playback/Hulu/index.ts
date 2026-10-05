// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Hulu advances to the next episode by navigating to a new /watch/ URL, so
  // the URL change is the primary end signal; the video's own end is a fallback.
  initVideoPlugin({
    name: "Hulu",
    playerSelectors: [
      "#content-video-player",
      ".VideoPlayerContainer",
      ".PlayerContainer",
      '[data-testid="player-container"]',
    ],
    watchUrl: true,
  });
}
