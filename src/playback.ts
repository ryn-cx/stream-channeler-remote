// TODO: Validate
import { createLogger } from "./shared";

const log = createLogger();

let cards: HTMLElement[] = [];
let currentIndex = 0;
let running = false;
let listenerRegistered = false;
let stoppedByTab = false;

function promptSetCurrentIndex(): void {
  const input = window.prompt(
    `Set current episode (1-${cards.length}):`,
    String(currentIndex + 1),
  );
  if (input === null) return;
  const parsed = parseInt(input, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > cards.length) return;
  currentIndex = parsed - 1;
  updateButton();
}

function handleButtonClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (target.closest("#remote-control-counter")) {
    event.preventDefault();
    promptSetCurrentIndex();
    return;
  }
  toggleRemote();
}

function updateButton(): void {
  let button = document.getElementById("remote-control-btn");

  if (
    !/^\/channels\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(
      location.pathname,
    )
  ) {
    button?.remove();
    return;
  }

  if (!button) {
    // Place the button right after the "Comments" button in the channel toolbar,
    // matching its styling.
    const commentsButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button"),
    ).find(
      (b) =>
        b.querySelector("svg.lucide-message-square") &&
        b.textContent.trim() === "Comments",
    );
    if (!commentsButton?.parentElement) return;

    button = document.createElement("button");
    button.id = "remote-control-btn";
    button.className = commentsButton.className;
    button.setAttribute("data-slot", "button");
    button.addEventListener("click", handleButtonClick);
    commentsButton.after(button);
  }

  // Icons: https://lucide.dev/icons/monitor-x and
  // https://lucide.dev/icons/monitor-play
  const icon = running
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-x-icon lucide-monitor-x"><path d="m14.5 12.5-5-5"/><path d="m9.5 12.5 5-5"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-play-icon lucide-monitor-play"><path d="M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"/><path d="M12 17v4"/><path d="M8 21h8"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>`;
  const action = running ? "Stop Remote" : "Start Remote";
  // Shown 1-based: the episode that's playing, or that Start Remote will play
  // next. Capped at the last episode once the channel has finished.
  const displayed = Math.min(currentIndex + 1, cards.length);
  const counter = `<span id="remote-control-counter" style="cursor:pointer;text-decoration:underline">${displayed}/${cards.length}</span>`;
  button.innerHTML = `${icon}${action} (${counter})`;
}

function clickCurrentCard(): void {
  // If all videos have been played stop remote.
  if (currentIndex >= cards.length) {
    stopRemote();
    return;
  }

  // loadingTab is used to make sure the script only activates on the specific tabs
  // that it opens.
  // TODO: This isn't a perfectly safe way of tracking this because the user could
  // trigger a race condition if they open a tab to a video at the same time as the
  // script opens a video.
  GM_setValue("loadingTab", true);
  // Remember where the tab is headed, for plugins that get bounced elsewhere
  // first (e.g. Netflix's profile picker) and need to find their way back.
  const card = cards[currentIndex];
  const link =
    card.querySelector<HTMLAnchorElement>("a[href]") ??
    card.closest<HTMLAnchorElement>("a[href]");
  GM_setValue("loadingUrl", link?.href ?? null);
  if (!link) captureOpenedUrl();
  card.click();
  updateButton();
}

// Cards without a plain link open their video from script, so record the URL
// they open (via window.open or a clicked link) as loadingUrl.
function captureOpenedUrl(): void {
  const page = unsafeWindow;
  const originalOpen = page.open;
  let captured = false;
  const record = (url: string): void => {
    if (captured) return;
    captured = true;
    log.log("Card opened", url);
    GM_setValue("loadingUrl", url);
  };

  const patchedOpen = (
    url?: string | URL,
    ...rest: [string?, string?]
  ): Window | null => {
    if (url) record(new URL(String(url), location.href).href);
    return originalOpen.call(page, url, ...rest);
  };
  // Firefox keeps the page's globals behind Xray wrappers, so the patch has to
  // be exported into the page to be callable from it.
  page.open =
    typeof exportFunction === "function"
      ? exportFunction(patchedOpen, page)
      : patchedOpen;

  const onClick = (event: MouseEvent): void => {
    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (anchor instanceof HTMLAnchorElement) record(anchor.href);
  };
  document.addEventListener("click", onClick, true);

  // The card may open the tab after an await, so keep listening for a moment.
  window.setTimeout(() => {
    page.open = originalOpen;
    document.removeEventListener("click", onClick, true);
    if (!captured) {
      log.warn("Couldn't tell which URL the card opened");
    }
  }, 3000);
}

function stopRemote(): void {
  running = false;
  updateButton();
}

// TODO: Validate
function startRemote(): void {
  if (cards.length === 0) {
    cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="card"]'),
    );
    currentIndex = 0;
  }
  log.log(`Starting at ${currentIndex + 1}/${cards.length}`);
  running = true;

  // Listener to detect for when a video is completed.
  if (!listenerRegistered) {
    listenerRegistered = true;
    GM_addValueChangeListener(
      "videoEnded",
      (_name: string, _oldValue: unknown, newValue: unknown) => {
        // Only automatically load the next channel if Stream Channeler Remote is in
        // an active state.
        if (!running) return;
        if (typeof newValue !== "number")
          throw new Error(`videoEnded value is not a number: ${newValue}`);
        currentIndex++;
        clickCurrentCard();
      },
    );
    GM_addValueChangeListener("previousEpisodeRequested", () => {
      if (!running) return;
      currentIndex = Math.max(0, currentIndex - 1);
      clickCurrentCard();
    });
  }

  clickCurrentCard();
}

// TODO: Validate
function toggleRemote(): void {
  stoppedByTab = false;
  if (running) {
    stopRemote();
  } else {
    startRemote();
  }
}

// TODO: Validate
export function isRemoteRunning(): boolean {
  return running;
}

// TODO: Validate
export function initPlayback(): void {
  // A video tab's "Stop Auto Control" button sets this; stop the remote so the
  // Start/Stop Remote button reflects it.
  GM_addValueChangeListener("remoteStopRequested", () => {
    if (!running) return;
    stoppedByTab = true;
    stopRemote();
  });
  GM_addValueChangeListener("remoteResumeRequested", () => {
    if (!stoppedByTab || running) return;
    stoppedByTab = false;
    running = true;
    updateButton();
  });

  function syncState(): void {
    const newCards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="card"]'),
    );
    // The user can remove cards (by verifying a watch) or changing card order (by
    // clicking the "Next Episode" button) so these changes need to be managed.
    if (
      newCards.length !== cards.length ||
      !newCards.every((c, i) => c === cards[i])
    ) {
      const activeCard = cards[currentIndex];
      cards = newCards;

      if (activeCard) {
        const newIndex = cards.indexOf(activeCard);
        currentIndex = newIndex >= 0 ? newIndex : 0;
        // No activeCard can probably occur when the user verifies a watch on the last
        // episode of a
        // channel probably.
      } else {
        currentIndex = 0;
      }
    }

    updateButton();
  }

  let debounceTimer: number;
  new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(syncState, 200);
  }).observe(document.body, { childList: true, subtree: true });

  // Clean up just in case when tab is closed to avoid the script from activating on a
  // tab that is opened later on.
  window.addEventListener("beforeunload", () => {
    if (cards.length > 0) {
      GM_setValue("loadingTab", false);
    }
  });
}
