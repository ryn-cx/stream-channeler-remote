// TODO: Validate
import { initUrlChangePlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// Wrappers that hold both the <video> and HBO Max's own controls. When none
// match, the outermost wrapper the same size as the video is used.
const HBO_MAX_PLAYER_SELECTORS = [
  '[data-testid="player-ux-container"]',
  '[class*="PlayerContainer"]',
];

export function init(): void {
  // HBO Max advances to the next episode by navigating to a new /video/watch/ URL.
  initUrlChangePlugin("HBO Max", HBO_MAX_PLAYER_SELECTORS);
}
