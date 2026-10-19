// TODO: Validate
const { author, version, repository, description } = require("../package.json");

module.exports = {
  name: "Stream Channeler Remote",
  namespace: "https://streamchanneler.com/",
  version: version,
  author: author,
  description: description,
  match: ["*://*/*"],
  source: repository.url,
  grant: [
    "GM_setValue",
    "GM_getValue",
    "GM_addValueChangeListener",
    "GM_deleteValue",
    "GM_registerMenuCommand",
    "GM_unregisterMenuCommand",
    "GM_xmlhttpRequest",
  ],
  connect: ["api.streamchanneler.com", "*"],
  "run-at": "document-start",
};
