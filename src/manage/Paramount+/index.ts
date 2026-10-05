// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Series are keyed by slug and movies by content id, e.g.
//   https://www.paramountplus.com/shows/south-park/
//   https://www.paramountplus.com/movies/video/ALVE01KT235XQDEK58R7H2012VNZMK/
// Episode pages live under /shows/video/, which isn't a series slug.
const TITLE_PATH_RE =
  /^\/(?:shows\/(?!video\/?$)[a-z0-9_-]+|movies\/video\/[A-Za-z0-9_]+)\/?$/;
const TITLE_KEY_RE =
  /\/(shows\/(?!video\/)[a-z0-9_-]+|movies\/video\/[A-Za-z0-9_]+)(?:[/?#]|$)/;

export function init(): void {
  initManagePlugin({
    website_name: "Paramount+",
    buttonColor: "#0064ff",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(TITLE_KEY_RE)?.[1] ?? null,
  });
}
