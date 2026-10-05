// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Adult Swim advances to the next episode by navigating to a new /videos/
  // URL, so the URL change is the primary end signal; the video's own end is a
  // fallback.
  initVideoPlugin({
    name: "Adult Swim",
    // Adult Swim's ASVP player nests root > .top-container >
    // .top-player-container > <video>, and mounts its controls outside
    // .top-player-container. The root's class is a hashed CSS module name, so
    // find it as the parent of .top-container.
    playerSelectors: [":has(> .top-container)", ".top-container"],
    watchUrl: true,
  });
}
