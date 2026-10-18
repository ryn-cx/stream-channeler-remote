// TODO: Validate
import {
  clickWhenShown,
  createLogger,
  currentTabStatus,
  initVideoPlugin,
  isControlledTab,
  sleep,
  waitForElement,
  shouldSkipCredits,
  shouldSkipIntros,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

const log = createLogger("Netflix");

// The profile to pick on Netflix's "Who's watching?" screen, and its PIN if the
// profile is locked.
const PROFILE_NAME_KEY = "netflixProfileName";
const PROFILE_PIN_KEY = "netflixProfilePin";

// From Netflix's stylesheet: the "Who's watching?" gate lists profiles as
// .profiles-gate-container li a > .profile-name, and a locked profile asks for
// its PIN in .profile-pin-prompt .pin-number-input (one box per digit).
const PROFILE_LINK_SELECTOR = [
  ".profiles-gate-container li a",
  ".list-profiles li a",
  "a.profile-link",
  '[data-uia="profile-link"]',
  '[data-uia^="action-select-profile"]',
  '[data-uia^="profile-selector+tile"]',
].join(", ");
const PIN_INPUT_SELECTOR = [
  ".profile-pin-prompt .pin-number-input",
  ".pin-input-container input",
  'input[data-uia*="pin" i]',
  'input[class*="pin" i]',
  'input[inputmode="numeric"]',
  'input[type="tel"]',
  'input[maxlength="1"]',
].join(", ");

// Type a value into a React-controlled input: set it through the native setter
// (so React notices the change) and fire the events Netflix listens for.
function typeInto(input: HTMLInputElement, value: string): void {
  input.focus();
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: value, bubbles: true }),
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent("keyup", { key: value, bubbles: true }),
  );
}

function isWatchPage(): boolean {
  return location.pathname.startsWith("/watch/");
}

// TODO: Validate
function isProfileGateShown(): boolean {
  return (
    document.querySelector(PROFILE_LINK_SELECTOR) !== null ||
    document.querySelector(PIN_INPUT_SELECTOR) !== null
  );
}

// TODO: Validate
async function enterPin(pin: string): Promise<void> {
  await waitForElement(PIN_INPUT_SELECTOR, 5_000);
  // Let the prompt finish rendering before typing.
  await sleep(500);
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(PIN_INPUT_SELECTOR),
  );
  // One box per digit. Pause between digits so the prompt can move focus.
  for (const [i, digit] of pin.split("").entries()) {
    if (inputs[i]) typeInto(inputs[i], digit);
    await sleep(150);
  }
  log.log("Entered profile PIN");
}

// TODO: Validate
async function chooseProfile(): Promise<void> {
  const name = GM_getValue<string>(PROFILE_NAME_KEY, "");
  if (!name) {
    log.warn("No Netflix profile set; waiting for one to be picked");
    return;
  }
  // Clicking as soon as the picker renders does nothing, so give it a moment.
  await sleep(1000);
  const profile = Array.from(
    document.querySelectorAll<HTMLElement>(PROFILE_LINK_SELECTOR),
  ).find(
    (link) =>
      (
        link.querySelector('.profile-name, [data-uia="profile-name"]') ?? link
      ).textContent
        ?.trim()
        .toLowerCase() === name.toLowerCase(),
  );
  if (!profile) {
    log.warn(`Profile "${name}" not found; waiting for one to be picked`);
    return;
  }
  log.log(`Selecting profile "${name}"`);
  profile.click();

  const pin = GM_getValue<string>(PROFILE_PIN_KEY, "");
  if (pin) await enterPin(pin).catch(() => log.warn("No PIN prompt found"));
}

// TODO: Validate
// Netflix may answer the episode URL with its "Who's watching?" picker,
// redirecting to /browse first. Get past it, then make sure the tab ends up on
// the episode so playback can start unattended.
async function getPastProfileGate(): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!isProfileGateShown()) {
    if (
      Date.now() > deadline ||
      (isWatchPage() && document.querySelector("video"))
    )
      return;
    await sleep(250);
  }

  await chooseProfile();
  // Wait for the picker (and any PIN prompt) to go away, however the profile
  // was picked. Give the user plenty of time when picking by hand.
  while (isProfileGateShown()) await sleep(250);
  // Let Netflix finish switching profiles before navigating.
  await sleep(1000);
  if (isWatchPage()) return;

  const target = currentTabStatus()?.url;
  if (!target) return;
  log.log("Returning to", target, "after choosing the profile");
  location.assign(target);
  // Never resolve, so the URL watcher doesn't start on the way out.
  await new Promise<never>(() => {});
}

// TODO: Validate
// TODO: Validate
const skipIntro = clickWhenShown('button[data-uia="player-skip-intro"]');

// TODO: Validate
const watchCreditsButton = 'button[data-uia="watch-credits-seamless-button"]';

// TODO: Validate
const watchCredits = clickWhenShown(watchCreditsButton);

const player = {
  name: "Netflix",
  playerToFullscreen: [".watch-video--player-view", '[data-uia="watch-video"]'],
  start: getPastProfileGate,
  // Required for playing credits and for playing the last episode of a series and
  // movies without the credits.
  watchForVideoForCompletion: true,
};

// TODO: Validate
export function init(): void {
  if (!isWatchPage()) {
    void isControlledTab().then((controlled) => {
      if (controlled) void getPastProfileGate();
    });
    return;
  }
  const introButtons = shouldSkipIntros() ? [skipIntro] : [];
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      endSelector: watchCreditsButton,
      clickButtons: introButtons,
    });
  } else {
    initVideoPlugin({
      ...player,
      clickButtons: [...introButtons, watchCredits],
    });
  }
}
