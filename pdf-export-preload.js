const { contextBridge } = require("electron");
let hljs = null;
const { highlightCode } = require("./shared/highlight-code");

try {
  hljs = require("highlight.js");
} catch {
  hljs = null;
}

contextBridge.exposeInMainWorld("flowDocPdfExport", {
  highlightCode: ({ code, language } = {}) => highlightCode({ code, language, hljs }),
});
