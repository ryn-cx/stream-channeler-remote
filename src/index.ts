// TODO: Validate
import { initCustomChannel } from "./custom_channel";
import { initPlayback, isRemoteRunning } from "./playback";
import { initManage } from "./manage";
import { registerSkipMenus } from "./shared";

interface Plugin {
  hostnames: string[];
  matches: string[];
  init: () => void;
}

function loadPlugins(ctx: __WebpackModuleApi.RequireContext): Plugin[] {
  return ctx.keys().map((key) => ctx(key) as Plugin);
}

const playbackPlugin = loadPlugins(
  require.context("./playback", true, /\/index\.ts$/),
).find((p) => p.hostnames.some((h) => location.hostname.includes(h)));
const managePlugin = loadPlugins(
  require.context("./manage", true, /\/index\.ts$/),
).find((p) => p.hostnames.some((h) => location.hostname.includes(h)));

registerSkipMenus();

if (playbackPlugin) playbackPlugin.init();
if (managePlugin) managePlugin.init();

if (!playbackPlugin && !managePlugin) {
  if (location.hostname.includes("streamchanneler.com")) {
    initPlayback();
    initCustomChannel(isRemoteRunning);
    initManage();
  }
}
