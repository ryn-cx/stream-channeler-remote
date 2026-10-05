// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// The slug in front of the id is optional, e.g.
//   https://www.hulu.com/series/7117a15d-128c-4c2b-a5b9-98adfa0f4505
//   https://www.hulu.com/series/chad-powers-7117a15d-128c-4c2b-a5b9-98adfa0f4505
//   https://www.hulu.com/movie/the-devil-wears-prada-2-34bc6b99-813f-4d5d-bbe7-f3099b45879b
const TITLE_PATH_RE = new RegExp(
  `^/(?:series|movie)/(?:[a-z0-9-]+-)?${UUID}/?$`,
);
const TITLE_ID_RE = new RegExp(`/(?:series|movie)/(?:[a-z0-9-]+-)?(${UUID})`);

export function init(): void {
  initManagePlugin({
    website_name: "Hulu",
    buttonColor: "#1ce783",
    textColor: "#000000",
    urlRegex: TITLE_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
  });
}
