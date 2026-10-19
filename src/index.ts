// TODO: Validate
import { initManage } from "./manage";
import {
  bridgeDvrPage,
  mountSiteGuideLink,
  openDvrGuide,
  storeDvrToken,
} from "./dvr";
import { initRemoteButton } from "./remote_button";
import { startGuideSync } from "./site_cache";
import { openSettingsPanel } from "./settings_panel";
import { ALWAYS_SHOW_GUIDE_KEY } from "./remote";
import { addMenuCommand, createLogger, mountGuideControls } from "./shared";

interface Plugin {
  hostnames: string[];
  matches: string[];
  init: () => void;
}

function loadPlugins(ctx: __WebpackModuleApi.RequireContext): Plugin[] {
  return ctx.keys().map((key) => ctx(key) as Plugin);
}

// TODO: Validate
function matchesPage(patterns: string[]): boolean {
  return patterns.some((pattern) =>
    new RegExp(
      `^${pattern
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
    ).test(location.href),
  );
}

// TODO: Validate
function findPlugin(plugins: Plugin[]): Plugin | undefined {
  return plugins.find(
    (p) =>
      p.hostnames.some((h) => location.hostname.includes(h)) &&
      matchesPage(p.matches),
  );
}

const playbackPlugin = findPlugin(
  loadPlugins(require.context("./playback", true, /\/index\.ts$/)),
);
const managePlugin = findPlugin(
  loadPlugins(require.context("./manage", true, /\/index\.ts$/)),
);

if (window.top === window) {
  addMenuCommand("start", "Open guide", () => {
    openDvrGuide(createLogger("Guide"));
  });
  addMenuCommand("settings", "Settings", openSettingsPanel);
}

const isApp = typeof STREAM_CHANNELER_APP !== "undefined";
const isStreamChanneler = location.hostname.includes("streamchanneler.com");

if (playbackPlugin) {
  playbackPlugin.init();
} else if (
  isApp &&
  !isStreamChanneler &&
  window.top === window &&
  GM_getValue(ALWAYS_SHOW_GUIDE_KEY, true)
) {
  mountGuideControls(createLogger("Guide"));
}
if (managePlugin && !isApp) managePlugin.init();

if (isStreamChanneler) {
  storeDvrToken();
  bridgeDvrPage();
  startGuideSync();
  initRemoteButton();
  if (!isApp) initManage();
  mountSiteGuideLink(createLogger("Guide"));
  if (window.top === window && location.hash === "#guide") {
    openDvrGuide(createLogger("Guide"));
  }
}
