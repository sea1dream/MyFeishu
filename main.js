const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DOC_EXTENSION = ".flowdoc";
const DOC_FILTERS = [{ name: "FlowDoc 文档", extensions: [DOC_EXTENSION.slice(1)] }];
const APP_ID = "com.flowdoc.editor";
const DOCUMENT_LIBRARY_FOLDER_NAME = "本地文档";
const LIBRARY_UNTAGGED_LABEL = "未分类";
const ATTACHMENT_PREVIEW_LIMIT = 256 * 1024;
const IMAGE_PREVIEW_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"]);
const MARKDOWN_PREVIEW_EXTENSIONS = new Set([".md", ".markdown"]);
const PDF_PREVIEW_EXTENSIONS = new Set([".pdf"]);
const TEXT_PREVIEW_EXTENSIONS = new Set([
  ".txt",
  ".json",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".cjs",
  ".mjs",
  ".css",
  ".html",
  ".htm",
  ".xml",
  ".cs",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".log",
  ".csv",
  ".tsv",
  ".py",
  ".java",
  ".c",
  ".cc",
  ".cpp",
  ".cxx",
  ".h",
  ".hpp",
  ".hh",
  ".sql",
  ".sh",
  ".bat",
  ".ps1",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".kt",
  ".swift",
  ".scala",
  ".dart",
  ".lua",
  ".pl",
]);
const VIDEO_PREVIEW_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
const AUDIO_PREVIEW_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function getStorageRoot() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }

  return app.isPackaged ? path.dirname(process.execPath) : __dirname;
}

function getAssetDirectories() {
  const storageRoot = getStorageRoot();

  return {
    images: path.join(storageRoot, "images"),
    attachments: path.join(storageRoot, "attachments"),
  };
}

function getDocumentLibraryRoot() {
  return path.join(app.getPath("desktop"), DOCUMENT_LIBRARY_FOLDER_NAME);
}

function getLegacyStorageRoots() {
  return [...new Set([__dirname])];
}

function ensureGlobalAssetDirectories() {
  Object.values(getAssetDirectories()).forEach((directory) => {
    fs.mkdirSync(directory, { recursive: true });
  });
}

function ensureDocumentLibraryRoot() {
  fs.mkdirSync(getDocumentLibraryRoot(), { recursive: true });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: "#efe5d8",
    title: "FlowDoc Editor",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  window.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  app.setAppUserModelId(APP_ID);
  ensureGlobalAssetDirectories();
  ensureDocumentLibraryRoot();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function ensureDocumentExtension(filePath) {
  return path.extname(filePath) ? filePath : `${filePath}${DOC_EXTENSION}`;
}

function getDocumentTitleFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath)) || "未命名文档";
}

function normalizeDocumentTitle(title) {
  const normalized = String(title || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, " ")
    .replace(/\s+/gu, " ")
    .replace(/[. ]+$/gu, "")
    .trim();

  return normalized || "未命名文档";
}

function normalizeDocumentTag(tag) {
  const normalized = String(tag || "").replace(/\s+/gu, " ").trim();
  return normalized || "";
}

