// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Peacock advances to the next episode by navigating to a new URL, so the URL
  // change is the primary end signal; the video's own end is a fallback.
  initVideoPlugin({
    name: "Peacock",
    // When none match, the outermost wrapper the same size as the video is used.
    playerSelectors: [
      '[data-testid="playback-container"]',
      ".playback-container",
      '[class*="PlayerContainer"]',
    ],
    watchUrl: true,
  });
}
