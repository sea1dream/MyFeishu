const { clipboard, contextBridge, ipcRenderer, shell } = require("electron");
const hljs = require("highlight.js");
const { highlightCode } = require("./shared/highlight-code");

contextBridge.exposeInMainWorld("flowDocApi", {
  createDocument: () => ipcRenderer.invoke("document:new"),
  openDocument: () => ipcRenderer.invoke("document:open"),
  openDocumentAtPath: (filePath) => ipcRenderer.invoke("document:open-path", { filePath }),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  exportPdf: (payload) => ipcRenderer.invoke("document:export-pdf", payload),
  exportFlowzip: (payload) => ipcRenderer.invoke("archive:export-flowzip", payload),
  importFlowzip: () => ipcRenderer.invoke("archive:import"),
  refreshDocumentPath: (payload) => ipcRenderer.invoke("document:refresh-path", payload),
  renameDocument: (payload) => ipcRenderer.invoke("document:rename", payload),
  loadDocumentLibrary: () => ipcRenderer.invoke("library:index"),
  chooseDocumentLibraryRoot: () => ipcRenderer.invoke("library:choose-root"),
  resetDocumentLibraryRoot: () => ipcRenderer.invoke("library:reset-root"),
  insertImages: (docPath) => ipcRenderer.invoke("resource:insert-images", { docPath }),
  insertAttachments: (docPath) => ipcRenderer.invoke("resource:insert-attachments", { docPath }),
  savePastedImage: (payload) => ipcRenderer.invoke("resource:save-pasted-image", payload),
  resolveResource: (payload) => ipcRenderer.invoke("resource:resolve", payload),
  saveImageAs: (payload) => ipcRenderer.invoke("resource:save-image-as", payload),
  openImage: (payload) => ipcRenderer.invoke("resource:open-image", payload),
  revealImageInFolder: (payload) => ipcRenderer.invoke("resource:reveal-image-in-folder", payload),
  previewAttachment: (payload) => ipcRenderer.invoke("resource:preview-attachment", payload),
  downloadAttachment: (payload) => ipcRenderer.invoke("resource:download-attachment", payload),
  onDocumentOpenRequested: (callback) => {
    if (typeof callback !== "function") {
      return () => {};
    }

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on("app:open-document-request", listener);
    return () => {
      ipcRenderer.removeListener("app:open-document-request", listener);
    };
  },
  copyText: (text) => {
    clipboard.writeText(typeof text === "string" ? text : "");
    return true;
  },
  openExternal: (url) => shell.openExternal(String(url || "")),
  highlightCode: ({ code, language }) => highlightCode({ code, language, hljs }),
});