function normalizeDocumentTags(tags) {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(/[,，\n]/u)
      : [];
  const seen = new Set();
  const normalized = [];

  values.forEach((value) => {
    const nextTag = normalizeDocumentTag(value);

    if (!nextTag) {
      return;
    }

    const key = nextTag.toLocaleLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(nextTag);
  });

  return normalized;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDefaultHtml(filePath) {
  const fileName = getDocumentTitleFromPath(filePath);
  const title = escapeHtml(fileName || "未命名文档");
  return `<h1>${title}</h1><p><br></p>`;
}

function readDocument(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  if (!data || typeof data.html !== "string") {
    throw new Error("文档格式不正确，缺少 html 内容。");
  }

  return {
    filePath,
    title: getDocumentTitleFromPath(filePath),
    html: data.html,
    tags: normalizeDocumentTags(data.tags),
    version: data.version || 1,
    updatedAt: data.updatedAt || null,
  };
}

function writeDocument(filePath, html, options = {}) {
  const preservedTags =
    options.tags === undefined && fs.existsSync(filePath)
      ? (() => {
          try {
            return readDocument(filePath).tags;
          } catch (_error) {
            return [];
          }
        })()
      : [];
  const payload = {
    kind: "flowdoc",
    version: 1,
    updatedAt: new Date().toISOString(),
    html,
    tags: normalizeDocumentTags(options.tags ?? preservedTags),
  };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function decodeHtmlAttribute(value) {
  return String(value || "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function normalizeStoredAttachmentPath(resourcePath) {
  const normalized = decodeHtmlAttribute(resourcePath).split("\\").join("/").trim();
  return normalized.startsWith("attachments/") ? normalized : "";
}

function extractAttachmentPathsFromHtml(html) {
  const attachmentPaths = new Set();
  const source = String(html || "");
  const tagPattern = /<[^>]+>/gu;
  let match = tagPattern.exec(source);

  while (match) {
    const tag = match[0];
    const isAttachmentNode =
      /data-kind\s*=\s*"attachment"/iu.test(tag) || /class\s*=\s*"[^"]*\battachment-node\b[^"]*"/iu.test(tag);

    if (isAttachmentNode) {
      const srcMatch = tag.match(/data-src\s*=\s*"([^"]+)"/iu);
      const relativePath = normalizeStoredAttachmentPath(srcMatch?.[1] || "");

      if (relativePath) {
        attachmentPaths.add(relativePath);
      }
    }

    match = tagPattern.exec(source);
  }

  return attachmentPaths;
}

function getAttachmentReferenceRoots(currentFilePath) {
  return [
    getDocumentLibraryRoot(),
    path.dirname(currentFilePath || getDocumentLibraryRoot()),
  ].filter((directory, index, collection) => {
    const resolvedDirectory = path.resolve(directory);
    return collection.findIndex((candidate) => path.resolve(candidate) === resolvedDirectory) === index;
  });
}

function listReferenceDocuments(currentFilePath) {
  const files = new Set();

  getAttachmentReferenceRoots(currentFilePath).forEach((rootDirectory) => {
    listFlowDocFiles(rootDirectory).forEach((filePath) => {
      files.add(path.resolve(filePath));
    });
  });

  return [...files];
}

function isAttachmentReferencedByAnyDocument(resourcePath, currentFilePath) {
  const targetPath = normalizeStoredAttachmentPath(resourcePath);

  if (!targetPath) {
    return false;
  }

  return listReferenceDocuments(currentFilePath).some((filePath) => {
    try {
      const document = readDocument(filePath);
      return extractAttachmentPathsFromHtml(document.html).has(targetPath);
    } catch (_error) {
      return false;
    }
  });
}

function cleanupRemovedAttachments(filePath, previousHtml, nextHtml) {
  const previousPaths = extractAttachmentPathsFromHtml(previousHtml);
  const nextPaths = extractAttachmentPathsFromHtml(nextHtml);
  const removedPaths = [...previousPaths].filter((resourcePath) => !nextPaths.has(resourcePath));
  const cleaned = [];

  removedPaths.forEach((resourcePath) => {
    if (isAttachmentReferencedByAnyDocument(resourcePath, filePath)) {
      return;
    }

    const resolved = resolveResource(filePath, resourcePath);

    if (!resolved.exists) {
      return;
    }

    try {
      fs.unlinkSync(resolved.absolutePath);
      cleaned.push(resourcePath);
    } catch (_error) {
      // Ignore cleanup errors so the document save itself still succeeds.
    }
  });

  return cleaned;
}

function listFilesRecursively(rootDirectory) {
  if (!fs.existsSync(rootDirectory)) {
    return [];
  }

  const results = [];
  const pending = [rootDirectory];

  while (pending.length) {
    const currentDirectory = pending.pop();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        pending.push(fullPath);
        return;
      }

      if (entry.isFile()) {
        results.push(fullPath);
      }
    });
  }

  return results;
}

function getReferencedAttachmentPaths(currentFilePath) {
  const references = new Set();

  listReferenceDocuments(currentFilePath).forEach((filePath) => {
    try {
      const document = readDocument(filePath);
      extractAttachmentPathsFromHtml(document.html).forEach((resourcePath) => {
        references.add(resourcePath);
      });
    } catch (_error) {
      // Ignore broken documents during attachment cleanup.
    }
  });

  return references;
}

