var gmValues = {};
var gmValueListeners = new Map();
var gmMenuCommands = new Map();
var gmNextId = 1;
var gmReady = browser.storage.local.get(null).then((items) => {
  Object.assign(gmValues, items);
});

// TODO: Validate
function gmCopy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// TODO: Validate
function gmNotify(key, oldValue, newValue, remote) {
  for (const listener of gmValueListeners.values()) {
    if (listener.key !== key) continue;
    listener.callback(key, gmCopy(oldValue), gmCopy(newValue), remote);
  }
}

// TODO: Validate
function GM_getValue(key, defaultValue) {
  return key in gmValues ? gmCopy(gmValues[key]) : defaultValue;
}

// TODO: Validate
function GM_setValue(key, value) {
  if (value === undefined) {
    GM_deleteValue(key);
    return;
  }
  const oldValue = gmValues[key];
  gmValues[key] = gmCopy(value);
  void browser.storage.local.set({ [key]: gmValues[key] });
  gmNotify(key, oldValue, gmValues[key], false);
}

// TODO: Validate
function GM_deleteValue(key) {
  if (!(key in gmValues)) return;
  const oldValue = gmValues[key];
  delete gmValues[key];
  void browser.storage.local.remove(key);
  gmNotify(key, oldValue, undefined, false);
}

// TODO: Validate
function GM_addValueChangeListener(key, callback) {
  const id = gmNextId++;
  gmValueListeners.set(id, { key, callback });
  return id;
}

// TODO: Validate
function GM_registerMenuCommand(name, callback) {
  const id = gmNextId++;
  gmMenuCommands.set(id, { name, callback });
  return id;
}

// TODO: Validate
function GM_unregisterMenuCommand(id) {
  gmMenuCommands.delete(id);
}

// TODO: Validate
function GM_xmlhttpRequest(details) {
  const { onload, onerror, ontimeout, ...request } = details;
  browser.runtime
    .sendMessage({ type: "xhr", details: request })
    .then((result) => {
      if (result.error === "timeout") {
        ontimeout?.();
      } else if (result.error) {
        onerror?.(result);
      } else if (result.buffer) {
        onload?.({
          status: result.status,
          responseText: "",
          response:
            details.responseType === "blob"
              ? new Blob([result.buffer], { type: result.contentType })
              : result.buffer,
        });
      } else {
        onload?.({
          status: result.status,
          responseText: result.text,
          response: result.text,
        });
      }
    })
    .catch((error) => onerror?.(error));
}

// TODO: Validate
function streamChannelerStart(run) {
  void gmReady.then(run);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const [key, change] of Object.entries(changes)) {
    const oldValue = gmValues[key];
    if (JSON.stringify(oldValue) === JSON.stringify(change.newValue)) continue;
    if (change.newValue === undefined) {
      delete gmValues[key];
    } else {
      gmValues[key] = change.newValue;
    }
    gmNotify(key, oldValue, change.newValue, true);
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "menu" || window.top !== window) return undefined;
  for (const command of gmMenuCommands.values()) {
    if (command.name === message.name) {
      command.callback();
      return Promise.resolve(true);
    }
  }
  return Promise.resolve(false);
});
