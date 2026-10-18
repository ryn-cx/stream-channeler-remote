// TODO: Validate
import {
  isRunning,
  loadState,
  type QueueItem,
  type RemoteState,
  send,
  STATE_KEY,
} from "./remote";
import { createLogger } from "./shared";
import { readChannelQueue } from "./site_cache";

const log = createLogger();
const CHANNEL_PATH =
  /^\/channels\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const CACHE_POLL_MS = 1000;
const STOP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-x-icon lucide-monitor-x"><path d="m14.5 12.5-5-5"/><path d="m9.5 12.5 5-5"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>`;
const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-play-icon lucide-monitor-play"><path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"/><path d="M12 17v4"/><path d="M8 21h8"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>`;

let startIndex = 0;
let pageQueue: QueueItem[] = [];
let pageSignature: string | null = null;

// TODO: Validate
function parseIcon(markup: string): Node {
  return document.importNode(
    new DOMParser().parseFromString(markup, "image/svg+xml").documentElement,
    true,
  );
}

// TODO: Validate
function isThisChannel(state: RemoteState): boolean {
  return state.mode === "remote" && state.channelPath === location.pathname;
}

// TODO: Validate
function isRunningHere(state: RemoteState): boolean {
  return isThisChannel(state) && isRunning(state);
}

// TODO: Validate
function promptSetIndex(): void {
  const state = loadState();
  const total = isThisChannel(state) ? state.queue.length : pageQueue.length;
  const current = isThisChannel(state) ? state.index : startIndex;
  const input = window.prompt(
    `Set current episode (1-${total}):`,
    String(current + 1),
  );
  if (input === null) return;
  const parsed = parseInt(input, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > total) return;
  if (isThisChannel(state)) {
    void send({ type: "remote:setIndex", index: parsed - 1 });
  } else {
    startIndex = parsed - 1;
    updateButton();
  }
}

// TODO: Validate
function toggleRemote(): void {
  const state = loadState();
  if (isRunningHere(state)) {
    void send({ type: "remote:stop" });
    return;
  }
  const queue = isThisChannel(state) ? state.queue : pageQueue;
  const index = isThisChannel(state) ? state.index : startIndex;
  if (queue.length === 0) {
    log.error(
      "The full episode list isn't loaded; click Refresh Episodes on the page",
    );
    return;
  }
  log.log(`Starting at ${index + 1}/${queue.length}`);
  void send({
    type: "remote:start",
    channelPath: location.pathname,
    queue,
    index,
  });
}

// TODO: Validate
function handleButtonClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (target.closest("#remote-control-counter")) {
    event.preventDefault();
    promptSetIndex();
    return;
  }
  toggleRemote();
}

// TODO: Validate
function updateButton(): void {
  let button = document.getElementById("remote-control-btn");
  if (!CHANNEL_PATH.test(location.pathname)) {
    button?.remove();
    return;
  }

  if (!button) {
    const commentsButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button"),
    ).find(
      (candidate) =>
        candidate.querySelector("svg.lucide-message-square") &&
        candidate.textContent?.trim() === "Comments",
    );
    if (!commentsButton?.parentElement) return;
    button = document.createElement("button");
    button.id = "remote-control-btn";
    button.className = commentsButton.className;
    button.setAttribute("data-slot", "button");
    button.addEventListener("click", handleButtonClick);
    commentsButton.after(button);
  }

  const state = loadState();
  const running = isRunningHere(state);
  const total = isThisChannel(state) ? state.queue.length : pageQueue.length;
  const index = isThisChannel(state) ? state.index : startIndex;
  const displayed = Math.min(index + 1, total);
  const signature = `${running}:${displayed}/${total}`;
  if (button.dataset.signature === signature) return;
  button.dataset.signature = signature;
  const counter = document.createElement("span");
  counter.id = "remote-control-counter";
  counter.style.cssText = "cursor:pointer;text-decoration:underline";
  counter.textContent = `${displayed}/${total}`;
  button.replaceChildren(
    parseIcon(running ? STOP_ICON : PLAY_ICON),
    `${running ? "Stop Remote" : "Start Remote"} (`,
    counter,
    ")",
  );
}

// TODO: Validate
async function refreshPageQueue(): Promise<void> {
  const channelId = location.pathname.match(CHANNEL_PATH)?.[1];
  const queue = channelId ? ((await readChannelQueue(channelId)) ?? []) : [];
  const signature = JSON.stringify([location.pathname, queue]);
  if (signature === pageSignature) return;
  pageSignature = signature;
  pageQueue = queue;
  syncQueue();
  updateButton();
}

// TODO: Validate
function syncQueue(): void {
  const state = loadState();
  if (pageQueue.length === 0 || !isThisChannel(state)) return;
  const unchanged =
    pageQueue.length === state.queue.length &&
    pageQueue.every(
      (item, i) =>
        item.url === state.queue[i].url &&
        item.episodeId === state.queue[i].episodeId,
    );
  if (unchanged) return;
  log.log("Episode order on the page changed; updating the remote's queue");
  void send({
    type: "remote:sync",
    channelPath: location.pathname,
    queue: pageQueue,
  });
}

// TODO: Validate
export function initRemoteButton(): void {
  GM_addValueChangeListener(STATE_KEY, updateButton);
  let debounceTimer: number | undefined;
  new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(updateButton, 200);
  }).observe(document.body, { childList: true, subtree: true });
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    void refreshPageQueue();
    updateButton();
  }, CACHE_POLL_MS);
  void refreshPageQueue();
  updateButton();
}
