const { clipboard, contextBridge, ipcRenderer, shell } = require("electron");
const hljs = require("highlight.js");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

contextBridge.exposeInMainWorld("flowDocApi", {
  createDocument: () => ipcRenderer.invoke("document:new"),
  openDocument: () => ipcRenderer.invoke("document:open"),
  openDocumentAtPath: (filePath) => ipcRenderer.invoke("document:open-path", { filePath }),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  refreshDocumentPath: (payload) => ipcRenderer.invoke("document:refresh-path", payload),
  renameDocument: (payload) => ipcRenderer.invoke("document:rename", payload),
  loadDocumentLibrary: () => ipcRenderer.invoke("library:index"),
  insertImages: (docPath) => ipcRenderer.invoke("resource:insert-images", { docPath }),
  insertAttachments: (docPath) => ipcRenderer.invoke("resource:insert-attachments", { docPath }),
  savePastedImage: (payload) => ipcRenderer.invoke("resource:save-pasted-image", payload),
  resolveResource: (payload) => ipcRenderer.invoke("resource:resolve", payload),
  previewAttachment: (payload) => ipcRenderer.invoke("resource:preview-attachment", payload),
  downloadAttachment: (payload) => ipcRenderer.invoke("resource:download-attachment", payload),
  copyText: (text) => {
    clipboard.writeText(typeof text === "string" ? text : "");
    return true;
  },
  openExternal: (url) => shell.openExternal(String(url || "")),
  highlightCode: ({ code, language }) => {
    const rawCode = typeof code === "string" ? code : "";
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
