// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Disney+ mounts its player (and controls) inside the BTM media client
  // container that wraps the <video>.
  initVideoPlugin({
    name: "Disney+",
    playerSelectors: [
      ".btm-media-clients",
      ".btm-media-overlays-container",
      "#hivePlayer",
      ".video-container",
    ],
  });
}
