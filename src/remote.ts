// TODO: Validate
import {
  type DvrApiChannel,
  type DvrApiProgram,
  markEpisodeWatched,
  nextDvrProgram,
  readGuideCache,
} from "./dvr_api";

export const STATE_KEY = "remoteState";
export const SKIP_INTROS_KEY = "skipIntros";
export const SKIP_CREDITS_KEY = "skipCredits";
export const ALWAYS_SHOW_GUIDE_KEY = "alwaysShowGuide";
export const CUSTOM_URLS_KEY = "customChannelUrls";
const HANDOFF_KEY = "tabHandoff";
const PLAYER_TAB_KEY = "playerTab";
const PLAY_REQUEST_KEY = "playRequest";
const PLAY_ACCEPTED_KEY = "playRequestAccepted";
const TAB_ID_KEY = "streamChannelerRemoteTabId";
const HISTORY_LIMIT = 50;
const HANDOFF_MS = 60_000;
const PLAYER_ALIVE_MS = 10_000;
const PLAYER_RESPONSE_MS = 3_000;
const LOG_PREFIX = "[Stream Channeler Remote]";

export type Mode = "remote" | "custom" | "dvr";

export interface QueueItem {
  url: string;
  episodeId?: string;
}

export interface DvrProgram {
  channelId: string;
  channelName: string;
  episodeId: string;
  url: string;
}

export interface RemoteState {
  mode: Mode | null;
  stopped: boolean;
  playerTabId: string | null;
  queue: QueueItem[];
  index: number;
  channelPath: string | null;
  dvr: DvrProgram | null;
  history: DvrProgram[];
  openPending: boolean;
  navigatedAt: number;
}

export interface TabStatus {
  controlled: boolean;
  stopped: boolean;
  mode: Mode | null;
  url: string | null;
  dvr: DvrProgram | null;
}

export type Request =
  | { type: "tab:hello" }
  | { type: "tab:opened" }
  | { type: "tab:ended"; reason: string }
  | { type: "tab:previous"; reason: string }
  | { type: "tab:stop" }
  | { type: "tab:resume" }
  | { type: "remote:stop" }
  | { type: "custom:start"; urls: string[] }
  | { type: "dvr:play"; program: DvrProgram };

interface Handoff {
  id: string;
  at: number;
}

interface PlayerTab {
  id: string;
  seen: number;
}

interface PlayRequest {
  url: string;
  at: number;
}

let tabId: string | null = null;
let afterSave: (() => void)[] = [];

// TODO: Validate
export function emptyState(): RemoteState {
  return {
    mode: null,
    stopped: true,
    playerTabId: null,
    queue: [],
    index: 0,
    channelPath: null,
    dvr: null,
    history: [],
    openPending: false,
    navigatedAt: 0,
  };
}

// TODO: Validate
export function loadState(): RemoteState {
  return {
    ...emptyState(),
    ...GM_getValue<RemoteState | null>(STATE_KEY, null),
  };
}

// TODO: Validate
function saveState(state: RemoteState): void {
  GM_setValue(STATE_KEY, state);
}

// TODO: Validate
export function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// TODO: Validate
export function writeSession(key: string, value: unknown): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    return;
  }
}

// TODO: Validate
function currentTabId(): string {
  tabId ??= readSession<string>(TAB_ID_KEY);
  if (!tabId) {
    tabId = crypto.randomUUID();
    writeSession(TAB_ID_KEY, tabId);
  }
  return tabId;
}

// TODO: Validate
function claimHandoff(): void {
  if (window.top !== window) return;
  const handoff = GM_getValue<Handoff | null>(HANDOFF_KEY, null);
  if (!handoff || Date.now() - handoff.at > HANDOFF_MS) return;
  GM_deleteValue(HANDOFF_KEY);
  tabId = handoff.id;
  writeSession(TAB_ID_KEY, tabId);
}

// TODO: Validate
function goHere(id: string, url: string): void {
  const handoff: Handoff = { id, at: Date.now() };
  GM_setValue(HANDOFF_KEY, handoff);
  console.log(LOG_PREFIX, "Playing in this tab:", url);
  location.assign(url);
}

// TODO: Validate
function openPlayerTab(id: string, url: string): void {
  const handoff: Handoff = { id, at: Date.now() };
  GM_setValue(HANDOFF_KEY, handoff);
  console.log(LOG_PREFIX, "Opening a player tab:", url);
  window.open(url, "_blank");
}

// TODO: Validate
function isPlayerAlive(state: RemoteState): boolean {
  const player = GM_getValue<PlayerTab | null>(PLAYER_TAB_KEY, null);
  return (
    player !== null &&
    player.id === state.playerTabId &&
    Date.now() - player.seen < PLAYER_ALIVE_MS
  );
}

// TODO: Validate
export function isRunning(state: RemoteState): boolean {
  return (
    state.mode !== null &&
    !state.stopped &&
    (isPlayerAlive(state) || Date.now() - state.navigatedAt < HANDOFF_MS)
  );
}

// TODO: Validate
function requestPlayerTab(url: string): void {
  const request: PlayRequest = { url, at: Date.now() };
  GM_setValue(PLAY_REQUEST_KEY, request);
  window.setTimeout(() => {
    if (GM_getValue<number>(PLAY_ACCEPTED_KEY, 0) === request.at) return;
    console.warn(
      LOG_PREFIX,
      "The player tab didn't respond; opening a new one",
    );
    const state = loadState();
    const id = crypto.randomUUID();
    state.playerTabId = id;
    state.navigatedAt = Date.now();
    saveState(state);
    openPlayerTab(id, url);
  }, PLAYER_RESPONSE_MS);
}

