// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Series and movies share one page format; the slug after the id is decorative,
// and a season appends its number to the id, e.g.
//   https://therokuchannel.roku.com/details/db1607f1cff2522bb795382bb4b5bcae/fawlty-towers
const TITLE_PATH_RE = /^\/details\/[0-9a-f]{32}(?:-\d+)?(?:\/[^/]+)?\/?$/;
const TITLE_ID_RE = /\/(?:details|watch)\/([0-9a-f]{32}(?:-\d+)?)/;

export function init(): void {
  initManagePlugin({
    website_name: "Roku",
    buttonColor: "#6c3c97",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
  });
}
