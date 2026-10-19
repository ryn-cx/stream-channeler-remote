// TODO: Validate
declare module "*.less";

declare module "*.matches.cjs" {
  export const hostnames: string[];
}

declare const STREAM_CHANNELER_APP: true | undefined;

// Tampermonkey GM_* sync API
declare function GM_getValue<T>(key: string, defaultValue: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;
declare function GM_addValueChangeListener(
  key: string,
  callback: (
    name: string,
    oldValue: unknown,
    newValue: unknown,
    remote: boolean,
  ) => void,
): number;
declare function GM_registerMenuCommand(
  name: string,
  callback: () => void,
): number;
declare function GM_unregisterMenuCommand(id: number): void;
interface GMXhrResponse {
  status: number;
  responseText: string;
  response: unknown;
}
declare function GM_xmlhttpRequest(details: {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  data?: string;
  responseType?: "text" | "blob" | "arraybuffer";
  timeout?: number;
  onload?: (response: GMXhrResponse) => void;
  onerror?: (response: unknown) => void;
  ontimeout?: () => void;
}): void;

interface Element {
  checkVisibility(options?: {
    opacityProperty?: boolean;
    visibilityProperty?: boolean;
  }): boolean;
}
