// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Titles have their own page at /title/80240027, but browsing usually opens the
// title as a modal over /browse with its id in the query string
// (/browse?jbv=80240027), so both are recognised and queued as /title/<id>.
const TITLE_PATH_RE = /^\/title\/(\d+)\/?$/;
const TITLE_ID_RE = /\/title\/(\d+)/;

function currentTitleId(): string | null {
  return (
    location.pathname.match(TITLE_PATH_RE)?.[1] ??
    new URLSearchParams(location.search).get("jbv")
  );
}

export function init(): void {
  initManagePlugin({
    website_name: "Netflix",
    buttonColor: "#e50914",
    isValidPage: () => currentTitleId() !== null,
    waitSelector: "body",
    getCurrentUrl: () => {
      const id = currentTitleId();
      return id ? `https://www.netflix.com/title/${id}` : location.href;
    },
    getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
  });
}
