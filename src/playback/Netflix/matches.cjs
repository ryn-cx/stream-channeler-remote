module.exports = {
  hostnames: ["netflix.com"],
  // Not just /watch/*: Netflix can bounce a new tab to its "Who's watching?"
  // profile picker on another page first.
  matches: ["https://www.netflix.com/*"],
};
