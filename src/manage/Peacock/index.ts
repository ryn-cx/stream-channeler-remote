// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// A series is keyed by a long number, a movie (and a few series) by a UUID.
const TITLE_KEY = `(?:${UUID}|\\d+)`;

// The section, genre and name segments in front of the id are decorative, e.g.
//   https://www.peacocktv.com/watch/asset/tv/the-office/4902514835143843112
//   https://www.peacocktv.com/watch/asset/movies/romance/renegade/06145283-20dc-3916-a072-e0c00daaa8e6
// Episode pages continue with /seasons/<n>/episodes/..., so require the id to
// end the path.
const TITLE_PATH_RE = new RegExp(
  `^/watch/asset(?:/[^/]+){2,3}/${TITLE_KEY}/?$`,
);
const TITLE_KEY_RE = new RegExp(
  `/watch/asset(?:/[^/?#]+){2,3}/(${TITLE_KEY})(?:[/?#]|$)`,
);

export function init(): void {
  initManagePlugin({
    website_name: "Peacock",
    buttonColor: "#000000",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(TITLE_KEY_RE)?.[1] ?? null,
  });
}
