// TODO: Validate
import { initUrlChangePlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// Wrappers that hold both the <video> and Netflix's own controls. When none
// match, the outermost wrapper the same size as the video is used.
const NETFLIX_PLAYER_SELECTORS = [
  ".watch-video--player-view",
  '[data-uia="watch-video"]',
];

export function init(): void {
  // Netflix advances to the next episode by navigating to a new /watch/ URL.
  initUrlChangePlugin("Netflix", NETFLIX_PLAYER_SELECTORS);
}