// TODO: Validate
function navigate(state: RemoteState, url: string): void {
  state.openPending = true;
  state.navigatedAt = Date.now();
  if (state.playerTabId === currentTabId()) {
    const id = state.playerTabId;
    afterSave.push(() => goHere(id, url));
    return;
  }
  if (isPlayerAlive(state)) {
    afterSave.push(() => requestPlayerTab(url));
    return;
  }
  const id = crypto.randomUUID();
  state.playerTabId = id;
  afterSave.push(() => openPlayerTab(id, url));
}

// TODO: Validate
export function listenForPlayRequests(): void {
  const beat = (): void => {
    if (loadState().playerTabId !== currentTabId()) return;
    const player: PlayerTab = { id: currentTabId(), seen: Date.now() };
    GM_setValue(PLAYER_TAB_KEY, player);
  };
  beat();
  window.setInterval(beat, PLAYER_ALIVE_MS / 2);
  GM_addValueChangeListener(PLAY_REQUEST_KEY, (_name, _old, value) => {
    const request = value as PlayRequest | null;
    if (!request) return;
    if (
      GM_getValue<PlayerTab | null>(PLAYER_TAB_KEY, null)?.id !== currentTabId()
    ) {
      return;
    }
    if (loadState().playerTabId !== currentTabId()) return;
    GM_setValue(PLAY_ACCEPTED_KEY, request.at);
    goHere(currentTabId(), request.url);
  });
}

// TODO: Validate
async function playCurrent(state: RemoteState): Promise<void> {
  const item = state.queue[state.index];
  if (!item) {
    state.stopped = true;
    return;
  }
  state.stopped = false;
  if (item.episodeId) {
    const marking = markEpisodeWatched(item.episodeId);
    if (state.playerTabId === currentTabId()) await marking;
  }
  navigate(state, item.url);
}

// TODO: Validate
function toDvrProgram(
  channel: DvrApiChannel,
  program: DvrApiProgram,
): DvrProgram | null {
  if (!program.url) return null;
  return {
    channelId: channel.id,
    channelName: channel.name ?? "",
    episodeId: program.episode_id,
    url: program.url,
  };
}

// TODO: Validate
function playDvr(
  state: RemoteState,
  program: DvrProgram,
  history: DvrProgram[],
): void {
  state.mode = "dvr";
  state.stopped = false;
  state.dvr = program;
  state.history = history.slice(-HISTORY_LIMIT);
  navigate(state, program.url);
}

// TODO: Validate
async function playNextDvr(state: RemoteState): Promise<void> {
  const playing = state.dvr;
  if (!playing) return;
  const channel = readGuideCache()?.channels.find(
    (candidate) => candidate.id === playing.channelId,
  );
  const next = channel ? nextDvrProgram(channel, playing.episodeId) : null;
  const program = channel && next ? toDvrProgram(channel, next) : null;
  if (!program || !next) {
    state.stopped = true;
    return;
  }
  await markEpisodeWatched(next.episode_id);
  playDvr(state, program, [...state.history, program]);
}

// TODO: Validate
function playPreviousDvr(state: RemoteState): void {
  if (state.history.length < 2) return;
  const earlier = state.history.slice(0, -1);
  playDvr(state, earlier[earlier.length - 1], earlier);
}

// TODO: Validate
function statusFor(state: RemoteState): TabStatus {
  const controlled =
    state.playerTabId === currentTabId() && state.mode !== null;
  return {
    controlled,
    stopped: controlled ? state.stopped : true,
    mode: state.mode,
    url:
      state.mode === "dvr"
        ? (state.dvr?.url ?? null)
        : (state.queue[state.index]?.url ?? null),
    dvr: state.dvr,
  };
}

// TODO: Validate
async function handle(request: Request): Promise<unknown> {
  if (request.type === "tab:hello") claimHandoff();
  const state = loadState();
  const isPlayer = state.playerTabId === currentTabId();

  switch (request.type) {
    case "tab:hello":
      return statusFor(state);

    case "tab:opened":
      if (!isPlayer || state.stopped || !state.openPending) return false;
      state.openPending = false;
      saveState(state);
      return true;

    case "tab:ended":
      if (!isPlayer || state.stopped || state.mode === null) return null;
      if (state.mode === "dvr") {
        await playNextDvr(state);
      } else {
        state.index += 1;
        await playCurrent(state);
      }
      break;

    case "tab:previous":
      if (!isPlayer || state.stopped || state.mode === null) return null;
      if (state.mode === "dvr") {
        playPreviousDvr(state);
      } else {
        state.index = Math.max(0, state.index - 1);
        await playCurrent(state);
      }
      break;

    case "tab:stop":
      if (!isPlayer) return null;
      state.stopped = true;
      break;

    case "tab:resume":
      state.playerTabId = currentTabId();
      state.stopped = false;
      break;

    case "remote:stop":
      state.stopped = true;
      break;

    case "custom:start":
      state.mode = "custom";
      state.queue = request.urls.map((url) => ({ url }));
      state.index = 0;
      state.channelPath = null;
      await playCurrent(state);
      break;

    case "dvr:play":
      state.playerTabId = currentTabId();
      await markEpisodeWatched(request.program.episodeId);
      playDvr(state, request.program, [
        ...(state.mode === "dvr" ? state.history : []),
        request.program,
      ]);
      break;
  }

  saveState(state);
  const pending = afterSave;
  afterSave = [];
  pending.forEach((run) => run());
  return statusFor(state);
}

let queue: Promise<unknown> = Promise.resolve();

// TODO: Validate
export function send<T = unknown>(request: Request): Promise<T> {
  const run = queue
    .then(() => handle(request))
    .catch((error: unknown): null => {
      afterSave = [];
      console.error(LOG_PREFIX, error);
      return null;
    });
  queue = run;
  return run as Promise<T>;
}
