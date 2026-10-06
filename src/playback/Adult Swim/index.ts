import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initVideoPlugin({
    name: "Adult Swim",
    playerToFullscreen: [":has(> .top-container)", ".top-container"],
    // A small delay is required to avoid cutting off the end of the video. This will
    // trigger before Adult Swim is able to change the URL after the video ends.
    watchForVideoForCompletion: true,
  });
}
