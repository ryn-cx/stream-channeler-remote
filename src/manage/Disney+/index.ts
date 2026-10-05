// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Series and movies share one page format, with an optional locale segment, e.g.
//   https://www.disneyplus.com/browse/entity-cac75c8f-a9e2-4d95-ac73-1cf1cc7b9568
//   https://www.disneyplus.com/en-gb/browse/entity-3135b0cb-a002-438d-a9fd-60d86284c93f
const TITLE_PATH_RE = new RegExp(
  `^(?:/[a-z]{2}(?:-[a-z]{2})?)?/browse/entity-${UUID}/?$`,
);
const TITLE_ID_RE = new RegExp(`/browse/entity-(${UUID})`);

export function init(): void {
  initManagePlugin({
    website_name: "Disney+",
    buttonColor: "#0063e5",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
  });
}
