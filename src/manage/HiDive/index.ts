// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Series, seasons and movies are keyed by number, e.g.
//   https://www.hidive.com/series/1286
//   https://www.hidive.com/season/20022
//   https://www.hidive.com/video/586784
// HiDive also uses /video/<id> for individual episodes, which the importer
// can't import yet, but there's no telling them apart from the URL.
const TITLE_PATH_RE = /^\/(?:series|season|video)\/\d+\/?$/;

// A season page names its series (/season/36178?seriesId=4083), and the series
// is what the importer reads it as, so match it by the series.
function extractTitleKey(url: string): string | null {
  const seriesId = url.match(/[?&]seriesId=(\d+)/)?.[1];
  if (seriesId) return `series/${seriesId}`;
  const match = url.match(/\/(series|season|video)\/(\d+)/);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function init(): void {
  initManagePlugin({
    website_name: "HiDive",
    buttonColor: "#00aeef",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    // Keep the query string so a season's seriesId is queued with it.
    getCurrentUrl: () =>
      `${location.origin}${location.pathname}${location.search}`,
    getMatchKey: extractTitleKey,
  });
}
