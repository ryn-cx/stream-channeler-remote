// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
export function init(): void {
  initVideoPlugin({
    name: "YouTube",
    videoSelector: "#movie_player video",
    playerToFullscreen: ["#movie_player"],
    endSelector: "#movie_player.ended-mode",
  });
}
