// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// TMDB title pages look like /tv/1396-breaking-bad or /movie/550-fight-club, and
// the slug is optional (/tv/1396 resolves to the same page). Subpages such as
// /tv/1396-breaking-bad/season/1 or /movie/550-fight-club/cast shouldn't get the
// "Add to Channel" button, so require the id segment to end the path.
const TITLE_PATH_RE = /^\/(tv|movie)\/\d+(-[^/]*)?\/?$/;

// Match by media type + numeric id so the highlight survives slug, language
// query string and trailing-slash differences between the page URL and the URL
// stored against a channel.
const TITLE_ID_RE = /\/(tv|movie)\/(\d+)/;

function extractTitleKey(url: string): string | null {
  const match = url.match(TITLE_ID_RE);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function init(): void {
  initManagePlugin({
    website_name: "TMDB",
    buttonColor: "#01b4e4",
    textColor: "#0d253f",
    urlRegex: TITLE_PATH_RE,
    // TMDB is server-rendered, so the page body is enough of an anchor and this
    // avoids depending on the detail page's markup.
    waitSelector: "body",
    // Drop the query string (TMDB appends ?language=…) so the queued URL is the
    // plain canonical title URL.
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: extractTitleKey,
  });
}
