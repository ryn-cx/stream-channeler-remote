browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs
    .sendMessage(tab.id, { type: "menu", name: "Settings" }, { frameId: 0 })
    .catch(() => {});
});

// TODO: Validate
async function request(details) {
  const controller = new AbortController();
  const timer = details.timeout
    ? setTimeout(() => controller.abort(), details.timeout)
    : null;
  try {
    const response = await fetch(details.url, {
      method: details.method,
      headers: details.headers,
      body: details.data,
      signal: controller.signal,
    });
    if (details.responseType === "blob" || details.responseType === "arraybuffer") {
      return {
        status: response.status,
        buffer: await response.arrayBuffer(),
        contentType: response.headers.get("content-type") ?? "",
      };
    }
    return { status: response.status, text: await response.text() };
  } catch (error) {
    return { error: controller.signal.aborted ? "timeout" : String(error) };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "xhr") return request(message.details);
  return undefined;
});
