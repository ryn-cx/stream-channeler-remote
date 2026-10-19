// TODO: Validate
import { initManage } from "./manage";
import {
  bridgeDvrPage,
  mountSiteGuideLink,
  openDvrGuide,
  resumeDvrGuide,
  storeDvrToken,
} from "./dvr";
import { startGuideSync } from "./site_cache";
import { openSettingsPanel } from "./settings_panel";
import { addMenuCommand, createLogger } from "./shared";

interface Plugin {
  hostnames: string[];
  init: () => void;
}

function loadPlugins(ctx: __WebpackModuleApi.RequireContext): Plugin[] {
  return ctx.keys().map((key) => ctx(key) as Plugin);
}

// TODO: Validate
function findPlugin(plugins: Plugin[]): Plugin | undefined {
  return plugins.find((p) =>
    p.hostnames.some((h) => location.hostname.includes(h)),
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

// TODO: Validate
function onDomReady(run: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

onDomReady(() => {
  const isApp = typeof STREAM_CHANNELER_APP !== "undefined";
  const isStreamChanneler = location.hostname.includes("streamchanneler.com");

  if (playbackPlugin) playbackPlugin.init();
  if (managePlugin && !isApp) managePlugin.init();

  if (isStreamChanneler) {
    storeDvrToken();
    bridgeDvrPage();
    startGuideSync();
    if (!isApp) initManage();
    mountSiteGuideLink(createLogger("Guide"));
    if (window.top === window && location.hash === "#guide") {
      openDvrGuide(createLogger("Guide"));
    }
  }
});

resumeDvrGuide(createLogger("Guide"));
