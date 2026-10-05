// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Show pages look like /videos/metalocalypse; episode pages add the episode slug
// (/videos/toonami/the-return-episode-1), so require the show slug to end the
// path. Shows can also be linked as /rick-and-morty, so stored URLs of either
// form are matched by the show slug.
const SHOW_PATH_RE = /^\/videos\/[a-z0-9-]+\/?$/;
const SHOW_SLUG_RE = /adultswim\.com\/(?:videos\/)?([a-z0-9-]+)\/?(?:[?#]|$)/;

export function init(): void {
  initManagePlugin({
    website_name: "Adult Swim",
    buttonColor: "#000000",
    urlRegex: SHOW_PATH_RE,
    waitSelector: "body",
    getCurrentUrl: () => `${location.origin}${location.pathname}`,
    getMatchKey: (url) => url.match(SHOW_SLUG_RE)?.[1] ?? null,
  });
}
