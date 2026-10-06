// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  initManagePlugin({
    website_name: "Crunchyroll",
    buttonColor: "#000000",
    urlRegex: /\/series\/[A-Z0-9]+/,
    waitSelector: "h1",
    getCurrentUrl: () => location.href,
    // Crunchyroll series URLs look like /series/GT00375170/the-food-diary-of-miss-maid.
    // Match by series ID so the highlight survives slug or trailing-slash differences
    // between the page URL and the URL stored against a channel.
    getMatchKey: (url) => url.match(/\/series\/([A-Z0-9]+)/)?.[1] ?? null,
  });
}
