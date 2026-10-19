// TODO: Validate
import { initVideoPlugin } from "../../shared";

export { hostnames } from "./matches.cjs";

// TODO: Validate
export function init(): void {
  initVideoPlugin({
    name: "HiDive",
    watchForVideoForCompletion: true,
  });
}