function cleanupOrphanedAttachments(currentFilePath) {
  const attachmentDirectory = getAssetDirectory("attachments");
  const referencedPaths = getReferencedAttachmentPaths(currentFilePath);
  const cleaned = [];

  listFilesRecursively(attachmentDirectory).forEach((absolutePath) => {
    const relativePath = buildStoredResourcePath(
      "attachments",
      path.relative(attachmentDirectory, absolutePath).split(path.sep).join("/"),
    );

    if (referencedPaths.has(relativePath)) {
      return;
    }

    try {
      fs.unlinkSync(absolutePath);
      cleaned.push(relativePath);
    } catch (_error) {
      // Ignore cleanup errors so document save still succeeds.
    }
  });

  return cleaned;
}

function findMovedDocumentPath(filePath, htmlSnapshot) {
  if (!htmlSnapshot) {
    return null;
  }

  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    return null;
  }

  const matches = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === DOC_EXTENSION)
    .map((entry) => path.join(directory, entry.name))
    .filter((candidatePath) => path.resolve(candidatePath) !== path.resolve(filePath))
    .filter((candidatePath) => {
      try {
        const candidate = readDocument(candidatePath);
        return candidate.html === htmlSnapshot;
      } catch (_error) {
        return false;
      }
    });

  return matches.length === 1 ? matches[0] : null;
}

function listFlowDocFiles(rootDirectory) {
  if (!fs.existsSync(rootDirectory)) {
    return [];
  }

  const results = [];
  const pending = [rootDirectory];

  while (pending.length) {
    const currentDirectory = pending.pop();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        pending.push(fullPath);
        return;
      }

      if (entry.isFile() && path.extname(entry.name).toLowerCase() === DOC_EXTENSION) {
        results.push(fullPath);
      }
    });
  }

  return results;
}

