// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Title pages put a media type in front of the id, optionally followed by a
// decorative slug and season, e.g.
//   https://play.hbomax.com/show/ab553cdc-e15d-4597-b65f-bec9201fd2dd
//   https://play.hbomax.com/mini-series/396999a6-3fff-4af3-802b-10c46d10deff
//   https://play.hbomax.com/movie/4ee4f57e-19bd-493f-96f9-ad3e753af981
//   https://www.hbomax.com/shows/rick-and-morty/s2/ab553cdc-e15d-4597-b65f-bec9201fd2dd
// Watch pages (/video/watch/<id>/<id>) are episodes, not titles.
const TITLE_PATH_RE = new RegExp(
  `^/(?!video/)[a-z-]+/(?:[a-z0-9-]+/)?(?:s\\d+/)?${UUID}/?$`,
);
const TITLE_ID_RE = new RegExp(`/(${UUID})/?(?:[?#]|$)`);

export function init(): void {
  initManagePlugin({
    website_name: "HBO Max",
    buttonColor: "#002be7",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
  });
}
