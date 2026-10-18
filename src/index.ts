// TODO: Validate
import { initManage } from "./manage";
import { bridgeDvrPage, openDvrGuide, storeDvrToken } from "./dvr";
import { initRemoteButton } from "./remote_button";
import { startGuideSync } from "./site_cache";
import { openSettingsPanel } from "./settings_panel";
import { addMenuCommand, createLogger } from "./shared";

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

if (playbackPlugin) playbackPlugin.init();
if (managePlugin) managePlugin.init();

if (location.hostname.includes("streamchanneler.com")) {
  storeDvrToken();
  bridgeDvrPage();
  startGuideSync();
  initRemoteButton();
  initManage();
}
