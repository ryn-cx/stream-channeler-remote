// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Prime Video plays inside its own web player SDK container, which also holds
  // the site's controls, so that is what gets expanded.
  initVideoPlugin({
    name: "Prime Video",
    playerSelectors: [
      ".webPlayerSDKContainer",
      ".webPlayerUIContainer",
      "#dv-web-player",
      ".dv-player-fullscreen",
    ],
  });
}
