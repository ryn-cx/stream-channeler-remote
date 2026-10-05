// TODO: Validate
import { initUrlChangePlugin } from "../../shared";

export { hostnames, matches } from "./matches.cjs";

export function init(): void {
  // Basic implementation: assume Peacock navigates to a new URL when the video ends.
  initUrlChangePlugin("Peacock");
}