function compareLibraryDocuments(left, right) {
  const leftTime = Date.parse(left.updatedAt || "") || 0;
  const rightTime = Date.parse(right.updatedAt || "") || 0;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function indexDocumentLibrary() {
  const rootPath = getDocumentLibraryRoot();
  ensureDocumentLibraryRoot();
  const documents = listFlowDocFiles(rootPath)
    .map((filePath) => {
      try {
        const document = readDocument(filePath);
        const relativePath = path.relative(rootPath, filePath).split(path.sep).join("/");

        return {
          filePath,
          relativePath,
          title: document.title,
          tags: document.tags,
          updatedAt: document.updatedAt,
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort(compareLibraryDocuments);

  return {
    rootPath,
    untaggedLabel: LIBRARY_UNTAGGED_LABEL,
    documents,
  };
}

function splitBaseName(fileName) {
  const extension = path.extname(fileName);
  const name = path.basename(fileName, extension) || "resource";
  return { name, extension };
}

function getUniqueTargetPath(directory, desiredName) {
  const { name, extension } = splitBaseName(desiredName);
  let counter = 0;
  let candidate = path.join(directory, desiredName);

  while (fs.existsSync(candidate)) {
    counter += 1;
    candidate = path.join(directory, `${name}-${counter}${extension}`);
  }

  return candidate;
}

function getAssetDirectory(folderName) {
  const directory = getAssetDirectories()[folderName];

  if (!directory) {
    throw new Error("不支持的资源目录。");
  }

  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function buildStoredResourcePath(folderName, fileName) {
  return `${folderName}/${fileName}`;
}

function copyFileIntoLibrary(folderName, sourceFilePath) {
  const assetDirectory = getAssetDirectory(folderName);
  const targetPath = getUniqueTargetPath(assetDirectory, path.basename(sourceFilePath));
  fs.copyFileSync(sourceFilePath, targetPath);

  return {
    name: path.basename(targetPath),
    relativePath: buildStoredResourcePath(folderName, path.basename(targetPath)),
  };
}

function parseDataUrl(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/u.exec(dataUrl);

  if (!match) {
    throw new Error("无法解析剪贴板图片数据。");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function mimeTypeToExtension(mimeType) {
  const mapping = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg",
  };

  return mapping[mimeType] || ".png";
}

function saveClipboardImage(dataUrl, suggestedName) {
  const assetDirectory = getAssetDirectory("images");
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = path.extname(suggestedName) || mimeTypeToExtension(mimeType);
  const baseName = path.basename(suggestedName, path.extname(suggestedName)) || "pasted-image";
  const targetPath = getUniqueTargetPath(assetDirectory, `${baseName}${extension}`);

  fs.writeFileSync(targetPath, buffer);

  return {
    name: path.basename(targetPath),
    relativePath: buildStoredResourcePath("images", path.basename(targetPath)),
  };
}

function resolveFromKnownRoots(resourcePath) {
  const normalized = resourcePath.split("\\").join("/");
  const candidates = [];
  const directories = getAssetDirectories();

  if (normalized.startsWith("images/")) {
    candidates.push(path.join(directories.images, normalized.slice("images/".length)));
  }

  if (normalized.startsWith("attachments/")) {
    candidates.push(path.join(directories.attachments, normalized.slice("attachments/".length)));
  }

  for (const legacyRoot of getLegacyStorageRoots()) {
    if (normalized.startsWith("images/")) {
      candidates.push(path.join(legacyRoot, "images", normalized.slice("images/".length)));
    }

    if (normalized.startsWith("attachments/")) {
      candidates.push(path.join(legacyRoot, "attachments", normalized.slice("attachments/".length)));
    }
  }

  return candidates;
}

function resolveResource(documentPath, resourcePath) {
  let absolutePath;

  if (path.isAbsolute(resourcePath)) {
    absolutePath = resourcePath;
  } else {
    const storageCandidates = resolveFromKnownRoots(resourcePath);
    const legacyDocumentLocalPath = path.resolve(
      path.dirname(documentPath || getStorageRoot()),
      resourcePath,
    );

    absolutePath =
      storageCandidates.find((candidate) => fs.existsSync(candidate)) ||
      (fs.existsSync(legacyDocumentLocalPath) ? legacyDocumentLocalPath : null) ||
      storageCandidates[0] ||
      legacyDocumentLocalPath;
  }

  const exists = fs.existsSync(absolutePath);

  return {
    exists,
    absolutePath,
    name: path.basename(absolutePath),
    fileUrl: exists ? pathToFileURL(absolutePath).href : null,
  };
}

function copyAttachmentToDownloads(documentPath, resourcePath) {
  const resolved = resolveResource(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("附件文件不存在，无法复制到 Downloads。");
  }

  const downloadsDirectory = path.join(os.homedir(), "Downloads");
  fs.mkdirSync(downloadsDirectory, { recursive: true });

  const targetPath = getUniqueTargetPath(downloadsDirectory, path.basename(resolved.absolutePath));
  fs.copyFileSync(resolved.absolutePath, targetPath);

  return {
    savedPath: targetPath,
    fileName: path.basename(targetPath),
  };
}

async function saveResourceAs(browserWindow, documentPath, resourcePath, options = {}) {
  const resolved = resolveResource(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("资源文件不存在，无法另存为。");
  }

  const defaultDirectory = app.getPath(options.defaultDirectoryKey || "pictures");
  const result = await dialog.showSaveDialog(browserWindow, {
    title: options.title || "资源另存为",
    defaultPath: path.join(defaultDirectory, path.basename(resolved.absolutePath)),
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.mkdirSync(path.dirname(result.filePath), { recursive: true });
  fs.copyFileSync(resolved.absolutePath, result.filePath);

  return {
    canceled: false,
    savedPath: result.filePath,
    fileName: path.basename(result.filePath),
  };
}

async function openResourceWithSystem(documentPath, resourcePath) {
  const resolved = resolveResource(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("资源文件不存在，无法打开。");
  }

  const errorMessage = await shell.openPath(resolved.absolutePath);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return {
    success: true,
    openedPath: resolved.absolutePath,
  };
}

function revealResourceInFolder(documentPath, resourcePath) {
  const resolved = resolveResource(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("资源文件不存在，无法在资源管理器中显示。");
  }

  shell.showItemInFolder(resolved.absolutePath);

  return {
    success: true,
    absolutePath: resolved.absolutePath,
  };
}

function getAttachmentPreviewKind(filePath) {
  const extension = path.extname(filePath || "").toLowerCase();

  if (IMAGE_PREVIEW_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (MARKDOWN_PREVIEW_EXTENSIONS.has(extension)) {
    return "markdown";
  }

  if (PDF_PREVIEW_EXTENSIONS.has(extension)) {
    return "pdf";
  }

  if (TEXT_PREVIEW_EXTENSIONS.has(extension)) {
    return "text";
  }

  if (VIDEO_PREVIEW_EXTENSIONS.has(extension)) {
    return "video";
  }

  if (AUDIO_PREVIEW_EXTENSIONS.has(extension)) {
    return "audio";
  }

  return "unsupported";
}

function readTextPreview(filePath, limit = ATTACHMENT_PREVIEW_LIMIT) {
  const fileSize = fs.statSync(filePath).size;
  const targetSize = Math.min(fileSize, limit);
  const buffer = Buffer.alloc(targetSize);
  const fileHandle = fs.openSync(filePath, "r");

  try {
    fs.readSync(fileHandle, buffer, 0, targetSize, 0);
  } finally {
    fs.closeSync(fileHandle);
  }

  return {
    content: buffer.toString("utf8"),
    truncated: fileSize > limit,
    size: fileSize,
  };
}

function previewAttachment(documentPath, resourcePath) {
  const resolved = resolveResource(documentPath, resourcePath);
  const previewKind = getAttachmentPreviewKind(resolved.absolutePath);

  if (!resolved.exists) {
    return {
      exists: false,
      previewable: false,
      previewKind,
      name: resolved.name,
      absolutePath: resolved.absolutePath,
      fileUrl: null,
      size: 0,
    };
  }

  const stat = fs.statSync(resolved.absolutePath);

  if (previewKind === "text" || previewKind === "markdown") {
    const textPreview = readTextPreview(resolved.absolutePath);

    return {
      exists: true,
      previewable: true,
      previewKind,
      name: resolved.name,
      absolutePath: resolved.absolutePath,
      fileUrl: resolved.fileUrl,
      size: textPreview.size,
      content: textPreview.content,
      truncated: textPreview.truncated,
    };
  }

  return {
    exists: true,
    previewable: previewKind !== "unsupported",
    previewKind,
    name: resolved.name,
    absolutePath: resolved.absolutePath,
    fileUrl: resolved.fileUrl,
    size: stat.size,
  };
}

async function askDocumentPathForCreate(browserWindow) {
  const result = await dialog.showSaveDialog(browserWindow, {
    title: "选择新文档的位置",
    defaultPath: path.join(getDocumentLibraryRoot(), `未命名文档${DOC_EXTENSION}`),
    filters: DOC_FILTERS,
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const filePath = ensureDocumentExtension(result.filePath);

  if (fs.existsSync(filePath)) {
    const overwriteResult = await dialog.showMessageBox(browserWindow, {
      type: "warning",
      buttons: ["覆盖", "取消"],
      defaultId: 1,
      cancelId: 1,
      title: "文件已存在",
      message: "目标位置已经存在同名文档。",
      detail: "继续将覆盖该文件，并以空白文档重新开始。",
    });

    if (overwriteResult.response !== 0) {
      return { canceled: true };
    }
  }

  return { canceled: false, filePath };
}

ipcMain.handle("document:new", async (event) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  const selection = await askDocumentPathForCreate(browserWindow);

  if (selection.canceled) {
    return { canceled: true };
  }

  const html = getDefaultHtml(selection.filePath);
  writeDocument(selection.filePath, html, { tags: [] });

  return {
    canceled: false,
    document: {
      filePath: selection.filePath,
      title: getDocumentTitleFromPath(selection.filePath),
      html,
      tags: [],
    },
  };
});

ipcMain.handle("document:open", async (event) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(browserWindow, {
    title: "打开文档",
    defaultPath: getDocumentLibraryRoot(),
    filters: DOC_FILTERS,
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const document = readDocument(result.filePaths[0]);
  return { canceled: false, document };
});

ipcMain.handle("document:open-path", async (_event, payload) => {
  if (!payload || !payload.filePath) {
    throw new Error("打开文档失败：缺少文档路径。");
  }

  return readDocument(ensureDocumentExtension(payload.filePath));
});

ipcMain.handle("document:save", async (_event, payload) => {
  if (!payload || !payload.filePath || typeof payload.html !== "string") {
    throw new Error("保存失败：缺少文档路径或内容。");
  }

  const filePath = ensureDocumentExtension(payload.filePath);
  const previousHtml =
    fs.existsSync(filePath)
      ? (() => {
          try {
            return readDocument(filePath).html;
          } catch (_error) {
            return "";
          }
        })()
      : "";
  const saved = writeDocument(filePath, payload.html, { tags: payload.tags });
  const cleanedAttachments = [
    ...new Set([
      ...cleanupRemovedAttachments(filePath, previousHtml, payload.html),
      ...cleanupOrphanedAttachments(filePath),
    ]),
  ];
  return { success: true, updatedAt: saved.updatedAt, cleanedAttachments };
});

ipcMain.handle("document:refresh-path", async (_event, payload) => {
  if (!payload || !payload.filePath) {
    throw new Error("同步文档路径失败：缺少文档路径。");
  }

  const currentPath = ensureDocumentExtension(payload.filePath);

  if (fs.existsSync(currentPath)) {
    return {
      exists: true,
      changed: false,
      filePath: currentPath,
      title: getDocumentTitleFromPath(currentPath),
    };
  }

  const movedPath = findMovedDocumentPath(currentPath, payload.lastSavedHtml);

  if (!movedPath) {
    return {
      exists: false,
      changed: false,
      filePath: currentPath,
      title: getDocumentTitleFromPath(currentPath),
    };
  }

  return {
    exists: true,
    changed: true,
    filePath: movedPath,
    title: getDocumentTitleFromPath(movedPath),
  };
});

ipcMain.handle("document:rename", async (_event, payload) => {
  if (!payload || !payload.filePath) {
    throw new Error("重命名失败：缺少文档路径。");
  }

  const currentPath = ensureDocumentExtension(payload.filePath);
  const extension = path.extname(currentPath) || DOC_EXTENSION;
  const nextTitle = normalizeDocumentTitle(payload.title);
  const desiredPath = path.join(path.dirname(currentPath), `${nextTitle}${extension}`);
  const samePath = path.resolve(currentPath) === path.resolve(desiredPath);

  if (!samePath) {
    const targetPath = fs.existsSync(desiredPath)
      ? getUniqueTargetPath(path.dirname(currentPath), `${nextTitle}${extension}`)
      : desiredPath;

    fs.renameSync(currentPath, targetPath);

    return {
      success: true,
      filePath: targetPath,
      title: getDocumentTitleFromPath(targetPath),
    };
  }

  return {
    success: true,
    filePath: currentPath,
    title: getDocumentTitleFromPath(currentPath),
  };
});

ipcMain.handle("resource:insert-images", async (event, payload) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);

  if (!payload || !payload.docPath) {
    throw new Error("请先创建或打开文档，再插入图片。");
  }

  const result = await dialog.showOpenDialog(browserWindow, {
    title: "选择图片",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "图片",
        extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, files: [] };
  }

  return {
    canceled: false,
    files: result.filePaths.map((sourcePath) => copyFileIntoLibrary("images", sourcePath)),
  };
});

ipcMain.handle("resource:insert-attachments", async (event, payload) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);

  if (!payload || !payload.docPath) {
    throw new Error("请先创建或打开文档，再上传附件。");
  }

  const result = await dialog.showOpenDialog(browserWindow, {
    title: "选择附件",
    properties: ["openFile", "multiSelections"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, files: [] };
  }

  return {
    canceled: false,
    files: result.filePaths.map((sourcePath) => copyFileIntoLibrary("attachments", sourcePath)),
  };
});

ipcMain.handle("resource:save-pasted-image", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.dataUrl) {
    throw new Error("无法保存剪贴板图片：缺少文档路径或图片数据。");
  }

  return saveClipboardImage(
    payload.dataUrl,
    payload.suggestedName || `pasted-image-${Date.now()}.png`,
  );
});

ipcMain.handle("resource:resolve", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法解析资源路径。");
  }

  return resolveResource(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:save-image-as", async (event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法另存图片：缺少文档路径或图片路径。");
  }

  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  return saveResourceAs(browserWindow, payload.docPath, payload.relativePath, {
    title: "图片另存为",
    defaultDirectoryKey: "pictures",
  });
});

ipcMain.handle("resource:open-image", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法打开图片：缺少文档路径或图片路径。");
  }

  return openResourceWithSystem(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:reveal-image-in-folder", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法定位图片：缺少文档路径或图片路径。");
  }

  return revealResourceInFolder(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:download-attachment", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法下载附件：缺少文档路径或资源路径。");
  }

  return copyAttachmentToDownloads(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:preview-attachment", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法预览附件：缺少文档路径或资源路径。");
  }

  return previewAttachment(payload.docPath, payload.relativePath);
});

ipcMain.handle("library:index", async () => {
  return indexDocumentLibrary();
});
