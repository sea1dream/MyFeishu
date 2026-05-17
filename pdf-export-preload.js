const { contextBridge } = require("electron");
let hljs = null;

try {
  hljs = require("highlight.js");
} catch (_error) {
  hljs = null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeCodeText(value) {
  return String(value || "").replaceAll("\r\n", "\n").replaceAll("\u00a0", " ");
}

contextBridge.exposeInMainWorld("flowDocPdfExport", {
  highlightCode({ code, language } = {}) {
    const rawCode = normalizeCodeText(code);
    const mode = language || "auto";

    if (!rawCode) {
      return {
        html: "",
        detectedLanguage: mode === "auto" ? "plaintext" : mode,
      };
    }

    if (mode === "plaintext") {
      return {
        html: escapeHtml(rawCode),
        detectedLanguage: "plaintext",
      };
    }

    if (!hljs) {
      return {
        html: escapeHtml(rawCode),
        detectedLanguage: mode === "auto" ? "plaintext" : mode,
      };
    }

    try {
      if (mode === "auto") {
        const result = hljs.highlightAuto(rawCode);
        return {
          html: result.value,
          detectedLanguage: result.language || "plaintext",
        };
      }

      return {
        html: hljs.highlight(rawCode, { language: mode, ignoreIllegals: true }).value,
        detectedLanguage: mode,
      };
    } catch (_error) {
      return {
        html: escapeHtml(rawCode),
        detectedLanguage: "plaintext",
      };
    }
  },
});
