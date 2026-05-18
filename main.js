const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  DOC_EXTENSION,
  PDF_EXTENSION,
  ensureDocumentExtension: sharedEnsureDocumentExtension,
  ensurePdfExtension: sharedEnsurePdfExtension,
  getDocumentTitleFromPath: sharedGetDocumentTitleFromPath,
  migrateDocumentPayload,
  normalizeDocumentTags: sharedNormalizeDocumentTags,
  normalizeDocumentTitle: sharedNormalizeDocumentTitle,
  serializeDocumentPayload,
} = require("./shared/document-format");
const { readDocumentLibraryPreference, writeDocumentLibraryPreference } = require("./shared/library-root-settings");
const { resolveDocumentLibraryRootInfo, resolveDownloadsDirectory } = require("./shared/path-config");
const { buildPdfExportHtml: buildPdfExportHtmlTemplate } = require("./main-modules/pdf-export-template");
const ensureDocumentExtension = sharedEnsureDocumentExtension;

const DOC_FILTERS = [{ name: "FlowDoc 文档", extensions: [DOC_EXTENSION.slice(1)] }];
const APP_ID = "com.flowdoc.editor";
const LIBRARY_UNTAGGED_LABEL = "未分类";
const ATTACHMENT_PREVIEW_LIMIT = 256 * 1024;
const HIGHLIGHT_THEME_PATH = path.join(
  __dirname,
  "node_modules",
  "highlight.js",
  "styles",
  "atom-one-dark-reasonable.min.css",
);
const PDF_EXPORT_PRELOAD_PATH = path.join(__dirname, "pdf-export-preload.js");
const LOCAL_FONTS_ROOT = path.join(__dirname, "assets", "fonts");
const LOCAL_FONT_FACES = [
  { family: "Google Sans Code", directory: "google-sans-code", fileName: "GoogleSansCode-Regular.ttf", fontWeight: 400 },
  { family: "Google Sans Code", directory: "google-sans-code", fileName: "GoogleSansCode-Medium.ttf", fontWeight: 500 },
  { family: "Google Sans Code", directory: "google-sans-code", fileName: "GoogleSansCode-Bold.ttf", fontWeight: 700 },
  { family: "Atkinson Hyperlegible Next", directory: "atkinson-hyperlegible-next", fileName: "AtkinsonHyperlegibleNext-Regular.ttf", fontWeight: 400 },
  { family: "Atkinson Hyperlegible Next", directory: "atkinson-hyperlegible-next", fileName: "AtkinsonHyperlegibleNext-Medium.ttf", fontWeight: 500 },
  { family: "Atkinson Hyperlegible Next", directory: "atkinson-hyperlegible-next", fileName: "AtkinsonHyperlegibleNext-Bold.ttf", fontWeight: 700 },
  { family: "IBM Plex Sans", directory: "ibm-plex-sans", fileName: "IBMPlexSans-Regular.ttf", fontWeight: 400 },
  { family: "IBM Plex Sans", directory: "ibm-plex-sans", fileName: "IBMPlexSans-Medium.ttf", fontWeight: 500 },
  { family: "IBM Plex Sans", directory: "ibm-plex-sans", fileName: "IBMPlexSans-Bold.ttf", fontWeight: 700 },
  { family: "Source Sans 3", directory: "source-sans-3", fileName: "SourceSans3-Regular.ttf", fontWeight: 400 },
  { family: "Source Sans 3", directory: "source-sans-3", fileName: "SourceSans3-Medium.ttf", fontWeight: 500 },
  { family: "Source Sans 3", directory: "source-sans-3", fileName: "SourceSans3-Bold.ttf", fontWeight: 700 },
  { family: "JetBrains Mono", directory: "jetbrains-mono", fileName: "JetBrainsMono-Regular.ttf", fontWeight: 400 },
  { family: "JetBrains Mono", directory: "jetbrains-mono", fileName: "JetBrainsMono-Medium.ttf", fontWeight: 500 },
  { family: "JetBrains Mono", directory: "jetbrains-mono", fileName: "JetBrainsMono-Bold.ttf", fontWeight: 700 },
  { family: "Fira Code", directory: "fira-code", fileName: "FiraCode-Regular.ttf", fontWeight: 400 },
  { family: "Fira Code", directory: "fira-code", fileName: "FiraCode-Medium.ttf", fontWeight: 500 },
  { family: "Fira Code", directory: "fira-code", fileName: "FiraCode-Bold.ttf", fontWeight: 700 },
];
const PDF_DOCUMENT_FONT_STYLES = {
  atkinson: {
    bodyFamily:
      '"Atkinson Hyperlegible Next", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    displayFamily:
      '"Atkinson Hyperlegible Next", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  },
  plex: {
    bodyFamily: '"IBM Plex Sans", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    displayFamily:
      '"IBM Plex Sans", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  },
  source: {
    bodyFamily: '"Source Sans 3", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    displayFamily:
      '"Source Sans 3", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  },
  "google-sans-code": {
    bodyFamily: '"Google Sans Code", "Cascadia Mono", "Consolas", monospace',
    displayFamily: '"Google Sans Code", "Cascadia Mono", "Consolas", monospace',
  },
};
const PDF_CODE_FONT_STYLES = {
  "google-sans-code": {
    codeFamily: '"Google Sans Code", "Cascadia Code", "Consolas", monospace',
  },
  "jetbrains-mono": {
    codeFamily: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
  },
  "fira-code": {
    codeFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Consolas", monospace',
  },
};
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
let cachedDocumentLibraryPreference;
let mainWindow = null;
let pendingDocumentOpenPath = "";

function isFlowDocFilePath(filePath) {
  return typeof filePath === "string" && path.extname(filePath).toLowerCase() === DOC_EXTENSION;
}

function normalizeFlowDocLaunchPath(filePath) {
  if (!isFlowDocFilePath(filePath)) {
    return "";
  }

  return path.resolve(String(filePath).trim());
}

function extractFlowDocPathFromArgv(argv = []) {
  const candidates = Array.isArray(argv) ? argv : [];

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const token = String(candidates[index] || "").trim();

    if (!token || token.startsWith("--") || token.startsWith("-psn_")) {
      continue;
    }

    const normalized = normalizeFlowDocLaunchPath(token);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
}

function flushPendingDocumentOpenPath() {
  if (!pendingDocumentOpenPath || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }

  mainWindow.webContents.send("app:open-document-request", {
    filePath: pendingDocumentOpenPath,
  });
  pendingDocumentOpenPath = "";
}

function queueDocumentOpenRequest(filePath) {
  const normalizedPath = normalizeFlowDocLaunchPath(filePath);

  if (!normalizedPath) {
    return false;
  }

  pendingDocumentOpenPath = normalizedPath;
  flushPendingDocumentOpenPath();
  return true;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

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

function getLibrarySettingsOptions() {
  return {
    userDataPath: app.getPath("userData"),
  };
}

function loadDocumentLibraryPreference() {
  if (typeof cachedDocumentLibraryPreference === "undefined") {
    cachedDocumentLibraryPreference = readDocumentLibraryPreference(getLibrarySettingsOptions());
  }

  return cachedDocumentLibraryPreference;
}

function saveDocumentLibraryPreference(rootPath) {
  cachedDocumentLibraryPreference = writeDocumentLibraryPreference(rootPath, getLibrarySettingsOptions());
  return cachedDocumentLibraryPreference;
}

function getDocumentLibraryRootInfo() {
  return resolveDocumentLibraryRootInfo({
    env: process.env,
    getSystemPath: (key) => app.getPath(key),
    savedRoot: loadDocumentLibraryPreference(),
  });
}

function getDocumentLibraryRoot() {
  return getDocumentLibraryRootInfo().rootPath;
}

function getLegacyStorageRoots() {
  return [...new Set([__dirname])];
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureGlobalAssetDirectories() {
  await Promise.all(
    Object.values(getAssetDirectories()).map((directory) => fsp.mkdir(directory, { recursive: true })),
  );
}

async function ensureDocumentLibraryRoot() {
  await fsp.mkdir(getDocumentLibraryRoot(), { recursive: true });
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
  mainWindow = window;

  window.webContents.on("did-finish-load", () => {
    flushPendingDocumentOpenPath();
  });

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  return window;
}

if (hasSingleInstanceLock) {
  app.on("second-instance", (_event, argv) => {
    queueDocumentOpenRequest(extractFlowDocPathFromArgv(argv));

    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }

    focusMainWindow();
    flushPendingDocumentOpenPath();
  });

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    queueDocumentOpenRequest(filePath);

    if (app.isReady()) {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
      } else {
        focusMainWindow();
      }

      flushPendingDocumentOpenPath();
    }
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId(APP_ID);
    await ensureGlobalAssetDirectories();
    await ensureDocumentLibraryRoot();
    createWindow();
    queueDocumentOpenRequest(extractFlowDocPathFromArgv(process.argv.slice(1)));
    flushPendingDocumentOpenPath();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        flushPendingDocumentOpenPath();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
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

function normalizeStoredResourcePath(resourcePath) {
  return decodeHtmlAttribute(resourcePath).split("\\").join("/").trim();
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

function extractPdfResourcePathsFromHtml(html) {
  const resourcePaths = new Set();
  const source = String(html || "");
  const tagPattern = /<[^>]+>/gu;
  let match = tagPattern.exec(source);

  while (match) {
    const tag = match[0];
    const isResourceNode =
      /data-kind\s*=\s*"(?:image|attachment)"/iu.test(tag) ||
      /class\s*=\s*"[^"]*\b(?:image-node|attachment-node)\b[^"]*"/iu.test(tag);

    if (isResourceNode) {
      const srcMatch = tag.match(/data-src\s*=\s*"([^"]+)"/iu);
      const resourcePath = normalizeStoredResourcePath(srcMatch?.[1] || "");

      if (resourcePath) {
        resourcePaths.add(resourcePath);
      }
    }

    match = tagPattern.exec(source);
  }

  return [...resourcePaths];
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

function compareLibraryDocuments(left, right) {
  const leftTime = Date.parse(left.updatedAt || "") || 0;
  const rightTime = Date.parse(right.updatedAt || "") || 0;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title, "zh-CN");
}

function buildDocumentLibraryPayload(rootInfo, documents) {
  const source = rootInfo?.source || "default";

  return {
    rootPath: rootInfo?.rootPath || "",
    rootSource: source,
    isCustomRoot: source === "saved",
    isEnvironmentOverride: source === "environment",
    untaggedLabel: LIBRARY_UNTAGGED_LABEL,
    documents: Array.isArray(documents) ? documents : [],
  };
}

function splitBaseName(fileName) {
  const extension = path.extname(fileName);
  const name = path.basename(fileName, extension) || "resource";
  return { name, extension };
}

function getDocumentAttachmentFolderName(documentPath) {
  return normalizeDocumentTitle(getDocumentTitleFromPath(documentPath || ""));
}

function buildStoredResourcePath(folderName, fileName) {
  return `${folderName}/${fileName}`;
}

function buildStoredResourcePathFromAbsolute(folderName, rootDirectory, absolutePath) {
  return buildStoredResourcePath(folderName, path.relative(rootDirectory, absolutePath).split(path.sep).join("/"));
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

async function getPdfHighlightThemeCssAsync() {
  try {
    return await fsp.readFile(HIGHLIGHT_THEME_PATH, "utf8");
  } catch {
    return "";
  }
}

function buildPdfFontFaceCss() {
  return LOCAL_FONT_FACES.map(({ family, directory, fileName, fontWeight }) => {
    const fontUrl = pathToFileURL(path.join(LOCAL_FONTS_ROOT, directory, fileName)).href;

    return `
      @font-face {
        font-family: "${family}";
        src: url("${fontUrl}") format("truetype");
        font-style: normal;
        font-weight: ${fontWeight};
        font-display: swap;
      }
    `;
  }).join("\n");
}

function resolvePdfFontFamilies(fontOptions = {}) {
  const documentStyle = PDF_DOCUMENT_FONT_STYLES[fontOptions.documentStyle] || PDF_DOCUMENT_FONT_STYLES.atkinson;
  const codeStyle = PDF_CODE_FONT_STYLES[fontOptions.codeStyle] || PDF_CODE_FONT_STYLES["google-sans-code"];

  return {
    bodyFamily: documentStyle.bodyFamily,
    displayFamily: documentStyle.displayFamily,
    codeFamily: codeStyle.codeFamily,
  };
}

async function readDocumentAsync(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  const data = migrateDocumentPayload(JSON.parse(raw));

  if (!data || typeof data.html !== "string") {
    throw new Error("文档格式不正确，缺少 html 内容。");
  }

  return {
    filePath,
    title: sharedGetDocumentTitleFromPath(filePath),
    html: data.html,
    tags: sharedNormalizeDocumentTags(data.tags),
    version: data.version || 1,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

async function writeDocumentAsync(filePath, html, options = {}) {
  const existingPayload =
    options.existing && typeof options.existing === "object"
      ? options.existing
      : await (async () => {
          if (!(await pathExists(filePath))) {
            return null;
          }

          try {
            return await readDocumentAsync(filePath);
          } catch {
            return null;
          }
        })();
  const preservedTags = options.tags === undefined ? existingPayload?.tags || [] : [];
  const payload = serializeDocumentPayload(html, {
    existing: existingPayload,
    tags: options.tags ?? preservedTags,
  });

  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

async function listFilesRecursivelyAsync(rootDirectory) {
  if (!(await pathExists(rootDirectory))) {
    return [];
  }

  const results = [];
  const pending = [rootDirectory];

  while (pending.length) {
    const currentDirectory = pending.pop();
    const entries = await fsp.readdir(currentDirectory, { withFileTypes: true });

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

async function listFlowDocFilesAsync(rootDirectory) {
  if (!(await pathExists(rootDirectory))) {
    return [];
  }

  const results = [];
  const pending = [rootDirectory];

  while (pending.length) {
    const currentDirectory = pending.pop();
    const entries = await fsp.readdir(currentDirectory, { withFileTypes: true });

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

async function listReferenceDocumentsAsync(currentFilePath) {
  const filePaths = await Promise.all(
    getAttachmentReferenceRoots(currentFilePath).map((rootDirectory) => listFlowDocFilesAsync(rootDirectory)),
  );

  return [...new Set(filePaths.flat().map((filePath) => path.resolve(filePath)))];
}

async function resolveResourceAsync(documentPath, resourcePath) {
  let absolutePath;

  if (path.isAbsolute(resourcePath)) {
    absolutePath = resourcePath;
  } else {
    const storageCandidates = resolveFromKnownRoots(resourcePath);
    const legacyDocumentLocalPath = path.resolve(path.dirname(documentPath || getStorageRoot()), resourcePath);
    let existingStorageCandidate = null;

    for (const candidate of storageCandidates) {
      if (await pathExists(candidate)) {
        existingStorageCandidate = candidate;
        break;
      }
    }

    absolutePath =
      existingStorageCandidate ||
      ((await pathExists(legacyDocumentLocalPath)) ? legacyDocumentLocalPath : null) ||
      storageCandidates[0] ||
      legacyDocumentLocalPath;
  }

  const exists = absolutePath ? await pathExists(absolutePath) : false;

  return {
    exists,
    absolutePath,
    name: absolutePath ? path.basename(absolutePath) : "",
    fileUrl: exists ? pathToFileURL(absolutePath).href : null,
  };
}

async function buildPdfResourceMapAsync(documentPath, html) {
  const resources = {};

  for (const resourcePath of extractPdfResourcePathsFromHtml(html)) {
    const resolved = await resolveResourceAsync(documentPath, resourcePath);
    resources[resourcePath] = {
      exists: resolved.exists,
      fileUrl: resolved.fileUrl || "",
      name: resolved.name || "",
    };
  }

  return resources;
}

async function isAttachmentReferencedByAnyDocumentAsync(resourcePath, currentFilePath) {
  const targetPath = normalizeStoredAttachmentPath(resourcePath);

  if (!targetPath) {
    return false;
  }

  const referenceDocuments = await listReferenceDocumentsAsync(currentFilePath);

  for (const filePath of referenceDocuments) {
    try {
      const document = await readDocumentAsync(filePath);

      if (extractAttachmentPathsFromHtml(document.html).has(targetPath)) {
        return true;
      }
    } catch {
      // Ignore broken documents while cleaning attachments.
    }
  }

  return false;
}

async function cleanupRemovedAttachmentsAsync(filePath, previousHtml, nextHtml) {
  const previousPaths = extractAttachmentPathsFromHtml(previousHtml);
  const nextPaths = extractAttachmentPathsFromHtml(nextHtml);
  const removedPaths = [...previousPaths].filter((resourcePath) => !nextPaths.has(resourcePath));
  const cleaned = [];

  for (const resourcePath of removedPaths) {
    if (await isAttachmentReferencedByAnyDocumentAsync(resourcePath, filePath)) {
      continue;
    }

    const resolved = await resolveResourceAsync(filePath, resourcePath);

    if (!resolved.exists) {
      continue;
    }

    try {
      await fsp.unlink(resolved.absolutePath);
      await pruneEmptyResourceDirectoriesAsync(
        path.join(getStorageRoot(), "attachments"),
        path.dirname(resolved.absolutePath),
      );
      cleaned.push(resourcePath);
    } catch {
      // Ignore cleanup errors so the document save itself still succeeds.
    }
  }

  return cleaned;
}

async function getReferencedAttachmentPathsAsync(currentFilePath) {
  const references = new Set();
  const referenceDocuments = await listReferenceDocumentsAsync(currentFilePath);

  for (const filePath of referenceDocuments) {
    try {
      const document = await readDocumentAsync(filePath);
      extractAttachmentPathsFromHtml(document.html).forEach((resourcePath) => {
        references.add(resourcePath);
      });
    } catch {
      // Ignore broken documents during cleanup.
    }
  }

  return references;
}

async function cleanupOrphanedAttachmentsAsync(currentFilePath) {
  const attachmentDirectory = path.join(getStorageRoot(), "attachments");
  const referencedPaths = await getReferencedAttachmentPathsAsync(currentFilePath);
  const cleaned = [];

  await fsp.mkdir(attachmentDirectory, { recursive: true });

  const files = await listFilesRecursivelyAsync(attachmentDirectory);

  for (const absolutePath of files) {
    const relativePath = buildStoredResourcePath(
      "attachments",
      path.relative(attachmentDirectory, absolutePath).split(path.sep).join("/"),
    );

    if (referencedPaths.has(relativePath)) {
      continue;
    }

    try {
      await fsp.unlink(absolutePath);
      await pruneEmptyResourceDirectoriesAsync(attachmentDirectory, path.dirname(absolutePath));
      cleaned.push(relativePath);
    } catch {
      // Ignore cleanup errors so document save still succeeds.
    }
  }

  return cleaned;
}

async function findMovedDocumentPathAsync(filePath, htmlSnapshot) {
  if (!htmlSnapshot) {
    return null;
  }

  const directory = path.dirname(filePath);

  if (!(await pathExists(directory))) {
    return null;
  }

  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === DOC_EXTENSION)
    .map((entry) => path.join(directory, entry.name))
    .filter((candidatePath) => path.resolve(candidatePath) !== path.resolve(filePath));

  const matches = [];

  for (const candidatePath of candidates) {
    try {
      const candidate = await readDocumentAsync(candidatePath);

      if (candidate.html === htmlSnapshot) {
        matches.push(candidatePath);
      }
    } catch {
      // Ignore unreadable documents while searching for moves.
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

async function indexDocumentLibraryAsync() {
  const rootInfo = getDocumentLibraryRootInfo();
  const rootPath = rootInfo.rootPath;
  await ensureDocumentLibraryRoot();
  const documentPaths = await listFlowDocFilesAsync(rootPath);
  const documents = (
    await Promise.all(
      documentPaths.map(async (filePath) => {
        try {
          const document = await readDocumentAsync(filePath);
          const relativePath = path.relative(rootPath, filePath).split(path.sep).join("/");

          return {
            filePath,
            relativePath,
            title: document.title,
            tags: document.tags,
            updatedAt: document.updatedAt,
          };
        } catch {
          return null;
        }
      }),
    )
  )
    .filter(Boolean)
    .sort(compareLibraryDocuments);

  return buildDocumentLibraryPayload(rootInfo, documents);
}

async function getUniqueTargetPathAsync(directory, desiredName) {
  const { name, extension } = splitBaseName(desiredName);
  let counter = 0;
  let candidate = path.join(directory, desiredName);

  while (await pathExists(candidate)) {
    counter += 1;
    candidate = path.join(directory, `${name}-${counter}${extension}`);
  }

  return candidate;
}

async function getAssetDirectoryAsync(folderName) {
  const directory = getAssetDirectories()[folderName];

  if (!directory) {
    throw new Error("不支持的资源目录。");
  }

  await fsp.mkdir(directory, { recursive: true });
  return directory;
}

async function getResourceTargetDirectoryAsync(folderName, documentPath = "") {
  const assetDirectory = await getAssetDirectoryAsync(folderName);

  if (folderName !== "attachments") {
    return assetDirectory;
  }

  const documentFolderName = getDocumentAttachmentFolderName(documentPath);
  const targetDirectory = path.join(assetDirectory, documentFolderName);
  await fsp.mkdir(targetDirectory, { recursive: true });
  return targetDirectory;
}

async function pruneEmptyResourceDirectoriesAsync(rootDirectory, startingDirectory) {
  let currentDirectory = path.resolve(startingDirectory || "");
  const resolvedRoot = path.resolve(rootDirectory);

  while (currentDirectory.startsWith(resolvedRoot) && currentDirectory !== resolvedRoot) {
    let entries = [];

    try {
      entries = await fsp.readdir(currentDirectory);
    } catch {
      break;
    }

    if (entries.length > 0) {
      break;
    }

    try {
      await fsp.rmdir(currentDirectory);
    } catch {
      break;
    }

    currentDirectory = path.dirname(currentDirectory);
  }
}

async function copyFileIntoLibraryAsync(folderName, sourceFilePath, options = {}) {
  const assetDirectory = await getAssetDirectoryAsync(folderName);
  const targetDirectory = await getResourceTargetDirectoryAsync(folderName, options.documentPath);
  const targetPath = await getUniqueTargetPathAsync(targetDirectory, path.basename(sourceFilePath));
  await fsp.copyFile(sourceFilePath, targetPath);

  return {
    name: path.basename(targetPath),
    relativePath: buildStoredResourcePathFromAbsolute(folderName, assetDirectory, targetPath),
  };
}

async function saveClipboardImageAsync(dataUrl, suggestedName) {
  const assetDirectory = await getAssetDirectoryAsync("images");
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = path.extname(suggestedName) || mimeTypeToExtension(mimeType);
  const baseName = path.basename(suggestedName, path.extname(suggestedName)) || "pasted-image";
  const targetPath = await getUniqueTargetPathAsync(assetDirectory, `${baseName}${extension}`);

  await fsp.writeFile(targetPath, buffer);

  return {
    name: path.basename(targetPath),
    relativePath: buildStoredResourcePath("images", path.basename(targetPath)),
  };
}

async function removeDirectoryIfExistsAsync(directoryPath) {
  if (!directoryPath || !(await pathExists(directoryPath))) {
    return;
  }

  await fsp.rm(directoryPath, { recursive: true, force: true });
}

async function exportDocumentAsPdfAsync(browserWindow, payload) {
  const filePath = sharedEnsureDocumentExtension(payload.filePath);
  const defaultPdfPath = sharedEnsurePdfExtension(
    path.join(
      path.dirname(filePath),
      sharedNormalizeDocumentTitle(payload.title || sharedGetDocumentTitleFromPath(filePath)),
    ),
  );
  const selection = await dialog.showSaveDialog(browserWindow, {
    title: "导出 PDF",
    defaultPath: defaultPdfPath,
    filters: [{ name: "PDF 文件", extensions: [PDF_EXTENSION.slice(1)] }],
  });

  if (selection.canceled || !selection.filePath) {
    return { canceled: true };
  }

  const exportPath = sharedEnsurePdfExtension(selection.filePath);
  const tempDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), "flowdoc-export-"));
  const tempHtmlPath = path.join(tempDirectory, "export.html");
  const exportWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 960,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: PDF_EXPORT_PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
    },
  });

  try {
    const exportHtml = buildPdfExportHtmlTemplate({
      title: payload.title || sharedGetDocumentTitleFromPath(filePath),
      html: payload.html,
      resources: await buildPdfResourceMapAsync(filePath, payload.html),
      highlightThemeCss: await getPdfHighlightThemeCssAsync(),
      fontFaceCss: buildPdfFontFaceCss(),
      fontFamilies: resolvePdfFontFamilies(payload.fontOptions),
    });

    await fsp.writeFile(tempHtmlPath, exportHtml, "utf8");
    await exportWindow.loadFile(tempHtmlPath);
    await exportWindow.webContents.executeJavaScript(
      `
        if (typeof window.__waitForExportReady !== "function") {
          throw new Error("PDF export page failed to initialize.");
        }

        window.__waitForExportReady();
      `,
      true,
    );
    const pdfBuffer = await exportWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4",
    });
    await fsp.writeFile(exportPath, pdfBuffer);

    return {
      canceled: false,
      savedPath: exportPath,
      fileName: path.basename(exportPath),
    };
  } finally {
    if (!exportWindow.isDestroyed()) {
      exportWindow.destroy();
    }

    await removeDirectoryIfExistsAsync(tempDirectory);
  }
}

async function copyAttachmentToDownloadsAsync(documentPath, resourcePath) {
  const resolved = await resolveResourceAsync(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("附件文件不存在，无法复制到 Downloads。");
  }

  const downloadsDirectory = resolveDownloadsDirectory({
    env: process.env,
    getSystemPath: (key) => app.getPath(key),
  });
  await fsp.mkdir(downloadsDirectory, { recursive: true });

  const targetPath = await getUniqueTargetPathAsync(downloadsDirectory, path.basename(resolved.absolutePath));
  await fsp.copyFile(resolved.absolutePath, targetPath);

  return {
    savedPath: targetPath,
    fileName: path.basename(targetPath),
  };
}

async function saveResourceAsAsync(browserWindow, documentPath, resourcePath, options = {}) {
  const resolved = await resolveResourceAsync(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("资源文件不存在，无法另存。");
  }

  const defaultDirectory = app.getPath(options.defaultDirectoryKey || "pictures");
  const result = await dialog.showSaveDialog(browserWindow, {
    title: options.title || "资源另存为",
    defaultPath: path.join(defaultDirectory, path.basename(resolved.absolutePath)),
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fsp.mkdir(path.dirname(result.filePath), { recursive: true });
  await fsp.copyFile(resolved.absolutePath, result.filePath);

  return {
    canceled: false,
    savedPath: result.filePath,
    fileName: path.basename(result.filePath),
  };
}

async function openResourceWithSystemAsync(documentPath, resourcePath) {
  const resolved = await resolveResourceAsync(documentPath, resourcePath);

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

async function revealResourceInFolderAsync(documentPath, resourcePath) {
  const resolved = await resolveResourceAsync(documentPath, resourcePath);

  if (!resolved.exists) {
    throw new Error("资源文件不存在，无法在资源管理器中显示。");
  }

  shell.showItemInFolder(resolved.absolutePath);

  return {
    success: true,
    absolutePath: resolved.absolutePath,
  };
}

async function readTextPreviewAsync(filePath, limit = ATTACHMENT_PREVIEW_LIMIT) {
  const fileHandle = await fsp.open(filePath, "r");

  try {
    const stat = await fileHandle.stat();
    const targetSize = Math.min(stat.size, limit);
    const buffer = Buffer.alloc(targetSize);
    await fileHandle.read(buffer, 0, targetSize, 0);

    return {
      content: buffer.toString("utf8"),
      truncated: stat.size > limit,
      size: stat.size,
    };
  } finally {
    await fileHandle.close();
  }
}

async function previewAttachmentAsync(documentPath, resourcePath) {
  const resolved = await resolveResourceAsync(documentPath, resourcePath);
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

  const stat = await fsp.stat(resolved.absolutePath);

  if (previewKind === "text" || previewKind === "markdown") {
    const textPreview = await readTextPreviewAsync(resolved.absolutePath);

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

  if (await pathExists(filePath)) {
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
  await writeDocumentAsync(selection.filePath, html, { tags: [] });

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

  const document = await readDocumentAsync(result.filePaths[0]);
  return { canceled: false, document };
});

ipcMain.handle("document:open-path", async (_event, payload) => {
  if (!payload || !payload.filePath) {
    throw new Error("打开文档失败：缺少文档路径。");
  }

  return readDocumentAsync(sharedEnsureDocumentExtension(payload.filePath));
});

ipcMain.handle("document:save", async (_event, payload) => {
  if (!payload || !payload.filePath || typeof payload.html !== "string") {
    throw new Error("保存失败：缺少文档路径或内容。");
  }

  const filePath = sharedEnsureDocumentExtension(payload.filePath);
  const skipCleanup = payload.skipCleanup === true;
  const previousHtml =
    skipCleanup || !(await pathExists(filePath))
      ? ""
      : await (async () => {
          try {
            return (await readDocumentAsync(filePath)).html;
          } catch {
            return "";
          }
        })();
  const saved = await writeDocumentAsync(filePath, payload.html, { tags: payload.tags });
  const cleanedAttachments = skipCleanup
    ? []
    : [
        ...new Set([
          ...(await cleanupRemovedAttachmentsAsync(filePath, previousHtml, payload.html)),
          ...(await cleanupOrphanedAttachmentsAsync(filePath)),
        ]),
      ];
  return { success: true, updatedAt: saved.updatedAt, cleanedAttachments };
});

ipcMain.handle("document:export-pdf", async (event, payload) => {
  if (!payload || !payload.filePath || typeof payload.html !== "string") {
    throw new Error("导出 PDF 失败：缺少文档路径或内容。");
  }

  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  return exportDocumentAsPdfAsync(browserWindow, payload);
});

ipcMain.handle("document:refresh-path", async (_event, payload) => {
  if (!payload || !payload.filePath) {
    throw new Error("同步文档路径失败：缺少文档路径。");
  }

  const currentPath = sharedEnsureDocumentExtension(payload.filePath);

  if (await pathExists(currentPath)) {
    return {
      exists: true,
      changed: false,
      filePath: currentPath,
      title: getDocumentTitleFromPath(currentPath),
    };
  }

  const movedPath = await findMovedDocumentPathAsync(currentPath, payload.lastSavedHtml);

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
    const targetPath = (await pathExists(desiredPath))
      ? await getUniqueTargetPathAsync(path.dirname(currentPath), `${nextTitle}${extension}`)
      : desiredPath;

    await fsp.rename(currentPath, targetPath);

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
    files: await Promise.all(result.filePaths.map((sourcePath) => copyFileIntoLibraryAsync("images", sourcePath))),
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
    files: await Promise.all(
      result.filePaths.map((sourcePath) =>
        copyFileIntoLibraryAsync("attachments", sourcePath, {
          documentPath: payload.docPath,
        }),
      ),
    ),
  };
});

ipcMain.handle("resource:save-pasted-image", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.dataUrl) {
    throw new Error("无法保存剪贴板图片：缺少文档路径或图片数据。");
  }

  return saveClipboardImageAsync(
    payload.dataUrl,
    payload.suggestedName || `pasted-image-${Date.now()}.png`,
  );
});

ipcMain.handle("resource:resolve", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法解析资源路径。");
  }

  return resolveResourceAsync(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:save-image-as", async (event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法另存图片：缺少文档路径或图片路径。");
  }

  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  return saveResourceAsAsync(browserWindow, payload.docPath, payload.relativePath, {
    title: "图片另存为",
    defaultDirectoryKey: "pictures",
  });
});

ipcMain.handle("resource:open-image", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法打开图片：缺少文档路径或图片路径。");
  }

  return openResourceWithSystemAsync(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:reveal-image-in-folder", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法定位图片：缺少文档路径或图片路径。");
  }

  return revealResourceInFolderAsync(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:download-attachment", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法下载附件：缺少文档路径或资源路径。");
  }

  return copyAttachmentToDownloadsAsync(payload.docPath, payload.relativePath);
});

ipcMain.handle("resource:preview-attachment", async (_event, payload) => {
  if (!payload || !payload.docPath || !payload.relativePath) {
    throw new Error("无法预览附件：缺少文档路径或资源路径。");
  }

  return previewAttachmentAsync(payload.docPath, payload.relativePath);
});

ipcMain.handle("library:index", async () => {
  return indexDocumentLibraryAsync();
});

ipcMain.handle("library:choose-root", async (event) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(browserWindow, {
    title: "选择文档库目录",
    defaultPath: getDocumentLibraryRoot(),
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  saveDocumentLibraryPreference(result.filePaths[0]);
  await ensureDocumentLibraryRoot();
  return {
    canceled: false,
    library: await indexDocumentLibraryAsync(),
  };
});

ipcMain.handle("library:reset-root", async () => {
  saveDocumentLibraryPreference("");
  await ensureDocumentLibraryRoot();
  return {
    canceled: false,
    library: await indexDocumentLibraryAsync(),
  };
});
