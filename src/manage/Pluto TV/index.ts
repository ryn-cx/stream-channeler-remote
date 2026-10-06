// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

const ITEM_ID = "[0-9a-f]{24}";
// Every page sits under a locale segment, e.g.
//   https://pluto.tv/en/on-demand/series/5ef05c6acdce3c001a779a79/details
//   https://pluto.tv/us/on-demand/series/5ef05c6acdce3c001a779a79/season/1
//   https://pluto.tv/en/on-demand/movies/68a54f49df1220b53566f16e/details
//   https://pluto.tv/us/movies/68a54f49df1220b53566f16e/
//   https://pluto.tv/us/shows/washed/
// Season and episode pages are read as their series.
const TITLE_PATH_RE = new RegExp(
  `^(?:/[a-z]{2}(?:-[a-z]{2})?)?(?:` +
    `/on-demand/series/${ITEM_ID}(?:/season/\\d+(?:/episode/${ITEM_ID})?)?(?:/details)?` +
    `|(?:/on-demand)?/movies/${ITEM_ID}(?:/details)?` +
    `|/shows/[a-z0-9-]+` +
    `)/?$`,
);
const TITLE_KEY_RE = new RegExp(
  `/(?:(?:on-demand/)?(?:series|movies)/(${ITEM_ID})|shows/([a-z0-9-]+))`,
);

export function init(): void {
  initManagePlugin({
    website_name: "Pluto TV",
    buttonColor: "#fff200",
    textColor: "#000000",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => {
      const match = url.match(TITLE_KEY_RE);
      return match?.[1] ?? match?.[2] ?? null;
    },
  });
}
