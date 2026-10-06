// TODO: Validate
import {
  clickWhenShown,
  initVideoPlugin,
  shouldSkipCredits,
} from "../../shared";

export { hostnames, matches } from "./matches.cjs";

// TODO: Validate
const enterTheatreMode = clickWhenShown(
  "button",
  /^(?!.*exit).*theat(er|re) mode/i,
);

// TODO: Validate
const hideUpNext = clickWhenShown("div", /^hide$/i);

// TODO: Validate
const player = {
  name: "Tubi",
  watchForVideoForCompletion: true,
};

// TODO: Validate
export function init(): void {
  if (shouldSkipCredits()) {
    initVideoPlugin({
      ...player,
      endSelector: 'a[href*="autoplay=true"]',
      clickButtons: [enterTheatreMode],
    });
  } else {
    initVideoPlugin({
      ...player,
      clickButtons: [enterTheatreMode, hideUpNext],
    });
  }
}
