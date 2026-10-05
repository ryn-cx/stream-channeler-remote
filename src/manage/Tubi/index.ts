// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Series and movies are keyed by number, followed by an optional slug, e.g.
//   https://tubitv.com/series/300006854/scooby-doo-where-are-you
//   https://tubitv.com/movies/100029837/megamind
const TITLE_PATH_RE = /^\/(?:series|movies)\/\d+(?:\/[^/]*)?\/?$/;
const TITLE_KEY_RE = /\/(series|movies)\/(\d+)/;

export function init(): void {
  initManagePlugin({
    website_name: "Tubi",
    buttonColor: "#7408ff",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => {
      const match = url.match(TITLE_KEY_RE);
      return match ? `${match[1]}/${match[2]}` : null;
    },
  });
}
