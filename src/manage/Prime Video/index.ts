// TODO: Validate
import { initManagePlugin } from "../../manage_plugin";

export { hostnames, matches } from "./matches.cjs";

// Title pages, optionally with a region prefix, a decorative name segment and a
// trailing ref, e.g.
//   https://www.primevideo.com/detail/0GTKUFQSFLP1YVFDMW9IR56I90
//   https://www.primevideo.com/region/eu/detail/The-Boys/0KRGHGZCHKS920ZQGY5LBRF7MA/ref=atv_sr
//   https://www.amazon.com/gp/video/detail/B0D9MYVLNM
// Amazon's generic /dp/<id> product pages aren't included, since every product
// on amazon.com uses them, not just videos.
const TITLE_ID_RE = /\/detail\/(?:[^/?#]+\/)?([A-Z0-9]{10,})(?:[/?#]|$)/;

function currentTitleUrl(): string | null {
  const id = location.pathname.match(TITLE_ID_RE)?.[1];
  if (!id) return null;
  // Queue the plain title URL the importer recognises, without the decorative
  // name, region or ref segments.
  return location.hostname.includes("amazon.com")
    ? `https://www.amazon.com/gp/video/detail/${id}`
    : `https://www.primevideo.com/detail/${id}`;
}

export function init(): void {
  initManagePlugin({
    website_name: "Prime Video",
    buttonColor: "#00a8e1",
    isValidPage: () => currentTitleUrl() !== null,
    waitSelector: "body",
    getCurrentUrl: () => currentTitleUrl() ?? location.href,
    getMatchKey: (url) => url.match(TITLE_ID_RE)?.[1] ?? null,
  });
}
