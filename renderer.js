import { filterAndSortLibraryDocuments, LIBRARY_SORT_OPTIONS } from "./renderer-modules/library-utils.mjs";
import {
  CODE_FONT_STYLES,
  DEFAULT_CODE_FONT_STYLE,
  DEFAULT_DOCUMENT_FONT_STYLE,
  DOCUMENT_FONT_STYLES,
  getCodeFontStyle,
  getDocumentFontStyle,
} from "./renderer-modules/font-presets.mjs";
import { buildOutlineRenderItems, toggleCollapsedOutlineId } from "./renderer-modules/outline-utils.mjs";
import {
  loadCollapsedOutlineIds,
  loadCodeFontStyle,
  loadDocumentFontStyle,
  loadFocusMode,
  loadLibrarySort,
  loadRecentDocuments,
  loadSidebarWidth,
  recordRecentDocument,
  saveCodeFontStyle,
  saveCollapsedOutlineIds,
  saveDocumentFontStyle,
  saveFocusMode,
  saveLibrarySort,
  saveSidebarWidth,
} from "./renderer-modules/preferences.mjs";

const api = window.flowDocApi;

const CODE_LANGUAGES = [
  { value: "auto", label: "自动识别" },
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "HTML / XML" },
  { value: "css", label: "CSS" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
];

const HISTORY_LIMIT = 180;
const HISTORY_PERSIST_LIMIT = 60;
const HISTORY_INPUT_DELAY = 90;
const AUTOSAVE_DELAY = 1200;
const CODE_BLOCK_RENDER_DELAY = 120;
const CODE_COPY_FEEDBACK_DELAY = 1800;
const BLOCK_HANDLE_WIDTH = 42;
const BLOCK_HANDLE_HEIGHT = 42;
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 520;
const SPECIAL_BLOCK_SELECTOR = ".image-node, .attachment-node, .code-block-node, .video-embed-node";
const EDITOR_SANITIZE_REMOVE_SELECTOR = [
  "script",
  "style",
  "link",
  "meta",
  "base",
  "object",
  "applet",
  "frame",
  "frameset",
  "audio",
  "video",
  "source",
  "track",
  "svg",
  "math",
  "canvas",
  "form",
  "input",
  "textarea",
].join(", ");
const LINK_OPEN_HINT = "Ctrl/Cmd+点击打开，双击修改链接";
const VIDEO_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
const LIBRARY_UNTAGGED_FILTER = "__UNTAGGED__";
const ATTACHMENT_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"]);
const ATTACHMENT_MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const ATTACHMENT_TEXT_EXTENSIONS = new Set([
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
const ATTACHMENT_PDF_EXTENSIONS = new Set([".pdf"]);
const ATTACHMENT_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
const ATTACHMENT_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);
const ATTACHMENT_CODE_LANGUAGE_BY_EXTENSION = new Map([
  [".c", "c"],
  [".cc", "cpp"],
  [".cpp", "cpp"],
  [".cxx", "cpp"],
  [".h", "cpp"],
  [".hh", "cpp"],
  [".hpp", "cpp"],
  [".cs", "csharp"],
  [".py", "python"],
  [".java", "java"],
  [".js", "javascript"],
  [".jsx", "javascript"],
  [".cjs", "javascript"],
  [".mjs", "javascript"],
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".json", "json"],
  [".html", "xml"],
  [".htm", "xml"],
  [".xml", "xml"],
  [".css", "css"],
  [".sql", "sql"],
  [".sh", "bash"],
  [".bat", "dos"],
  [".ps1", "powershell"],
  [".go", "go"],
  [".rs", "rust"],
  [".php", "php"],
  [".rb", "ruby"],
  [".kt", "kotlin"],
  [".swift", "swift"],
  [".scala", "scala"],
  [".dart", "dart"],
  [".lua", "lua"],
  [".pl", "perl"],
  [".yml", "yaml"],
  [".yaml", "yaml"],
  [".toml", "ini"],
]);

const state = {
  currentDocument: null,
  saveTimer: null,
  historyTimer: null,
  titleSyncTimer: null,
  toastTimer: null,
  savedSelection: null,
  lastSavedHtml: "",
  lastSavedTags: [],
  uiFrame: null,
  titleSyncPromise: null,
  history: {
    entries: [],
    index: -1,
    isRestoring: false,
  },
  selectedSpecialNodeId: null,
  selectAllScope: null,
  library: {
    rootPath: "",
    rootSource: "default",
    isCustomRoot: false,
    isEnvironmentOverride: false,
    documents: [],
    untaggedLabel: "未分类",
    selectedTag: "",
    searchText: "",
    sortKey: loadLibrarySort("recent"),
    recentDocuments: loadRecentDocuments(),
  },
  outline: {
    collapsedIds: loadCollapsedOutlineIds(),
  },
  fonts: {
    documentStyle: loadDocumentFontStyle(DEFAULT_DOCUMENT_FONT_STYLE),
    codeStyle: loadCodeFontStyle(DEFAULT_CODE_FONT_STYLE),
  },
  attachmentPreview: null,
  linkEditorAnchor: null,
  imageContextMenuPath: "",
  isPointerSelecting: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  sidebarResizeSession: null,
  isFocusMode: loadFocusMode(),
  codeBlockRenderTimers: new Map(),
  resourceRefreshToken: 0,
  resourceRefreshTimer: null,
  isExternalControlInteracting: false,
  externalControlInteractionTimer: null,
  openChoiceMenu: "",
};

const refs = {
  appShell: document.getElementById("appShell"),
  sidebar: document.getElementById("sidebar"),
  sidebarResizer: document.getElementById("sidebarResizer"),
  newDocButton: document.getElementById("newDocButton"),
  openDocButton: document.getElementById("openDocButton"),
  saveDocButton: document.getElementById("saveDocButton"),
  exportPdfButton: document.getElementById("exportPdfButton"),
  documentFontStyleButton: document.getElementById("documentFontStyleButton"),
  documentFontStyleMenu: document.getElementById("documentFontStyleMenu"),
  codeFontStyleButton: document.getElementById("codeFontStyleButton"),
  codeFontStyleMenu: document.getElementById("codeFontStyleMenu"),
  docTags: document.getElementById("docTags"),
  tagInput: document.getElementById("tagInput"),
  addTagButton: document.getElementById("addTagButton"),
  docOutline: document.getElementById("docOutline"),
  toggleOutlineCollapseButton: document.getElementById("toggleOutlineCollapseButton"),
  chooseLibraryRootButton: document.getElementById("chooseLibraryRootButton"),
  resetLibraryRootButton: document.getElementById("resetLibraryRootButton"),
  libraryRootMeta: document.getElementById("libraryRootMeta"),
  libraryRootPath: document.getElementById("libraryRootPath"),
  librarySearchInput: document.getElementById("librarySearchInput"),
  librarySortButton: document.getElementById("librarySortButton"),
  librarySortMenu: document.getElementById("librarySortMenu"),
  libraryTagFilters: document.getElementById("libraryTagFilters"),
  libraryDocList: document.getElementById("libraryDocList"),
  refreshLibraryButton: document.getElementById("refreshLibraryButton"),
  editorSurface: document.getElementById("editorSurface"),
  editor: document.getElementById("editor"),
  emptyState: document.getElementById("emptyState"),
  statusText: document.getElementById("statusText"),
  docName: document.getElementById("docName"),
  docPath: document.getElementById("docPath"),
  focusModeButton: document.getElementById("focusModeButton"),
  selectionBubble: document.getElementById("selectionBubble"),
  blockHandle: document.getElementById("blockHandle"),
  blockHandleButton: document.getElementById("blockHandleButton"),
  insertMenu: document.getElementById("insertMenu"),
  toast: document.getElementById("toast"),
  imageContextMenu: document.getElementById("imageContextMenu"),
  attachmentPreviewModal: document.getElementById("attachmentPreviewModal"),
  attachmentPreviewTitle: document.getElementById("attachmentPreviewTitle"),
  attachmentPreviewMeta: document.getElementById("attachmentPreviewMeta"),
  attachmentPreviewBody: document.getElementById("attachmentPreviewBody"),
  attachmentPreviewClose: document.getElementById("attachmentPreviewClose"),
  attachmentPreviewDownload: document.getElementById("attachmentPreviewDownload"),
  linkEditorModal: document.getElementById("linkEditorModal"),
  linkEditorForm: document.getElementById("linkEditorForm"),
  linkEditorInput: document.getElementById("linkEditorInput"),
  linkEditorCancel: document.getElementById("linkEditorCancel"),
  linkEditorRemove: document.getElementById("linkEditorRemove"),
};

function setStatus(message, tone = "") {
  refs.statusText.textContent = message;
  refs.statusText.dataset.tone = tone;
}

function showToast(message, tone = "success", duration = 2600) {
  refs.toast.textContent = message;
  refs.toast.dataset.tone = tone;
  refs.toast.classList.remove("hidden");

  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    refs.toast.classList.add("hidden");
  }, duration);
}

function getChoiceMenuEntries() {
  return [
    { id: "document-font", button: refs.documentFontStyleButton, menu: refs.documentFontStyleMenu },
    { id: "code-font", button: refs.codeFontStyleButton, menu: refs.codeFontStyleMenu },
    { id: "library-sort", button: refs.librarySortButton, menu: refs.librarySortMenu },
  ];
}

function setChoiceTriggerLabel(button, label) {
  const labelNode = button?.querySelector(".choice-trigger-label");

  if (labelNode) {
    labelNode.textContent = label;
  }
}

function setChoiceMenuOpenState(entry, isOpen) {
  if (!entry?.button || !entry.menu) {
    return;
  }

  entry.button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  entry.menu.classList.toggle("hidden", !isOpen);
}

function closeChoiceMenus(exceptMenuId = "") {
  getChoiceMenuEntries().forEach((entry) => {
    setChoiceMenuOpenState(entry, Boolean(exceptMenuId) && entry.id === exceptMenuId);
  });
  state.openChoiceMenu = exceptMenuId;
}

function toggleChoiceMenu(menuId) {
  closeChoiceMenus(state.openChoiceMenu === menuId ? "" : menuId);
}

function isChoiceMenuTarget(target) {
  return Boolean(target?.closest?.(".choice-menu"));
}

function renderChoiceOptions(menu, items, selectedValue, menuId) {
  if (!menu) {
    return;
  }

  menu.innerHTML = items
    .map((item) => {
      const optionValue = item.value ?? item.id ?? "";
      const optionLabel = item.label ?? String(optionValue);
      const isActive = optionValue === selectedValue;
      const note = item.note ? `<span class="choice-option-note">${escapeHtml(item.note)}</span>` : "";
      return `
        <button
          type="button"
          class="choice-option${isActive ? " is-active" : ""}"
          data-choice-menu-id="${escapeHtml(menuId)}"
          data-choice-value="${escapeHtml(optionValue)}"
          role="option"
          aria-selected="${isActive ? "true" : "false"}"
        >
          <span class="choice-option-title">${escapeHtml(optionLabel)}</span>
          ${note}
        </button>
      `;
    })
    .join("");
}

function refreshFontSelectionUi() {
  const documentPreset = getDocumentFontStyle(state.fonts.documentStyle);
  const codePreset = getCodeFontStyle(state.fonts.codeStyle);
  setChoiceTriggerLabel(refs.documentFontStyleButton, documentPreset.label);
  setChoiceTriggerLabel(refs.codeFontStyleButton, codePreset.label);
  renderChoiceOptions(refs.documentFontStyleMenu, DOCUMENT_FONT_STYLES, documentPreset.id, "document-font");
  renderChoiceOptions(refs.codeFontStyleMenu, CODE_FONT_STYLES, codePreset.id, "code-font");
}

function refreshLibrarySortUi() {
  const sortOption =
    LIBRARY_SORT_OPTIONS.find((option) => option.value === state.library.sortKey) || LIBRARY_SORT_OPTIONS[0];
  state.library.sortKey = sortOption.value;
  setChoiceTriggerLabel(refs.librarySortButton, sortOption.label);
  renderChoiceOptions(refs.librarySortMenu, LIBRARY_SORT_OPTIONS, sortOption.value, "library-sort");
}

function getPrimaryFontFamily(fontStack = "") {
  return String(fontStack).split(",")[0]?.trim() || "";
}

function refreshFontLayoutAfterLoad(fontFamilies) {
  scheduleUiRefresh();

  if (document.fonts?.load) {
    const primaryFamilies = [
      getPrimaryFontFamily(fontFamilies.bodyFamily),
      getPrimaryFontFamily(fontFamilies.displayFamily),
      getPrimaryFontFamily(fontFamilies.codeFamily),
    ].filter(Boolean);

    Promise.all(
      primaryFamilies.map((family) => document.fonts.load(`500 1em ${family}`)),
    )
      .then(() => {
        scheduleUiRefresh();
      })
      .catch(() => {
        scheduleUiRefresh();
      });
  }
}

function getActiveFontFamilies() {
  const documentPreset = getDocumentFontStyle(state.fonts.documentStyle);
  const codePreset = getCodeFontStyle(state.fonts.codeStyle);
  state.fonts.documentStyle = documentPreset.id;
  state.fonts.codeStyle = codePreset.id;

  return {
    documentStyle: documentPreset.id,
    codeStyle: codePreset.id,
    bodyFamily: documentPreset.bodyFamily,
    displayFamily: documentPreset.displayFamily,
    codeFamily: codePreset.family,
  };
}

function applyFontPreferences({ persist = false } = {}) {
  const fontFamilies = getActiveFontFamilies();
  document.documentElement.style.setProperty("--font-editor-body", fontFamilies.bodyFamily);
  document.documentElement.style.setProperty("--font-editor-display", fontFamilies.displayFamily);
  document.documentElement.style.setProperty("--font-mono", fontFamilies.codeFamily);
  refreshFontSelectionUi();

  if (persist) {
    saveDocumentFontStyle(fontFamilies.documentStyle);
    saveCodeFontStyle(fontFamilies.codeStyle);
  }

  refreshFontLayoutAfterLoad(fontFamilies);
}

function applyChoiceMenuValue(menuId, value) {
  if (menuId === "document-font") {
    state.fonts.documentStyle = getDocumentFontStyle(value || DEFAULT_DOCUMENT_FONT_STYLE).id;
    applyFontPreferences({ persist: true });
    return;
  }

  if (menuId === "code-font") {
    state.fonts.codeStyle = getCodeFontStyle(value || DEFAULT_CODE_FONT_STYLE).id;
    applyFontPreferences({ persist: true });
    return;
  }

  if (menuId === "library-sort") {
    const nextSort =
      LIBRARY_SORT_OPTIONS.find((option) => option.value === value)?.value || LIBRARY_SORT_OPTIONS[0]?.value || "recent";
    state.library.sortKey = nextSort;
    saveLibrarySort(nextSort);
    renderLibraryView();
  }
}

function isChoiceMenuOpen() {
  return Boolean(state.openChoiceMenu);
}

function isEditorCurrentlyInteractive() {
  const activeElement = document.activeElement;
  return Boolean(
    (activeElement && (activeElement === refs.editor || refs.editor.contains(activeElement))) ||
      isRangeInsideEditor(getSelectionRange()),
  );
}

function beginExternalControlInteraction(duration = 260) {
  state.isExternalControlInteracting = true;
  window.clearTimeout(state.externalControlInteractionTimer);
  state.externalControlInteractionTimer = window.setTimeout(() => {
    state.isExternalControlInteracting = false;
    state.externalControlInteractionTimer = null;
  }, duration);
}

function endExternalControlInteraction() {
  state.isExternalControlInteracting = false;
  window.clearTimeout(state.externalControlInteractionTimer);
  state.externalControlInteractionTimer = null;
}

function releaseEditorInteractionForChoiceMenu() {
  const range = getSelectionRange();

  if (range && isRangeInsideEditor(range)) {
    saveSelection();
  }

  endPointerSelection();
  hideSelectionBubble();
  hideBlockHandle();
  hideInsertMenu();
  hideImageContextMenu();
  collapseTransientGaps();
  clearSpecialSelection();

  const activeElement = document.activeElement;

  if (
    activeElement &&
    activeElement !== document.body &&
    refs.editor.contains(activeElement) &&
    typeof activeElement.blur === "function"
  ) {
    activeElement.blur();
  }

  const selection = getSelection();

  if (selection?.rangeCount) {
    const liveRange = selection.getRangeAt(0);
    if (isRangeInsideEditor(liveRange)) {
      selection.removeAllRanges();
    }
  }

  scheduleUiRefresh();
}

function prepareChoiceMenuInteraction(event) {
  beginExternalControlInteraction(900);
  event.stopPropagation();

  if (!isEditorCurrentlyInteractive()) {
    return;
  }

  releaseEditorInteractionForChoiceMenu();
}

function isCompactLayout() {
  return window.innerWidth <= 1120;
}

function getSidebarMaxWidth() {
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 460));
}

function clampSidebarWidth(width) {
  const numericWidth = Number(width);
  const fallbackWidth = Number.isFinite(state.sidebarWidth) ? state.sidebarWidth : DEFAULT_SIDEBAR_WIDTH;
  const resolvedWidth = Number.isFinite(numericWidth) ? numericWidth : fallbackWidth;
  return Math.min(getSidebarMaxWidth(), Math.max(MIN_SIDEBAR_WIDTH, resolvedWidth));
}

function persistSidebarWidth(width) {
  saveSidebarWidth(width);
}

function applySidebarWidth(width, { persist = false } = {}) {
  const nextWidth = clampSidebarWidth(width);
  state.sidebarWidth = nextWidth;
  document.documentElement.style.setProperty("--sidebar-width", `${nextWidth}px`);
  scheduleUiRefresh();

  if (refs.sidebarResizer) {
    refs.sidebarResizer.setAttribute("aria-valuemin", String(MIN_SIDEBAR_WIDTH));
    refs.sidebarResizer.setAttribute("aria-valuemax", String(getSidebarMaxWidth()));
    refs.sidebarResizer.setAttribute("aria-valuenow", String(Math.round(nextWidth)));
    refs.sidebarResizer.setAttribute("aria-valuetext", `侧边栏宽度 ${Math.round(nextWidth)} 像素`);
  }

  if (persist) {
    persistSidebarWidth(nextWidth);
  }
}

function restoreSidebarWidth() {
  applySidebarWidth(loadSidebarWidth(DEFAULT_SIDEBAR_WIDTH));
}

function beginSidebarResize(event) {
  if (!refs.sidebar || isCompactLayout() || event.button !== 0) {
    return;
  }

  event.preventDefault();
  state.sidebarResizeSession = {
    startX: event.clientX,
    startWidth: refs.sidebar.getBoundingClientRect().width,
  };
  document.body.classList.add("is-resizing-sidebar");
}

function updateSidebarResize(event) {
  if (!state.sidebarResizeSession) {
    return;
  }

  const deltaX = event.clientX - state.sidebarResizeSession.startX;
  applySidebarWidth(state.sidebarResizeSession.startWidth + deltaX);
}

function endSidebarResize() {
  if (!state.sidebarResizeSession) {
    return;
  }

  const finalWidth = state.sidebarWidth;
  state.sidebarResizeSession = null;
  document.body.classList.remove("is-resizing-sidebar");
  applySidebarWidth(finalWidth, { persist: true });
}

function resetSidebarWidth() {
  applySidebarWidth(DEFAULT_SIDEBAR_WIDTH, { persist: true });
}

function applyFocusMode(enabled, { persist = true } = {}) {
  state.isFocusMode = Boolean(enabled);
  document.body.classList.toggle("focus-mode", state.isFocusMode);

  if (refs.focusModeButton) {
    refs.focusModeButton.textContent = state.isFocusMode ? "退出专注" : "专注模式";
    refs.focusModeButton.classList.toggle("is-active", state.isFocusMode);
  }

  if (persist) {
    saveFocusMode(state.isFocusMode);
  }

  scheduleUiRefresh();
}

function toggleFocusMode() {
  applyFocusMode(!state.isFocusMode);
}

function getDocumentOutlineHeadings() {
  return [...refs.editor.querySelectorAll("h1, h2, h3")];
}

function ensureDocumentOutlineAnchors() {
  getDocumentOutlineHeadings().forEach((heading, index) => {
    const outlineId = `flowdoc-outline-${index + 1}`;
    heading.dataset.outlineId = outlineId;
    heading.id = outlineId;
  });
}

function getDocumentOutlineItems() {
  ensureDocumentOutlineAnchors();

  return getDocumentOutlineHeadings().map((heading, index) => ({
    id: heading.dataset.outlineId || `flowdoc-outline-${index + 1}`,
    level: Number(heading.tagName.slice(1)) || 1,
    text: normalizeCodeText(getBlockText(heading)).replace(/\s+/gu, " ").trim() || "未命名标题",
  }));
}

function decorateDocumentOutlineItems(items) {
  return buildOutlineRenderItems(items, state.outline.collapsedIds);
}

function findActiveOutlineHeadingId(range = getSelectionRange()) {
  if (!range || !isRangeInsideEditor(range)) {
    return "";
  }

  const directHeading = nodeToElement(range.startContainer)?.closest("h1, h2, h3");

  if (directHeading?.dataset.outlineId) {
    return directHeading.dataset.outlineId;
  }

  const activeBlock = getActiveBlock(range);
  let cursor = activeBlock;

  while (cursor) {
    if (/^H[1-3]$/u.test(cursor.tagName || "") && cursor.dataset.outlineId) {
      return cursor.dataset.outlineId;
    }

    cursor = cursor.previousElementSibling;
  }

  return getDocumentOutlineHeadings()[0]?.dataset.outlineId || "";
}

function updateDocumentOutlineActiveState(activeId = findActiveOutlineHeadingId()) {
  if (!refs.docOutline) {
    return;
  }

  refs.docOutline.querySelectorAll("[data-outline-target]").forEach((button) => {
    button.classList.toggle("is-active", Boolean(activeId) && button.dataset.outlineTarget === activeId);
  });
}

function syncOutlineCollapseState(nextCollapsedIds) {
  state.outline.collapsedIds = [...new Set(nextCollapsedIds)];
  saveCollapsedOutlineIds(state.outline.collapsedIds);
  renderDocumentOutline();
}

function toggleOutlineCollapse(outlineId) {
  syncOutlineCollapseState(toggleCollapsedOutlineId(state.outline.collapsedIds, outlineId));
}

function updateOutlineCollapseButton(outlineItems) {
  if (!refs.toggleOutlineCollapseButton) {
    return;
  }

  const expandableItems = outlineItems.filter((item) => item.hasChildren);

  if (!expandableItems.length) {
    refs.toggleOutlineCollapseButton.disabled = true;
    refs.toggleOutlineCollapseButton.textContent = "没有层级";
    return;
  }

  refs.toggleOutlineCollapseButton.disabled = false;
  const hasCollapsed = expandableItems.some((item) => item.isCollapsed);
  refs.toggleOutlineCollapseButton.textContent = hasCollapsed ? "展开全部" : "全部折叠";
}

function renderDocumentOutline() {
  if (!refs.docOutline) {
    return;
  }

  if (!state.currentDocument) {
    refs.docOutline.className = "outline-list empty";
    refs.docOutline.textContent = "打开文档后会根据标题自动生成目录";
    return;
  }

  const items = getDocumentOutlineItems();

  if (!items.length) {
    refs.docOutline.className = "outline-list empty";
    refs.docOutline.textContent = "当前文档里还没有可加入目录的标题";
    return;
  }

  const outlineItems = decorateDocumentOutlineItems(items);
  const visibleItems = outlineItems.filter((item) => !item.isHidden);

  refs.docOutline.className = "outline-list";
  refs.docOutline.innerHTML = visibleItems
    .map(
      (item) => `
        <div class="outline-item" data-level="${item.level}">
          ${
            item.hasChildren
              ? `<button type="button" class="outline-toggle" data-outline-toggle="${escapeHtml(item.id)}" aria-label="${item.isCollapsed ? "展开子标题" : "折叠子标题"}">${item.isCollapsed ? "+" : "−"}</button>`
              : `<span class="outline-toggle-spacer" aria-hidden="true"></span>`
          }
          <button type="button" class="outline-button" data-outline-target="${escapeHtml(item.id)}" data-level="${item.level}">
            <span class="outline-button-level">${escapeHtml(item.levelLabel)}</span>
            <span class="outline-button-main">
              <span class="outline-button-order">${escapeHtml(item.orderLabel)}</span>
              <span class="outline-button-text">${escapeHtml(item.text)}</span>
            </span>
          </button>
        </div>`,
    )
    .join("");

  updateOutlineCollapseButton(outlineItems);
  updateDocumentOutlineActiveState();
}

function jumpToOutlineHeading(outlineId) {
  const heading = refs.editor.querySelector(`[data-outline-id="${outlineId}"]`);

  if (!heading) {
    return;
  }

  heading.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  placeCaretInside(heading, { start: true });
  saveSelection();
  updateDocumentOutlineActiveState(outlineId);
  scheduleUiRefresh();
}

function hideSelectionBubble() {
  refs.selectionBubble.classList.add("hidden");
}

function hideInsertMenu() {
  refs.insertMenu.classList.add("hidden");
}

function hideBlockHandle() {
  refs.blockHandle.classList.add("hidden");
  hideInsertMenu();
}

function hideImageContextMenu() {
  refs.imageContextMenu.classList.add("hidden");
  refs.imageContextMenu.setAttribute("aria-hidden", "true");
  refs.imageContextMenu.style.left = "";
  refs.imageContextMenu.style.top = "";
  delete refs.imageContextMenu.dataset.relativePath;
  delete refs.imageContextMenu.dataset.name;
  state.imageContextMenuPath = "";
}

function showImageContextMenu(event, imageNode) {
  if (!state.currentDocument || !imageNode?.dataset?.src) {
    return;
  }

  refs.imageContextMenu.dataset.relativePath = imageNode.dataset.src;
  refs.imageContextMenu.dataset.name = imageNode.dataset.name || "";
  state.imageContextMenuPath = imageNode.dataset.src;
  refs.imageContextMenu.classList.remove("hidden");
  refs.imageContextMenu.setAttribute("aria-hidden", "false");

  const menuRect = refs.imageContextMenu.getBoundingClientRect();
  const maxLeft = window.innerWidth - menuRect.width - 12;
  const maxTop = window.innerHeight - menuRect.height - 12;
  const left = Math.max(12, Math.min(event.clientX, maxLeft));
  const top = Math.max(12, Math.min(event.clientY, maxTop));

  refs.imageContextMenu.style.left = `${left}px`;
  refs.imageContextMenu.style.top = `${top}px`;
}

function clearAttachmentPreviewContent() {
  refs.attachmentPreviewBody.innerHTML = "";
}

function closeAttachmentPreview() {
  clearAttachmentPreviewContent();
  refs.attachmentPreviewModal.classList.add("hidden");
  refs.attachmentPreviewModal.setAttribute("aria-hidden", "true");
  refs.attachmentPreviewDownload.disabled = true;
  refs.attachmentPreviewDownload.dataset.relativePath = "";
  refs.attachmentPreviewMeta.textContent = "";
  refs.attachmentPreviewTitle.textContent = "未选择附件";
  state.attachmentPreview = null;
}

function openAttachmentPreview(preview, relativePath) {
  refs.attachmentPreviewTitle.textContent = preview.name || "附件";
  refs.attachmentPreviewMeta.textContent = [relativePath, formatFileSize(preview.size)]
    .filter(Boolean)
    .join(" | ");
  refs.attachmentPreviewDownload.disabled = false;
  refs.attachmentPreviewDownload.dataset.relativePath = relativePath;
  refs.attachmentPreviewModal.classList.remove("hidden");
  refs.attachmentPreviewModal.setAttribute("aria-hidden", "false");
  clearAttachmentPreviewContent();

  const body = refs.attachmentPreviewBody;
  const kind = preview.previewKind;

  if (kind === "image") {
    const wrap = document.createElement("div");
    wrap.className = "preview-image-wrap";
    const image = document.createElement("img");
    image.src = preview.fileUrl;
    image.alt = preview.name || "attachment preview";
    wrap.append(image);
    body.append(wrap);
  } else if (kind === "pdf") {
    const wrap = document.createElement("div");
    wrap.className = "preview-pdf-wrap";
    const frame = document.createElement("iframe");
    frame.className = "preview-pdf-frame";
    frame.src = `${preview.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`;
    frame.title = preview.name || "PDF preview";
    wrap.append(frame);
    body.append(wrap);
  } else if (kind === "video") {
    const wrap = document.createElement("div");
    wrap.className = "preview-video-wrap";
    const video = document.createElement("video");
    video.src = preview.fileUrl;
    video.controls = true;
    video.preload = "metadata";
    wrap.append(video);
    body.append(wrap);
  } else if (kind === "audio") {
    const wrap = document.createElement("div");
    wrap.className = "preview-audio-wrap";
    const audio = document.createElement("audio");
    audio.src = preview.fileUrl;
    audio.controls = true;
    audio.preload = "metadata";
    wrap.append(audio);
    body.append(wrap);
  } else if (kind === "markdown") {
    if (preview.truncated) {
      const note = document.createElement("p");
      note.className = "preview-text-note";
      note.textContent = "Markdown preview is truncated to the first 256 KB.";
      body.append(note);
    }

    const article = document.createElement("article");
    article.className = "preview-markdown";
    article.innerHTML = renderMarkdownPreview(preview.content || "", {
      baseUrl: preview.fileUrl || "",
    });
    body.append(article);
  } else if (kind === "text") {
    if (preview.truncated) {
      const note = document.createElement("p");
      note.className = "preview-text-note";
      note.textContent = "文件较大，当前只预览前 256 KB 内容。";
      body.append(note);
    }

    const codeLanguage = getAttachmentPreviewCodeLanguage(preview.name || relativePath);

    if (codeLanguage) {
      const container = document.createElement("div");
      container.className = "preview-code-file";
      container.innerHTML = renderMarkdownCodeBlock(preview.content || "", codeLanguage);
      body.append(container);
    } else {
      const pre = document.createElement("pre");
      pre.className = "preview-text";
      pre.textContent = preview.content || "";
      body.append(pre);
    }
  } else {
    const empty = document.createElement("div");
    empty.className = "preview-empty";
    empty.textContent = "当前附件暂不支持预览。";
    body.append(empty);
  }

  state.attachmentPreview = {
    relativePath,
    name: preview.name || "",
  };
}

function updateAvailability() {
  const enabled = Boolean(state.currentDocument);
  refs.saveDocButton.disabled = !enabled;
  refs.exportPdfButton.disabled = !enabled;
  refs.editor.contentEditable = enabled ? "true" : "false";
  refs.tagInput.disabled = !enabled;
  refs.addTagButton.disabled = !enabled;
  renderDocumentOutline();

  if (!enabled) {
    hideImageContextMenu();
    hideSelectionBubble();
    hideBlockHandle();
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPathExtension(value) {
  const normalized = String(value || "").split(/[?#]/u, 1)[0];
  const match = normalized.match(/(\.[^.\\/]+)$/u);
  return match ? match[1].toLowerCase() : "";
}

function getAttachmentPreviewKind(value) {
  const extension = getPathExtension(value);

  if (ATTACHMENT_IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (ATTACHMENT_MARKDOWN_EXTENSIONS.has(extension)) {
    return "markdown";
  }

  if (ATTACHMENT_PDF_EXTENSIONS.has(extension)) {
    return "pdf";
  }

  if (ATTACHMENT_TEXT_EXTENSIONS.has(extension)) {
    return "text";
  }

  if (ATTACHMENT_VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  if (ATTACHMENT_AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }

  return "";
}

function getAttachmentPreviewCodeLanguage(value) {
  return ATTACHMENT_CODE_LANGUAGE_BY_EXTENSION.get(getPathExtension(value)) || "";
}

function formatFileSize(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function resolveMarkdownPreviewUrl(target, baseUrl) {
  const rawTarget = normalizeCodeText(target || "").trim();

  if (!rawTarget) {
    return "";
  }

  try {
    const resolved = new URL(rawTarget, baseUrl || window.location.href);

    if (!["http:", "https:", "file:", "mailto:", "tel:", "data:"].includes(resolved.protocol)) {
      return "";
    }

    if (resolved.protocol === "data:" && !resolved.href.startsWith("data:image/")) {
      return "";
    }

    return resolved.toString();
  } catch {
    return "";
  }
}

function createMarkdownTokenStore() {
  const tokens = [];

  return {
    stash(html) {
      const marker = `@@MDTOKEN${tokens.length}@@`;
      tokens.push(html);
      return marker;
    },
    restore(text) {
      return text.replace(/@@MDTOKEN(\d+)@@/gu, (_match, index) => tokens[Number(index)] || "");
    },
  };
}

function renderMarkdownInline(markdown, options = {}) {
  const tokenStore = createMarkdownTokenStore();
  const baseUrl = options.baseUrl || "";
  let html = normalizeCodeText(markdown || "");

  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/gu, (_match, alt, target, title) => {
    const resolvedUrl = resolveMarkdownPreviewUrl(target, baseUrl);

    if (!resolvedUrl) {
      return tokenStore.stash(`<span>${escapeHtml(alt || target)}</span>`);
    }

    const safeAlt = escapeHtml(alt || "");
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return tokenStore.stash(
      `<img class="preview-markdown-inline-image" src="${escapeHtml(resolvedUrl)}" alt="${safeAlt}"${titleAttr} />`,
    );
  });

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/gu, (_match, label, target, title) => {
    const resolvedUrl = resolveMarkdownPreviewUrl(target, baseUrl);
    const safeLabel = escapeHtml(label);

    if (!resolvedUrl) {
      return tokenStore.stash(`<span>${safeLabel}</span>`);
    }

    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return tokenStore.stash(
      `<a href="${escapeHtml(resolvedUrl)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${safeLabel}</a>`,
    );
  });

  html = html.replace(/`([^`\n]+)`/gu, (_match, code) => {
    return tokenStore.stash(`<code>${escapeHtml(code)}</code>`);
  });

  html = escapeHtml(html);
  html = html.replace(/\*\*([^*\n]+)\*\*/gu, "<strong>$1</strong>");
  html = html.replace(/__([^_\n]+)__/gu, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/gu, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_\n]+)_(?!_)/gu, "$1<em>$2</em>");
  return tokenStore.restore(html);
}

function isMarkdownFence(line) {
  const match = line.match(/^\s*(```+|~~~+)\s*([\w#+.-]*)\s*$/u);

  if (!match) {
    return null;
  }

  return {
    marker: match[1],
    language: match[2] || "auto",
  };
}

function isMarkdownHorizontalRule(line) {
  return /^\s{0,3}(?:-\s*){3,}$|^\s{0,3}(?:_\s*){3,}$|^\s{0,3}(?:\*\s*){3,}$/u.test(line);
}

function isMarkdownListItem(line) {
  const unordered = line.match(/^\s*[-+*]\s+(.+)$/u);

  if (unordered) {
    return {
      ordered: false,
      content: unordered[1],
    };
  }

  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/u);

  if (!ordered) {
    return null;
  }

  return {
    ordered: true,
    content: ordered[1],
  };
}

function renderMarkdownCodeBlock(code, language) {
  const rawCode = normalizeCodeText(code);
  const highlighted = api.highlightCode({
    code: rawCode,
    language: language || "auto",
  });
  const safeLanguage = escapeHtml(highlighted.detectedLanguage || language || "text");

  return `
    <div class="preview-markdown-code-wrap">
      <div class="preview-markdown-code-head">
        <div class="preview-markdown-code-label">${safeLanguage}</div>
        <button type="button" class="code-copy-button" data-action="copy-preview-code">Copy</button>
      </div>
      <pre class="preview-markdown-code"><code class="hljs">${highlighted.html}</code></pre>
    </div>
  `;
}

function renderMarkdownPreview(markdown, options = {}) {
  const baseUrl = options.baseUrl || "";
  const lines = normalizeCodeText(markdown || "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (/^\s*$/u.test(line)) {
      index += 1;
      continue;
    }

    const fence = isMarkdownFence(line);

    if (fence) {
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith(fence.marker)) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(renderMarkdownCodeBlock(codeLines.join("\n"), fence.language));
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/u);

    if (heading) {
      const level = Math.min(heading[1].length, 6);
      blocks.push(`<h${level}>${renderMarkdownInline(heading[2], { baseUrl })}</h${level}>`);
      index += 1;
      continue;
    }

    if (isMarkdownHorizontalRule(line)) {
      blocks.push("<hr />");
      index += 1;
      continue;
    }

    if (/^\s*>/u.test(line)) {
      const quoteLines = [];

      while (index < lines.length && /^\s*>/u.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/u, ""));
        index += 1;
      }

      blocks.push(`<blockquote>${renderMarkdownPreview(quoteLines.join("\n"), { baseUrl })}</blockquote>`);
      continue;
    }

    const listItem = isMarkdownListItem(line);

    if (listItem) {
      const ordered = listItem.ordered;
      const items = [];

      while (index < lines.length) {
        const currentLine = lines[index];
        const currentItem = isMarkdownListItem(currentLine);

        if (!currentItem || currentItem.ordered !== ordered) {
          break;
        }

        let content = currentItem.content;
        index += 1;

        while (index < lines.length && /^\s{2,}\S/u.test(lines[index]) && !isMarkdownListItem(lines[index])) {
          content += `\n${lines[index].trim()}`;
          index += 1;
        }

        items.push(`<li>${renderMarkdownInline(content, { baseUrl }).replace(/\n/gu, "<br />")}</li>`);
      }

      blocks.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];

      if (
        /^\s*$/u.test(nextLine) ||
        isMarkdownFence(nextLine) ||
        /^\s{0,3}(#{1,6})\s+/u.test(nextLine) ||
        /^\s*>/u.test(nextLine) ||
        isMarkdownListItem(nextLine) ||
        isMarkdownHorizontalRule(nextLine)
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push(`<p>${renderMarkdownInline(paragraphLines.join("\n"), { baseUrl }).replace(/\n/gu, "<br />")}</p>`);
  }

  return blocks.join("");
}

function normalizeExternalUrl(value) {
  const raw = normalizeCodeText(value || "").trim();

  if (!raw) {
    return "";
  }

  const candidate =
    /^(https?:\/\/|mailto:|tel:)/iu.test(raw) ? raw : /^www\./iu.test(raw) ? `https://${raw}` : "";

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);

    if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function unwrapElementPreservingChildren(element) {
  if (!element?.parentNode) {
    return;
  }

  const fragment = document.createDocumentFragment();

  while (element.firstChild) {
    fragment.append(element.firstChild);
  }

  element.replaceWith(fragment);
}

function normalizeAnchorElement(anchor) {
  if (!anchor) {
    return false;
  }

  const href = normalizeExternalUrl(anchor.getAttribute("href") || anchor.dataset.href || anchor.textContent);

  if (!href) {
    unwrapElementPreservingChildren(anchor);
    return false;
  }

  anchor.classList.add("editor-link");
  anchor.setAttribute("href", href);
  anchor.dataset.href = href;
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer");
  anchor.setAttribute("title", LINK_OPEN_HINT);
  anchor.removeAttribute("contenteditable");

  if (!normalizeCodeText(anchor.textContent).trim()) {
    anchor.textContent = href;
  }

  return true;
}

function normalizeInlineLinks(root = refs.editor) {
  root.querySelectorAll("a").forEach((anchor) => {
    normalizeAnchorElement(anchor);
  });
}

function listSanitizableEditorElements(root) {
  const descendants = root?.querySelectorAll ? [...root.querySelectorAll("*")] : [];
  return root?.nodeType === Node.ELEMENT_NODE ? [root, ...descendants] : descendants;
}

function sanitizeEditorNodeTree(root) {
  if (!root?.querySelectorAll) {
    return root;
  }

  root.querySelectorAll(EDITOR_SANITIZE_REMOVE_SELECTOR).forEach((node) => {
    node.remove();
  });

  listSanitizableEditorElements(root).forEach((element) => {
    if (!element.parentNode && element !== root) {
      return;
    }

    const tagName = (element.tagName || "").toLowerCase();

    if (tagName === "img") {
      if (!element.closest(".image-node")) {
        element.remove();
        return;
      }

      element.removeAttribute("src");
      element.removeAttribute("srcset");
      element.removeAttribute("sizes");
    }

    if (tagName === "iframe" || tagName === "embed") {
      const embed = normalizeVideoEmbedUrl(element.getAttribute("src"));

      if (!embed) {
        element.remove();
        return;
      }

      element.setAttribute("src", embed.src);
      element.removeAttribute("srcdoc");
    }

    if (tagName === "button" && !element.closest(".attachment-node, .code-block-node")) {
      unwrapElementPreservingChildren(element);
      return;
    }

    if (tagName === "select" && !element.closest(".code-block-node")) {
      element.remove();
      return;
    }

    if (tagName === "option" && !element.closest(".code-language-select")) {
      element.remove();
      return;
    }

    [...element.attributes].forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();

      if (
        attributeName.startsWith("on") ||
        ["style", "srcdoc", "ping", "nonce", "integrity", "contenteditable"].includes(attributeName)
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attributeName === "href") {
        if (tagName === "a") {
          const safeHref = normalizeExternalUrl(attribute.value);

          if (safeHref) {
            element.setAttribute("href", safeHref);
          } else {
            element.removeAttribute(attribute.name);
          }
        } else {
          element.removeAttribute(attribute.name);
        }

        return;
      }

      if (attributeName === "src") {
        if (tagName !== "iframe" && tagName !== "embed") {
          element.removeAttribute(attribute.name);
        }

        return;
      }

      if (attributeName === "target") {
        if (tagName === "a") {
          element.setAttribute("target", "_blank");
        } else {
          element.removeAttribute(attribute.name);
        }

        return;
      }

      if (attributeName === "rel") {
        if (tagName === "a") {
          element.setAttribute("rel", "noopener noreferrer");
        } else {
          element.removeAttribute(attribute.name);
        }
      }
    });
  });

  normalizeInlineLinks(root);
  return root;
}

function sanitizeEditorMarkup(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  sanitizeEditorNodeTree(template.content);
  return template.innerHTML;
}

function buildLibraryTagSummary(documents = state.library.documents) {
  const counts = new Map();
  let untaggedCount = 0;

  documents.forEach((documentItem) => {
    const tags = normalizeTagList(documentItem.tags);

    if (!tags.length) {
      untaggedCount += 1;
      return;
    }

    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  const tags = [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "zh-CN");
    })
    .map(([tag, count]) => ({ tag, count }));

  if (untaggedCount > 0) {
    tags.push({ tag: LIBRARY_UNTAGGED_FILTER, count: untaggedCount, label: state.library.untaggedLabel });
  }

  return tags;
}

function getFilteredLibraryDocuments() {
  return filterAndSortLibraryDocuments({
    documents: state.library.documents,
    searchText: state.library.searchText,
    selectedTag: state.library.selectedTag,
    untaggedFilter: LIBRARY_UNTAGGED_FILTER,
    recentDocuments: state.library.recentDocuments,
    sortKey: state.library.sortKey,
  });
}

function getLibraryRootMetaText() {
  if (state.library.isEnvironmentOverride) {
    return "当前目录由环境变量 FLOWDOC_LIBRARY_ROOT 锁定";
  }

  if (state.library.isCustomRoot) {
    return "当前使用你手动选择的文档库目录";
  }

  if (state.library.rootSource === "legacy") {
    return "当前沿用旧版桌面本地文档目录";
  }

  return "当前使用系统 Documents/FlowDoc Library 作为默认文档库";
}

function applyLibraryIndexResult(result = {}) {
  state.library.rootPath = result.rootPath || "";
  state.library.rootSource = result.rootSource || "default";
  state.library.isCustomRoot = result.isCustomRoot === true;
  state.library.isEnvironmentOverride = result.isEnvironmentOverride === true;
  state.library.documents = Array.isArray(result.documents)
    ? result.documents.map((documentItem) => ({
        ...documentItem,
        tags: normalizeTagList(documentItem.tags),
      }))
    : [];
  state.library.recentDocuments = loadRecentDocuments();
  state.library.untaggedLabel = result.untaggedLabel || "未分类";
}

function reconcileLibraryFilters() {
  const availableTags = new Set(
    buildLibraryTagSummary(state.library.documents).map((item) => item.tag),
  );

  if (state.library.selectedTag && !availableTags.has(state.library.selectedTag)) {
    state.library.selectedTag = "";
  }
}

function renderCurrentDocumentTags() {
  if (!refs.docTags) {
    return;
  }

  const tags = normalizeTagList(state.currentDocument?.tags);

  if (!state.currentDocument) {
    refs.docTags.className = "tag-list empty";
    refs.docTags.textContent = "打开文档后可以为它添加标签";
    return;
  }

  if (!tags.length) {
    refs.docTags.className = "tag-list empty";
    refs.docTags.textContent = "当前文档还没有标签";
    return;
  }

  refs.docTags.className = "tag-list";
  refs.docTags.innerHTML = tags
    .map(
      (tag) =>
        `<span class="tag-chip">${escapeHtml(tag)}<button type="button" data-remove-tag="${escapeHtml(tag)}" aria-label="移除标签 ${escapeHtml(tag)}">×</button></span>`,
    )
    .join("");
}

function renderLibraryView() {
  if (!refs.libraryRootPath || !refs.libraryTagFilters || !refs.libraryDocList) {
    return;
  }

  refs.libraryRootPath.textContent = state.library.rootPath || "未找到文档库目录";
  refs.libraryRootPath.title = state.library.rootPath || "";

  if (refs.libraryRootMeta) {
    refs.libraryRootMeta.textContent = getLibraryRootMetaText();
  }

  if (refs.chooseLibraryRootButton) {
    refs.chooseLibraryRootButton.disabled = state.library.isEnvironmentOverride;
    refs.chooseLibraryRootButton.title = state.library.isEnvironmentOverride
      ? "当前目录由环境变量 FLOWDOC_LIBRARY_ROOT 指定，无法在界面中修改"
      : "";
  }

  if (refs.resetLibraryRootButton) {
    refs.resetLibraryRootButton.disabled = state.library.isEnvironmentOverride || !state.library.isCustomRoot;
    refs.resetLibraryRootButton.title = state.library.isEnvironmentOverride
      ? "当前目录由环境变量 FLOWDOC_LIBRARY_ROOT 指定，无法在界面中重置"
      : state.library.isCustomRoot
        ? ""
        : "当前已经在使用默认文档库目录";
  }

  const tagSummary = buildLibraryTagSummary();
  const activeTag = state.library.selectedTag;
  const filteredDocuments = getFilteredLibraryDocuments();
  refreshLibrarySortUi();

  refs.libraryTagFilters.className = tagSummary.length ? "tag-filter-list" : "tag-filter-list empty";
  refs.libraryTagFilters.innerHTML = tagSummary.length
    ? [
        `<button type="button" class="tag-filter-button${activeTag ? "" : " is-active"}" data-library-tag="">全部 (${state.library.documents.length})</button>`,
        ...tagSummary.map((item) => {
          const value = item.tag === LIBRARY_UNTAGGED_FILTER ? LIBRARY_UNTAGGED_FILTER : item.tag;
          const label = item.label || item.tag;
          const activeClass = activeTag === value ? " is-active" : "";

          return `<button type="button" class="tag-filter-button${activeClass}" data-library-tag="${escapeHtml(value)}">${escapeHtml(label)} (${item.count})</button>`;
        }),
      ].join("")
    : "当前文档库中还没有可筛选的标签";

  if (!filteredDocuments.length) {
    refs.libraryDocList.innerHTML = `<div class="library-doc-meta">没有匹配当前筛选条件的文档</div>`;
    return;
  }

  refs.libraryDocList.innerHTML = filteredDocuments
    .map((documentItem) => {
      const isActive =
        state.currentDocument && state.currentDocument.filePath === documentItem.filePath ? " is-active" : "";
      const tags = normalizeTagList(documentItem.tags);
      const tagMarkup = tags.length
        ? tags.map((tag) => `<span class="library-doc-tag">${escapeHtml(tag)}</span>`).join("")
        : `<span class="library-doc-tag">${escapeHtml(state.library.untaggedLabel)}</span>`;

      return `
        <button type="button" class="library-doc-button${isActive}" data-open-library-doc="${escapeHtml(documentItem.filePath)}">
          <span class="library-doc-title">${escapeHtml(documentItem.title)}</span>
          <span class="library-doc-tags">${tagMarkup}</span>
          <span class="library-doc-meta">${escapeHtml(documentItem.relativePath)}</span>
          <span class="library-doc-meta">更新于 ${escapeHtml(formatLibraryTimestamp(documentItem.updatedAt))}</span>
        </button>
      `;
    })
    .join("");
}

function toDisplayName(filePath) {
  return filePath.split(/[\\/]/u).pop() || filePath;
}

function getDocumentTitleFromPath(filePath) {
  const displayName = toDisplayName(filePath || "");
  return displayName.replace(/\.[^.]+$/u, "") || "未命名文档";
}

function normalizeDocumentTitle(value) {
  const normalized = normalizeCodeText(value || "").replace(/\s+/gu, " ").trim();
  return normalized || "未命名文档";
}

function normalizeTagLabel(value) {
  return normalizeCodeText(value || "").replace(/\s+/gu, " ").trim();
}

function normalizeTagList(tags) {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(/[,，\n]/u)
      : [];
  const seen = new Set();
  const normalized = [];

  values.forEach((value) => {
    const nextTag = normalizeTagLabel(value);

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

function formatLibraryTimestamp(value) {
  if (!value) {
    return "未保存时间";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未保存时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function updateDocumentTitlePreview(title) {
  refs.docName.textContent = title;
  document.title = `${title} - FlowDoc`;
}

function updateDocumentMeta(filePath, title = getDocumentTitleFromPath(filePath), tags = state.currentDocument?.tags || []) {
  const normalizedTags = normalizeTagList(tags);

  if (!state.currentDocument) {
    state.currentDocument = { filePath, title, tags: normalizedTags };
  } else {
    state.currentDocument.filePath = filePath;
    state.currentDocument.title = title;
    state.currentDocument.tags = normalizedTags;
  }

  updateDocumentTitlePreview(title);
  refs.docPath.textContent = filePath;
  renderCurrentDocumentTags();
  renderLibraryView();
}

function normalizeCodeText(text) {
  return String(text || "").replaceAll("\r\n", "\n").replaceAll("\u00a0", " ");
}

function isEmptyText(text) {
  return normalizeCodeText(text).replaceAll("\u200b", "").trim().length === 0;
}

function generateNodeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nodeToElement(node) {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function getSelection() {
  return window.getSelection();
}

function getSelectionRange() {
  const selection = getSelection();
  return selection && selection.rangeCount ? selection.getRangeAt(0) : null;
}

function isSpecialBlock(node) {
  return Boolean(node && node.nodeType === Node.ELEMENT_NODE && node.matches(SPECIAL_BLOCK_SELECTOR));
}

function isGapParagraph(node) {
  return Boolean(node && node.nodeType === Node.ELEMENT_NODE && node.matches("p.editor-gap"));
}

function getBlockText(node) {
  return normalizeCodeText(node?.innerText || node?.textContent || "");
}

function paragraphHasContent(node) {
  return !isEmptyText(getBlockText(node));
}

function isRangeInsideEditor(range) {
  return Boolean(range && refs.editor.contains(nodeToElement(range.commonAncestorContainer)));
}

function isRangeInsideCodeEditor(range) {
  return Boolean(nodeToElement(range?.commonAncestorContainer)?.closest(".code-block-editor"));
}

function getTopLevelNode(node) {
  let current = nodeToElement(node);

  while (current && current.parentElement !== refs.editor) {
    current = current.parentElement;
  }

  return current && current.parentElement === refs.editor ? current : null;
}

function getEditablePlainText(element) {
  return normalizeCodeText(element?.innerText || element?.textContent || "");
}

function getSelectionTextOffset(root) {
  const selection = getSelection();

  if (!selection.rangeCount) {
    return 0;
  }

  const range = selection.getRangeAt(0);

  if (!root.contains(range.endContainer)) {
    return getEditablePlainText(root).length;
  }

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(root);
  beforeRange.setEnd(range.endContainer, range.endOffset);
  return beforeRange.toString().length;
}

function setSelectionTextOffset(root, offset) {
  const selection = getSelection();
  const range = document.createRange();
  let remaining = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    if (remaining <= current.textContent.length) {
      range.setStart(current, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    remaining -= current.textContent.length;
    current = walker.nextNode();
  }

  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getBookmarkContainer(node) {
  return getTopLevelNode(node) || refs.editor.lastElementChild || refs.editor;
}

function getTextOffsetWithinRoot(root, node, offset) {
  if (!root || !node || !root.contains(node)) {
    return 0;
  }

  const range = document.createRange();

  try {
    range.selectNodeContents(root);
    range.setEnd(node, offset);
  } catch {
    return 0;
  }

  return range.toString().length;
}

function resolveTextOffsetBoundary(root, offset, { preferEnd = false } = {}) {
  if (!root) {
    return null;
  }

  const targetOffset = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = targetOffset;
  let current = walker.nextNode();

  while (current) {
    const length = current.textContent?.length || 0;

    if (remaining <= length) {
      return {
        container: current,
        offset: remaining,
      };
    }

    remaining -= length;
    current = walker.nextNode();
  }

  if (root.nodeType === Node.TEXT_NODE) {
    return {
      container: root,
      offset: Math.min(targetOffset, root.textContent?.length || 0),
    };
  }

  return {
    container: root,
    offset: preferEnd ? root.childNodes.length : 0,
  };
}

function buildBookmarkBoundary(node, offset) {
  if (node === refs.editor && refs.editor.children.length) {
    const childIndex = Math.min(Math.max(offset > 0 ? offset - 1 : 0, 0), refs.editor.children.length - 1);
    const block = refs.editor.children[childIndex];

    ensureNodeId(block, block.dataset.kind || block.tagName?.toLowerCase?.() || "block");

    return {
      blockId: block.dataset.nodeId,
      textOffset: offset > 0 && childIndex === offset - 1 ? getEditablePlainText(block).length : 0,
    };
  }

  const block = getBookmarkContainer(node);

  if (!block || block === refs.editor) {
    return {
      blockId: "",
      textOffset: 0,
    };
  }

  ensureNodeId(block, block.dataset.kind || block.tagName?.toLowerCase?.() || "block");

  return {
    blockId: block.dataset.nodeId,
    textOffset: getTextOffsetWithinRoot(block, node, offset),
  };
}

function applySelectionRange(range) {
  if (!range) {
    return false;
  }

  const selection = getSelection();
  const focusTarget = nodeToElement(range.startContainer)?.closest(".code-block-editor") || refs.editor;
  focusTarget.focus();
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function createRangeFromBookmarkBlocks(bookmark) {
  if (!bookmark?.startBlockId || !bookmark?.endBlockId) {
    return null;
  }

  const startBlock = refs.editor.querySelector(`[data-node-id="${bookmark.startBlockId}"]`);
  const endBlock = refs.editor.querySelector(`[data-node-id="${bookmark.endBlockId}"]`);

  if (!startBlock || !endBlock) {
    return null;
  }

  const startBoundary = resolveTextOffsetBoundary(startBlock, bookmark.startTextOffset);
  const endBoundary = resolveTextOffsetBoundary(endBlock, bookmark.endTextOffset, { preferEnd: true });

  if (!startBoundary || !endBoundary) {
    return null;
  }

  const range = document.createRange();

  try {
    range.setStart(startBoundary.container, startBoundary.offset);
    range.setEnd(endBoundary.container, endBoundary.offset);
  } catch {
    return null;
  }

  return range;
}

function getNodePath(node, root = refs.editor) {
  const path = [];
  let current = node;

  while (current && current !== root) {
    const parent = current.parentNode;

    if (!parent) {
      return null;
    }

    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return current === root ? path : null;
}

function resolveNodePath(path, root = refs.editor) {
  let current = root;

  for (const index of path) {
    if (!current?.childNodes || index < 0 || index >= current.childNodes.length) {
      return null;
    }

    current = current.childNodes[index];
  }

  return current;
}

function createSelectionBookmark(range = getSelectionRange()) {
  if (!range || !isRangeInsideEditor(range)) {
    return null;
  }

  const startPath = getNodePath(range.startContainer);
  const endPath = getNodePath(range.endContainer);
  const startBoundary = buildBookmarkBoundary(range.startContainer, range.startOffset);
  const endBoundary = buildBookmarkBoundary(range.endContainer, range.endOffset);

  if (!startPath || !endPath) {
    return null;
  }

  return {
    collapsed: range.collapsed,
    startPath,
    startOffset: range.startOffset,
    endPath,
    endOffset: range.endOffset,
    startBlockId: startBoundary.blockId,
    startTextOffset: startBoundary.textOffset,
    endBlockId: endBoundary.blockId,
    endTextOffset: endBoundary.textOffset,
  };
}

function applySelectionBookmark(bookmark) {
  if (!bookmark) {
    return false;
  }

  const startNode = resolveNodePath(bookmark.startPath);
  const endNode = resolveNodePath(bookmark.endPath);

  if (!startNode || !endNode) {
    const fallbackRange = createRangeFromBookmarkBlocks(bookmark);
    return applySelectionRange(fallbackRange);
  }

  const startBlockId = getBookmarkContainer(startNode)?.dataset?.nodeId || "";
  const endBlockId = getBookmarkContainer(endNode)?.dataset?.nodeId || "";

  if (
    (bookmark.startBlockId && startBlockId && bookmark.startBlockId !== startBlockId) ||
    (bookmark.endBlockId && endBlockId && bookmark.endBlockId !== endBlockId)
  ) {
    const fallbackRange = createRangeFromBookmarkBlocks(bookmark);
    return applySelectionRange(fallbackRange);
  }

  const range = document.createRange();

  try {
    range.setStart(startNode, Math.min(bookmark.startOffset, startNode.length ?? startNode.childNodes.length));
    range.setEnd(endNode, Math.min(bookmark.endOffset, endNode.length ?? endNode.childNodes.length));
  } catch {
    const fallbackRange = createRangeFromBookmarkBlocks(bookmark);
    return applySelectionRange(fallbackRange);
  }

  return applySelectionRange(range);
}

function createEndSelectionBookmark() {
  const range = document.createRange();
  range.selectNodeContents(refs.editor);
  range.collapse(false);
  return createSelectionBookmark(range);
}

function saveSelection() {
  const bookmark = createSelectionBookmark();

  if (bookmark) {
    state.savedSelection = bookmark;
  }
}

function restoreSelection() {
  if (state.savedSelection && applySelectionBookmark(state.savedSelection)) {
    return getSelectionRange();
  }

  refs.editor.focus();
  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(refs.editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
  return range;
}

function beginPointerSelection() {
  state.isPointerSelecting = true;
  hideSelectionBubble();
  hideBlockHandle();
}

function endPointerSelection() {
  if (!state.isPointerSelecting) {
    return;
  }

  state.isPointerSelecting = false;
  scheduleUiRefresh();
}

function clearSelectAllScope() {
  state.selectAllScope = null;
}

function selectNodeContents(target, focusTarget = target) {
  if (!target) {
    return null;
  }

  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(target);
  focusTarget?.focus?.();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
  return range;
}

function isSelectionExactlyNodeContents(target) {
  const range = getSelectionRange();

  if (!range || !target) {
    return false;
  }

  if (range.commonAncestorContainer !== target && !target.contains(range.commonAncestorContainer)) {
    return false;
  }

  const fullRange = document.createRange();
  fullRange.selectNodeContents(target);

  return (
    range.compareBoundaryPoints(Range.START_TO_START, fullRange) === 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, fullRange) === 0
  );
}

function syncSelectAllScope() {
  if (!state.selectAllScope) {
    return;
  }

  if (state.selectAllScope === "document") {
    if (!isSelectionExactlyNodeContents(refs.editor)) {
      clearSelectAllScope();
    }

    return;
  }

  if (!state.selectAllScope.startsWith("code:")) {
    clearSelectAllScope();
    return;
  }

  const nodeId = state.selectAllScope.slice("code:".length);
  const codeEditor = refs.editor
    .querySelector(`[data-node-id="${nodeId}"]`)
    ?.querySelector(".code-block-editor");

  if (!codeEditor || !isSelectionExactlyNodeContents(codeEditor)) {
    clearSelectAllScope();
  }
}

function handleSelectAllShortcut(codeEditor = null) {
  if (!state.currentDocument) {
    return false;
  }

  if (codeEditor) {
    const codeBlock = codeEditor.closest(".code-block-node");
    ensureNodeId(codeBlock, "code");
    const scope = `code:${codeBlock.dataset.nodeId}`;

    if (state.selectAllScope === scope && isSelectionExactlyNodeContents(codeEditor)) {
      selectNodeContents(refs.editor, refs.editor);
      state.selectAllScope = "document";
    } else {
      selectNodeContents(codeEditor, codeEditor);
      state.selectAllScope = scope;
    }

    scheduleUiRefresh();
    return true;
  }

  const range = getSelectionRange();

  if (!range || !isRangeInsideEditor(range)) {
    return false;
  }

  selectNodeContents(refs.editor, refs.editor);
  state.selectAllScope = "document";
  scheduleUiRefresh();
  return true;
}

function getPrimaryTitleNode() {
  return [...refs.editor.children].find((node) => node.tagName === "H1") || refs.editor.querySelector("h1");
}

function setNodeTextPreservingCaret(node, text) {
  if (!node) {
    return;
  }

  const selection = getSelection();
  const isActive = document.activeElement === node;
  const containsSelection =
    isActive && selection?.rangeCount && node.contains(selection.getRangeAt(0).commonAncestorContainer);
  const caretOffset = containsSelection ? getSelectionTextOffset(node) : null;

  node.textContent = text;

  if (containsSelection) {
    node.focus();
    setSelectionTextOffset(node, Math.min(caretOffset, text.length));
    saveSelection();
  }
}

function ensureDocumentTitleHeading(title = state.currentDocument?.title) {
  if (!state.currentDocument) {
    return null;
  }

  const normalizedTitle = normalizeDocumentTitle(title);
  let titleNode = getPrimaryTitleNode();

  if (!titleNode) {
    titleNode = document.createElement("h1");
    titleNode.textContent = normalizedTitle;
    refs.editor.prepend(titleNode);
    return titleNode;
  }

  if (normalizeDocumentTitle(getBlockText(titleNode)) !== normalizedTitle) {
    setNodeTextPreservingCaret(titleNode, normalizedTitle);
  }

  return titleNode;
}

function ensureDocumentTitleHeadingExists() {
  let titleNode = getPrimaryTitleNode();

  if (titleNode) {
    return titleNode;
  }

  titleNode = document.createElement("h1");
  titleNode.textContent = normalizeDocumentTitle(state.currentDocument?.title);
  refs.editor.prepend(titleNode);
  return titleNode;
}

async function refreshDocumentPathFromDisk() {
  if (!state.currentDocument) {
    return false;
  }

  const result = await api.refreshDocumentPath({
    filePath: state.currentDocument.filePath,
    lastSavedHtml: state.lastSavedHtml,
  });

  if (!result.exists || !result.changed) {
    return false;
  }

  updateDocumentMeta(result.filePath, result.title);
  ensureDocumentTitleHeading(result.title);
  saveSelection();
  scheduleUiRefresh();
  await loadDocumentLibrary();
  return true;
}

async function syncDocumentTitleNow() {
  if (!state.currentDocument) {
    return false;
  }

  const titleNode = ensureDocumentTitleHeadingExists();
  const desiredTitle = normalizeDocumentTitle(getBlockText(titleNode));
  const previousPath = state.currentDocument.filePath;
  const currentPathTitle = getDocumentTitleFromPath(state.currentDocument.filePath);
  let changed = false;

  const renameResult = await api.renameDocument({
    filePath: previousPath,
    title: desiredTitle,
  });

  updateDocumentMeta(renameResult.filePath, renameResult.title);
  await loadDocumentLibrary();

  if (renameResult.title !== desiredTitle) {
    setNodeTextPreservingCaret(titleNode, renameResult.title);
    changed = true;
  }

  return changed || renameResult.title !== currentPathTitle || renameResult.filePath !== previousPath;
}

function scheduleDocumentTitleSync() {
  if (!state.currentDocument) {
    return;
  }

  window.clearTimeout(state.titleSyncTimer);
  state.titleSyncTimer = window.setTimeout(() => {
    flushDocumentTitleSync().catch((error) => {
      reportError("标题同步失败", error);
    });
  }, 260);
}

async function flushDocumentTitleSync() {
  window.clearTimeout(state.titleSyncTimer);

  if (state.titleSyncPromise) {
    return state.titleSyncPromise;
  }

  state.titleSyncPromise = syncDocumentTitleNow().finally(() => {
    state.titleSyncPromise = null;
  });

  return state.titleSyncPromise;
}

function placeCaretInside(target, { start = true } = {}) {
  if (!target) {
    return;
  }

  const editableTarget = target.matches?.(".code-block-node")
    ? target.querySelector(".code-block-editor")
    : target;

  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(editableTarget);
  range.collapse(start);

  editableTarget.focus?.();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
}

function placeCaretFromPoint(clientX, clientY, fallbackTarget, { start = false } = {}) {
  if (!fallbackTarget) {
    return null;
  }

  let range = null;

  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(clientX, clientY);

    if (position?.offsetNode) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  } else if (typeof document.caretRangeFromPoint === "function") {
    range = document.caretRangeFromPoint(clientX, clientY);

    if (range) {
      range.collapse(true);
    }
  }

  if (!range || !fallbackTarget.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(fallbackTarget);
    range.collapse(start);
  }

  const selection = getSelection();
  fallbackTarget.focus?.();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
  return range;
}

function moveCaretAfterNode(node) {
  const selection = getSelection();
  const range = document.createRange();

  if (node.nodeType === Node.ELEMENT_NODE) {
    range.selectNodeContents(node);
    range.collapse(false);
  } else {
    range.setStartAfter(node);
    range.collapse(true);
  }

  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
}

function queueEditorMutation({ history = "schedule" } = {}) {
  if (history === "capture") {
    captureHistoryNow();
  } else if (history === "schedule") {
    scheduleHistoryCapture();
  }

  renderDocumentOutline();
  scheduleAutosave();
  scheduleUiRefresh();
}

function scheduleUiRefresh() {
  window.cancelAnimationFrame(state.uiFrame);
  state.uiFrame = window.requestAnimationFrame(refreshFloatingControls);
}

function buildCodeLanguageOptions(selectedValue) {
  return CODE_LANGUAGES.map(
    ({ value, label }) =>
      `<option value="${value}"${selectedValue === value ? " selected" : ""}>${label}</option>`,
  ).join("");
}

function buildGapMarkup() {
  return `<p class="editor-gap" data-gap="true" data-node-id="${generateNodeId("gap")}"><br></p>`;
}

function buildImageMarkup(file) {
  const safeName = escapeHtml(file.name);
  const safePath = escapeHtml(file.relativePath);

  return `
    <figure class="resource-card image-node" data-kind="image" data-src="${safePath}" data-name="${safeName}" data-node-id="${generateNodeId("image")}" contenteditable="false">
      <img alt="${safeName}" />
      <div class="resource-placeholder" hidden></div>
    </figure>
    ${buildGapMarkup()}
  `;
}

function buildAttachmentMarkup(file) {
  const safeName = escapeHtml(file.name);
  const safePath = escapeHtml(file.relativePath);
  const previewKind = getAttachmentPreviewKind(file.name || file.relativePath);

  return `
    <div class="resource-card attachment-node" data-kind="attachment" data-src="${safePath}" data-name="${safeName}" data-node-id="${generateNodeId("attachment")}" contenteditable="false">
      <div class="attachment-head">
        <button class="attachment-icon" type="button" data-action="download-attachment" title="复制到 Downloads">↓</button>
        <div class="attachment-copy">
          <strong>${safeName}</strong>
          <span>${safePath}</span>
        </div>
        <div class="attachment-actions">
          <button class="attachment-preview${previewKind ? "" : " hidden"}" type="button" data-action="preview-attachment">预览</button>
          <button class="attachment-download" type="button" data-action="download-attachment">下载到 Downloads</button>
        </div>
      </div>
      <div class="resource-placeholder" hidden></div>
    </div>
    ${buildGapMarkup()}
  `;
}

function normalizeYoutubeEmbedUrl(url) {
  const host = url.hostname.replace(/^www\./iu, "").toLowerCase();
  let videoId = "";

  if (host === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] || "";
  } else if (url.pathname.startsWith("/watch")) {
    videoId = url.searchParams.get("v") || "";
  } else {
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/iu);
    videoId = match?.[1] || "";
  }

  if (!videoId) {
    return null;
  }

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  const start = (url.searchParams.get("start") || url.searchParams.get("t") || "").replace(/[^\d]/gu, "");
  const list = url.searchParams.get("list") || "";

  if (start) {
    embedUrl.searchParams.set("start", start);
  }

  if (list) {
    embedUrl.searchParams.set("list", list);
  }

  return {
    provider: "YouTube",
    src: embedUrl.toString(),
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function normalizeBilibiliEmbedUrl(url) {
  const host = url.hostname.replace(/^www\./iu, "").toLowerCase();

  if (host === "player.bilibili.com" && url.pathname.startsWith("/player.html")) {
    return {
      provider: "Bilibili",
      src: url.toString(),
      sourceUrl: url.toString(),
    };
  }

  const match = url.pathname.match(/^\/video\/((?:BV[\da-z]+)|(?:av\d+))/iu);

  if (!match) {
    return null;
  }

  const identifier = match[1];
  const embedUrl = new URL("https://player.bilibili.com/player.html");
  const page = url.searchParams.get("p") || "1";

  if (/^BV/iu.test(identifier)) {
    embedUrl.searchParams.set("bvid", identifier);
  } else {
    embedUrl.searchParams.set("aid", identifier.replace(/^av/iu, ""));
  }

  embedUrl.searchParams.set("page", page);

  return {
    provider: "Bilibili",
    src: embedUrl.toString(),
    sourceUrl: url.toString(),
  };
}

function normalizeVideoEmbedUrl(value) {
  const rawValue = normalizeCodeText(value || "").trim();

  if (!rawValue) {
    return null;
  }

  const candidate = rawValue.startsWith("//") ? `https:${rawValue}` : rawValue;

  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./iu, "").toLowerCase();

    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
      return normalizeYoutubeEmbedUrl(url);
    }

    if (["bilibili.com", "m.bilibili.com", "player.bilibili.com"].includes(host)) {
      return normalizeBilibiliEmbedUrl(url);
    }
  } catch {
    return null;
  }

  return null;
}

function configureVideoIframe(iframe, embed) {
  if (!iframe || !embed) {
    return;
  }

  iframe.setAttribute("src", embed.src);
  iframe.setAttribute("title", `${embed.provider} 视频`);
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  iframe.setAttribute("allow", VIDEO_IFRAME_ALLOW);
}

function buildLinkMarkup(link) {
  const href = normalizeExternalUrl(link?.href);

  if (!href) {
    return "";
  }

  const label = normalizeCodeText(link.label || href).trim() || href;
  const safeHref = escapeHtml(href);

  return `<a class="editor-link" href="${safeHref}" data-href="${safeHref}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(LINK_OPEN_HINT)}">${escapeHtml(label)}</a>`;
}

function buildVideoEmbedMarkup(embed) {
  const nodeId = generateNodeId("video");
  const safeProvider = escapeHtml(embed.provider);
  const safeSrc = escapeHtml(embed.src);
  const safeSourceUrl = escapeHtml(embed.sourceUrl || embed.src);

  return {
    nodeId,
    html: `
      <div class="resource-card video-embed-node" data-kind="video-embed" data-provider="${safeProvider}" data-src="${safeSrc}" data-source-url="${safeSourceUrl}" data-node-id="${nodeId}" contenteditable="false">
        <div class="video-embed-head">
          <span>${safeProvider} 视频</span>
        </div>
        <div class="video-embed-frame">
          <iframe src="${safeSrc}" title="${safeProvider} 视频" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" allow="${escapeHtml(VIDEO_IFRAME_ALLOW)}"></iframe>
        </div>
        <div class="resource-placeholder" hidden></div>
      </div>
      ${buildGapMarkup()}
    `,
  };
}

function buildCodeBlockMarkup(codeText = "", language = "auto") {
  const safeCode = escapeHtml(codeText);
  const nodeId = generateNodeId("code");

  return {
    nodeId,
    html: `
      <div class="code-block-node" data-kind="code-block" data-language="${language}" data-node-id="${nodeId}" contenteditable="false">
        <div class="code-block-head">
          <span>代码块</span>
          <div class="code-block-actions">
            <button class="code-copy-button" type="button" data-action="copy-code">Copy</button>
            <select class="code-language-select">${buildCodeLanguageOptions(language)}</select>
          </div>
        </div>
        <pre class="code-block-frame"><code class="code-block-editor hljs" contenteditable="true" spellcheck="false">${safeCode}</code></pre>
      </div>
      ${buildGapMarkup()}
    `,
  };
}

function insertHtmlAtSelection(html) {
  const range = restoreSelection();
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const nodes = [...template.content.childNodes];

  range.insertNode(template.content);

  if (nodes.length > 0) {
    moveCaretAfterNode(nodes[nodes.length - 1]);
  }

  return nodes;
}

function focusCodeBlockById(nodeId) {
  const block = refs.editor.querySelector(`.code-block-node[data-node-id="${nodeId}"]`);
  const codeEditor = block?.querySelector(".code-block-editor");

  if (!codeEditor) {
    return;
  }

  codeEditor.focus();
  setSelectionTextOffset(codeEditor, getEditablePlainText(codeEditor).length);
  saveSelection();
}

function extractLinkFromClipboard(html, plainText) {
  const directUrl = normalizeExternalUrl(plainText);

  if (!html) {
    return directUrl ? { href: directUrl, label: directUrl } : null;
  }

  const template = document.createElement("template");
  template.innerHTML = html.trim();

  if (template.content.querySelector("iframe, embed, img")) {
    return null;
  }

  const anchors = [...template.content.querySelectorAll("a[href]")];

  if (anchors.length !== 1) {
    return directUrl ? { href: directUrl, label: directUrl } : null;
  }

  const anchor = anchors[0];
  const href = normalizeExternalUrl(anchor.getAttribute("href") || directUrl);

  if (!href) {
    return null;
  }

  const label = normalizeCodeText(anchor.textContent || plainText || href).trim() || href;
  return { href, label };
}

function extractVideoEmbedsFromMarkup(markup) {
  if (!markup) {
    return [];
  }

  const template = document.createElement("template");
  template.innerHTML = markup.trim();

  return [...template.content.querySelectorAll("iframe[src], embed[src]")]
    .map((node) => normalizeVideoEmbedUrl(node.getAttribute("src")))
    .filter(Boolean);
}

function getClipboardVideoEmbeds(html, plainText) {
  const markup = html || (/<iframe[\s>]/iu.test(plainText) ? plainText : "");

  if (!markup) {
    return [];
  }

  return extractVideoEmbedsFromMarkup(markup);
}

function createGapElement() {
  const template = document.createElement("template");
  template.innerHTML = buildGapMarkup();
  return template.content.firstElementChild;
}

function ensureNodeId(node, prefix) {
  if (!node.dataset.nodeId) {
    node.dataset.nodeId = generateNodeId(prefix);
  }
}

function markAsGap(node) {
  if (!node || node.tagName !== "P") {
    return node;
  }

  node.classList.add("editor-gap");
  node.dataset.gap = "true";
  ensureNodeId(node, "gap");

  if (!paragraphHasContent(node)) {
    node.innerHTML = "<br>";
  }

  return node;
}

function unmarkGap(node) {
  if (!node || node.tagName !== "P") {
    return;
  }

  node.classList.remove("editor-gap");
  node.removeAttribute("data-gap");
  node.removeAttribute("data-gap-active");

  if (!paragraphHasContent(node)) {
    node.innerHTML = "<br>";
  }
}

function activateGapParagraph(node) {
  const gap = markAsGap(node);
  gap.dataset.gapActive = "true";
  clearSpecialSelection();
  placeCaretInside(gap, { start: true });
  scheduleUiRefresh();
}

function collapseTransientGaps(except = null) {
  refs.editor.querySelectorAll("p.editor-gap[data-gap-active='true']").forEach((gap) => {
    if (gap === except) {
      return;
    }

    if (paragraphHasContent(gap)) {
      unmarkGap(gap);
      return;
    }

    gap.removeAttribute("data-gap-active");
    gap.innerHTML = "<br>";
  });
}

function promoteGapParagraphIfNeeded(node) {
  if (!isGapParagraph(node)) {
    return;
  }

  if (paragraphHasContent(node)) {
    unmarkGap(node);
  }
}

function getVideoMigrationTarget(node) {
  const topLevel = getTopLevelNode(node);

  if (!topLevel || topLevel === refs.editor) {
    return node;
  }

  if (topLevel.querySelectorAll("iframe, embed").length === 1 && isEmptyText(topLevel.textContent || "")) {
    return topLevel;
  }

  return node;
}

function migrateLegacyCodeBlocks() {
  const legacyBlocks = [...refs.editor.querySelectorAll("pre")].filter(
    (node) => !node.closest(".code-block-node"),
  );

  legacyBlocks.forEach((node) => {
    const legacyCode = normalizeCodeText(node.innerText || node.textContent || "");
    const fragment = document.createElement("template");
    fragment.innerHTML = buildCodeBlockMarkup(legacyCode).html.trim();
    node.replaceWith(...fragment.content.childNodes);
  });
}

function migrateLegacyVideoEmbeds() {
  const legacyEmbeds = [...refs.editor.querySelectorAll("iframe[src], embed[src]")].filter(
    (node) => !node.closest(".video-embed-node"),
  );

  legacyEmbeds.forEach((node) => {
    const embed = normalizeVideoEmbedUrl(node.getAttribute("src"));

    if (!embed) {
      return;
    }

    const replacementTarget = getVideoMigrationTarget(node);
    const fragment = document.createElement("template");
    fragment.innerHTML = buildVideoEmbedMarkup(embed).html.trim();
    replacementTarget.replaceWith(...fragment.content.childNodes);
  });
}

function normalizeVideoEmbedBlock(block) {
  const iframe = block.querySelector("iframe");
  const placeholder = block.querySelector(".resource-placeholder");
  const embed = normalizeVideoEmbedUrl(block.dataset.src || iframe?.getAttribute("src"));

  if (!embed) {
    block.classList.add("missing");

    if (iframe) {
      iframe.remove();
    }

    if (placeholder) {
      placeholder.hidden = false;
      placeholder.textContent = "暂不支持该视频嵌入来源";
    }

    return;
  }

  block.classList.remove("missing");
  block.dataset.provider = embed.provider;
  block.dataset.src = embed.src;
  block.dataset.sourceUrl = embed.sourceUrl || embed.src;

  if (iframe) {
    configureVideoIframe(iframe, embed);
  }

  if (placeholder) {
    placeholder.hidden = true;
    placeholder.textContent = "";
  }
}

function normalizeSpecialBlockLayout() {
  [...refs.editor.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && isEmptyText(node.textContent)) {
      node.remove();
    }
  });

  refs.editor.querySelectorAll(".image-node figcaption").forEach((caption) => {
    caption.remove();
  });

  [...refs.editor.children].forEach((node) => {
    ensureNodeId(node, node.dataset.kind || node.tagName.toLowerCase());

    if (isSpecialBlock(node)) {
      node.setAttribute("contenteditable", "false");
      node.tabIndex = -1;
    }

    if (isGapParagraph(node)) {
      markAsGap(node);
    }
  });

  let cursor = refs.editor.firstElementChild;

  while (cursor) {
    const next = cursor.nextElementSibling;

    if (isSpecialBlock(cursor)) {
      if (!next) {
        refs.editor.append(createGapElement());
      } else if (isSpecialBlock(next)) {
        next.before(createGapElement());
      } else if (next.tagName === "P" && !paragraphHasContent(next)) {
        markAsGap(next);
      }
    }

    cursor = cursor.nextElementSibling;
  }

  let previousEmptyGap = null;

  [...refs.editor.children].forEach((node) => {
    if (!isGapParagraph(node)) {
      previousEmptyGap = null;
      return;
    }

    if (paragraphHasContent(node)) {
      unmarkGap(node);
      previousEmptyGap = null;
      return;
    }

    const prev = node.previousElementSibling;
    const next = node.nextElementSibling;
    const shouldKeep = isSpecialBlock(prev) || isSpecialBlock(next);

    if (!shouldKeep) {
      node.remove();
      return;
    }

    node.innerHTML = "<br>";

    if (previousEmptyGap) {
      node.remove();
      return;
    }

    previousEmptyGap = node;
  });
}

function renderCodeBlock(block, desiredCaretOffset = null) {
  const codeElement = block.querySelector(".code-block-editor");
  const languageSelect = block.querySelector(".code-language-select");

  if (!codeElement || !languageSelect) {
    return;
  }

  const rawText = getEditablePlainText(codeElement);
  const language = languageSelect.value || block.dataset.language || "auto";
  block.dataset.language = language;
  codeElement.classList.add("hljs");

  if (!rawText) {
    codeElement.textContent = "";

    if (desiredCaretOffset !== null) {
      setSelectionTextOffset(codeElement, 0);
    }

    return;
  }

  const highlighted = api.highlightCode({ code: rawText, language });
  codeElement.innerHTML = highlighted.html;

  if (desiredCaretOffset !== null) {
    setSelectionTextOffset(codeElement, desiredCaretOffset);
  }
}

function clearPendingCodeBlockRender(blockOrEditor) {
  const block =
    blockOrEditor?.closest?.(".code-block-node") ||
    (blockOrEditor?.matches?.(".code-block-node") ? blockOrEditor : null);
  const nodeId = block?.dataset?.nodeId;

  if (!nodeId) {
    return;
  }

  const timerId = state.codeBlockRenderTimers.get(nodeId);

  if (!timerId) {
    return;
  }

  window.clearTimeout(timerId);
  state.codeBlockRenderTimers.delete(nodeId);
}

function scheduleCodeBlockRender(codeEditor, { immediate = false, desiredCaretOffset = null } = {}) {
  const block = codeEditor?.closest?.(".code-block-node");

  if (!block || !refs.editor.contains(block)) {
    return;
  }

  ensureNodeId(block, "code");
  clearPendingCodeBlockRender(block);

  const run = () => {
    state.codeBlockRenderTimers.delete(block.dataset.nodeId);

    if (!refs.editor.contains(block)) {
      return;
    }

    const liveEditor = block.querySelector(".code-block-editor");
    const liveCaretOffset =
      desiredCaretOffset !== null
        ? desiredCaretOffset
        : document.activeElement === liveEditor
          ? getSelectionTextOffset(liveEditor)
          : null;

    renderCodeBlock(block, liveCaretOffset);

    if (document.activeElement === liveEditor) {
      saveSelection();
    }
  };

  if (immediate) {
    run();
    return;
  }

  const timerId = window.setTimeout(run, CODE_BLOCK_RENDER_DELAY);
  state.codeBlockRenderTimers.set(block.dataset.nodeId, timerId);
}

function setPlainCodeBlockContent(codeEditor, desiredCaretOffset = null) {
  if (!codeEditor) {
    return;
  }

  const rawText = getEditablePlainText(codeEditor);
  codeEditor.textContent = rawText;
  codeEditor.classList.add("hljs");

  if (desiredCaretOffset !== null) {
    setSelectionTextOffset(codeEditor, desiredCaretOffset);
  }
}

function setCopyButtonFeedback(button, label, tone = "") {
  if (!button) {
    return;
  }

  const previousTimerId = Number(button.dataset.resetTimerId || 0);

  if (previousTimerId) {
    window.clearTimeout(previousTimerId);
  }

  button.textContent = label;

  if (tone) {
    button.dataset.state = tone;
  } else {
    delete button.dataset.state;
  }

  const timerId = window.setTimeout(() => {
    button.textContent = "Copy";
    delete button.dataset.state;
    delete button.dataset.resetTimerId;
  }, CODE_COPY_FEEDBACK_DELAY);

  button.dataset.resetTimerId = String(timerId);
}

async function copyCodeBlock(button) {
  const block = button?.closest(".code-block-node");
  const codeEditor = block?.querySelector(".code-block-editor");

  if (!block || !codeEditor) {
    return;
  }

  const codeText = getEditablePlainText(codeEditor);

  await copyAnyCodeText(button, codeText);
}

async function copyAnyCodeText(button, codeText) {
  const normalizedCode = normalizeCodeText(codeText);

  if (!normalizedCode) {
    setCopyButtonFeedback(button, "Empty", "idle");
    showToast("Code block is empty", "error", 1800);
    return;
  }

  if (typeof api.copyText === "function") {
    api.copyText(normalizedCode);
  } else if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(normalizedCode);
  } else {
    throw new Error("Clipboard write is not supported in this environment.");
  }

  setCopyButtonFeedback(button, "Copied", "success");
  showToast("Code copied to clipboard", "success", 1800);
}

async function copyPreviewCode(button) {
  const codeElement = button?.closest(".preview-markdown-code-wrap")?.querySelector(".preview-markdown-code code");

  if (!codeElement) {
    return;
  }

  await copyAnyCodeText(button, codeElement.textContent || "");
}

function syncCodeBlockEditor(codeEditor, { history = "schedule", immediate = false } = {}) {
  if (!codeEditor) {
    return;
  }

  const caretOffset = getSelectionTextOffset(codeEditor);
  setPlainCodeBlockContent(codeEditor, caretOffset);
  scheduleCodeBlockRender(codeEditor, { immediate, desiredCaretOffset: caretOffset });
  saveSelection();
  queueEditorMutation({ history });
}

function insertResourceFiles(files, markupBuilder) {
  if (!files.length) {
    return false;
  }

  clearSpecialSelection();
  collapseTransientGaps();
  restoreSelection();

  files.forEach((file) => {
    insertHtmlAtSelection(markupBuilder(file));
  });

  return true;
}

async function finalizeEmbeddedResourceInsertion() {
  normalizeEditor();
  await refreshEmbeddedResources();
  queueEditorMutation({ history: "capture" });
}

function normalizeEditor({ codeRenderMode = "sync" } = {}) {
  migrateLegacyCodeBlocks();
  migrateLegacyVideoEmbeds();
  normalizeInlineLinks();
  normalizeSpecialBlockLayout();

  refs.editor.querySelectorAll(SPECIAL_BLOCK_SELECTOR).forEach((node) => {
    node.setAttribute("contenteditable", "false");
  });

  refs.editor.querySelectorAll(".video-embed-node").forEach((block) => {
    normalizeVideoEmbedBlock(block);
  });

  refs.editor.querySelectorAll(".code-block-node").forEach((block) => {
    const codeElement = block.querySelector(".code-block-editor");
    const languageSelect = block.querySelector(".code-language-select");

    if (codeElement) {
      codeElement.setAttribute("contenteditable", "true");
      codeElement.setAttribute("spellcheck", "false");
    }

    if (languageSelect && !languageSelect.value) {
      languageSelect.value = block.dataset.language || "auto";
    }

    if (codeRenderMode === "defer" && codeElement) {
      setPlainCodeBlockContent(codeElement);
      scheduleCodeBlockRender(codeElement);
    } else {
      renderCodeBlock(block);
    }
  });

  if (!refs.editor.innerHTML.trim()) {
    refs.editor.innerHTML = "<p><br></p>";
  }

  ensureDocumentOutlineAnchors();
}

function clearSpecialSelection() {
  refs.editor.querySelectorAll(".is-selected-block").forEach((node) => {
    node.classList.remove("is-selected-block");
  });

  state.selectedSpecialNodeId = null;
}

function getSelectedSpecialBlock() {
  if (!state.selectedSpecialNodeId) {
    return null;
  }

  return refs.editor.querySelector(`[data-node-id="${state.selectedSpecialNodeId}"]`);
}

function selectSpecialBlock(block) {
  ensureNodeId(block, block.dataset.kind || "block");
  clearSpecialSelection();
  collapseTransientGaps();
  block.classList.add("is-selected-block");
  state.selectedSpecialNodeId = block.dataset.nodeId;
  hideSelectionBubble();
  hideBlockHandle();
}

function serializeDocument() {
  const clone = refs.editor.cloneNode(true);
  sanitizeEditorNodeTree(clone);

  normalizeInlineLinks(clone);

  clone.querySelectorAll(".is-selected-block").forEach((node) => {
    node.classList.remove("is-selected-block");
  });

  clone.querySelectorAll(".image-node img").forEach((image) => {
    image.removeAttribute("src");
  });

  clone.querySelectorAll(".image-node figcaption").forEach((caption) => {
    caption.remove();
  });

  clone.querySelectorAll(".resource-placeholder").forEach((placeholder) => {
    placeholder.hidden = true;
    placeholder.textContent = "";
  });

  clone.querySelectorAll("h1, h2, h3").forEach((heading) => {
    heading.removeAttribute("data-outline-id");
    heading.removeAttribute("id");
  });

  clone.querySelectorAll("p.editor-gap").forEach((gap) => {
    gap.removeAttribute("data-gap-active");

    if (!paragraphHasContent(gap)) {
      gap.innerHTML = "<br>";
    }
  });

  clone.querySelectorAll(".code-block-node .code-block-editor").forEach((codeElement) => {
    codeElement.textContent = getEditablePlainText(codeElement);
  });

  clone.querySelectorAll(".video-embed-node").forEach((block) => {
    normalizeVideoEmbedBlock(block);
  });

  return clone.innerHTML;
}

function getHistoryStorageKey() {
  return state.currentDocument ? `flowdoc-history:${state.currentDocument.filePath}` : null;
}

function persistHistoryState() {
  const key = getHistoryStorageKey();

  if (!key) {
    return;
  }

  try {
    const entries = state.history.entries.slice(-HISTORY_PERSIST_LIMIT);
    const indexOffset = Math.max(0, state.history.entries.length - entries.length);
    const payload = {
      version: 1,
      index: Math.max(0, state.history.index - indexOffset),
      entries,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function initializeHistoryState(currentHtml) {
  const fallbackEntry = {
    html: currentHtml,
    bookmark: createEndSelectionBookmark(),
  };

  let entries = [fallbackEntry];

  try {
    const raw = localStorage.getItem(getHistoryStorageKey());

    if (raw) {
      const payload = JSON.parse(raw);
      const persistedEntries = Array.isArray(payload?.entries)
        ? payload.entries.filter(
            (entry) => entry && typeof entry.html === "string" && typeof entry.bookmark === "object",
          )
        : [];

      if (persistedEntries.length > 0) {
        entries = persistedEntries.slice(-HISTORY_LIMIT).map((entry) => ({
          ...entry,
          html: sanitizeEditorMarkup(entry.html),
        }));
      }
    }
  } catch {
    entries = [fallbackEntry];
  }

  const latestEntry = entries[entries.length - 1];

  if (!latestEntry || latestEntry.html !== currentHtml) {
    entries.push(fallbackEntry);
  }

  if (entries.length > HISTORY_LIMIT) {
    entries = entries.slice(-HISTORY_LIMIT);
  }

  state.history = {
    entries,
    index: entries.length - 1,
    isRestoring: false,
  };

  persistHistoryState();
}

function createHistoryEntry(html = serializeDocument()) {
  return {
    html,
    bookmark: createSelectionBookmark() || state.savedSelection || createEndSelectionBookmark(),
  };
}

function captureHistoryNow({ force = false } = {}) {
  if (!state.currentDocument || state.history.isRestoring) {
    return false;
  }

  const entry = createHistoryEntry();
  const current = state.history.entries[state.history.index];

  if (!force && current && current.html === entry.html) {
    current.bookmark = entry.bookmark;
    persistHistoryState();
    return false;
  }

  state.history.entries = state.history.entries.slice(0, state.history.index + 1);
  state.history.entries.push(entry);

  if (state.history.entries.length > HISTORY_LIMIT) {
    const overflow = state.history.entries.length - HISTORY_LIMIT;
    state.history.entries.splice(0, overflow);
  }

  state.history.index = state.history.entries.length - 1;
  persistHistoryState();
  return true;
}

function scheduleHistoryCapture() {
  window.clearTimeout(state.historyTimer);
  state.historyTimer = window.setTimeout(() => {
    captureHistoryNow();
  }, HISTORY_INPUT_DELAY);
}

function flushPendingHistoryCapture() {
  window.clearTimeout(state.historyTimer);
  captureHistoryNow();
}

async function restoreHistoryEntry(index) {
  if (index < 0 || index >= state.history.entries.length) {
    return false;
  }

  state.codeBlockRenderTimers.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  state.codeBlockRenderTimers.clear();
  clearSpecialSelection();
  collapseTransientGaps();
  state.history.isRestoring = true;

  const entry = state.history.entries[index];
  entry.html = sanitizeEditorMarkup(entry.html || "<p><br></p>");
  refs.editor.innerHTML = entry.html || "<p><br></p>";
  normalizeEditor({ codeRenderMode: "defer" });
  const titleNode = ensureDocumentTitleHeading(getBlockText(getPrimaryTitleNode()) || state.currentDocument?.title);
  scheduleEmbeddedResourceRefresh();

  state.history.index = index;
  state.history.isRestoring = false;

  if (!applySelectionBookmark(entry.bookmark)) {
    placeCaretInside(refs.editor.lastElementChild || refs.editor, { start: false });
  }

  if (titleNode) {
    const liveTitle = normalizeDocumentTitle(getBlockText(titleNode));
    updateDocumentTitlePreview(liveTitle);
  }

  saveSelection();
  scheduleDocumentTitleSync();
  queueEditorMutation({ history: "none" });
  persistHistoryState();
  return true;
}

async function undoHistory() {
  window.clearTimeout(state.saveTimer);
  flushPendingHistoryCapture();

  if (state.history.index <= 0) {
    showToast("已经是最早的版本了", "error", 1600);
    return;
  }

  await restoreHistoryEntry(state.history.index - 1);
  setStatus("已撤销", "success");
}

async function redoHistory() {
  window.clearTimeout(state.saveTimer);
  flushPendingHistoryCapture();

  if (state.history.index >= state.history.entries.length - 1) {
    showToast("已经是最新的版本了", "error", 1600);
    return;
  }

  await restoreHistoryEntry(state.history.index + 1);
  setStatus("已重做", "success");
}

async function saveDocument(reason = "自动保存完成", tone = "success", options = {}) {
  if (!state.currentDocument) {
    return false;
  }

  const forceSave = options.force === true;
  const syncPath = options.syncPath === true;
  const syncTitle = options.syncTitle === true;
  const skipCleanup = options.skipCleanup !== false;

  if (syncPath) {
    await refreshDocumentPathFromDisk();
  }

  if (syncTitle) {
    await flushDocumentTitleSync();
  }

  const html = serializeDocument();
  const tags = normalizeTagList(state.currentDocument.tags);
  const tagsChanged = JSON.stringify(tags) !== JSON.stringify(state.lastSavedTags);

  if (!forceSave && html === state.lastSavedHtml && !tagsChanged) {
    return false;
  }

  await api.saveDocument({
    filePath: state.currentDocument.filePath,
    html,
    tags,
    skipCleanup,
  });

  state.lastSavedHtml = html;
  state.lastSavedTags = tags;
  setStatus(reason, tone);

  if (options.toast) {
    showToast(reason, tone);
  }

  return true;
}

async function exportCurrentDocumentAsPdf() {
  if (!state.currentDocument) {
    return;
  }

  setStatus("正在准备导出 PDF...");
  await saveDocument("文档已保存", "success", {
    force: true,
    syncPath: true,
    syncTitle: true,
    skipCleanup: false,
  });
  const html = serializeDocument();
  const result = await api.exportPdf({
    filePath: state.currentDocument.filePath,
    title: state.currentDocument.title,
    html,
    fontOptions: {
      documentStyle: getDocumentFontStyle(state.fonts.documentStyle).id,
      codeStyle: getCodeFontStyle(state.fonts.codeStyle).id,
    },
  });

  if (result.canceled) {
    setStatus("已取消导出 PDF");
    return;
  }

  setStatus("PDF 导出完成", "success");
  showToast(`PDF 已导出到 ${result.savedPath}`, "success", 2200);
}

function scheduleAutosave() {
  if (!state.currentDocument) {
    return;
  }

  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    saveDocument("自动保存完成", "success", { skipCleanup: true }).catch((error) => {
      const message = `自动保存失败：${error.message}`;
      setStatus(message, "error");
      showToast(message, "error", 3200);
    });
  }, AUTOSAVE_DELAY);
}

async function refreshImageNode(node) {
  const relativePath = node.dataset.src;
  const placeholder = node.querySelector(".resource-placeholder");
  const image = node.querySelector("img");

  if (!relativePath || !state.currentDocument) {
    return;
  }

  const resolved = await api.resolveResource({
    docPath: state.currentDocument.filePath,
    relativePath,
  });

  if (resolved.exists) {
    node.classList.remove("missing");
    placeholder.hidden = true;
    image.hidden = false;
    image.src = resolved.fileUrl;
    image.alt = node.dataset.name || resolved.name;
    return;
  }

  node.classList.add("missing");
  image.hidden = true;
  image.removeAttribute("src");
  placeholder.hidden = false;
  placeholder.textContent = `图片资源缺失：${relativePath}`;
}

async function refreshAttachmentNode(node) {
  const relativePath = node.dataset.src;
  const placeholder = node.querySelector(".resource-placeholder");
  const buttons = node.querySelectorAll("[data-action='download-attachment'], [data-action='preview-attachment']");
  const previewButton = node.querySelector("[data-action='preview-attachment']");
  const previewKind = getAttachmentPreviewKind(node.dataset.name || relativePath);

  if (!relativePath || !state.currentDocument) {
    return;
  }

  if (previewButton) {
    previewButton.classList.toggle("hidden", !previewKind);
    previewButton.disabled = !previewKind;
  }

  const resolved = await api.resolveResource({
    docPath: state.currentDocument.filePath,
    relativePath,
  });

  if (resolved.exists) {
    node.classList.remove("missing");
    placeholder.hidden = true;
    buttons.forEach((button) => {
      button.disabled = false;
    });
    if (previewButton && !previewKind) {
      previewButton.disabled = true;
    }
    return;
  }

  node.classList.add("missing");
  placeholder.hidden = false;
  placeholder.textContent = `附件资源缺失：${relativePath}`;
  buttons.forEach((button) => {
    button.disabled = true;
  });
}

async function refreshEmbeddedResources() {
  const imageNodes = [...refs.editor.querySelectorAll(".image-node")];
  const attachmentNodes = [...refs.editor.querySelectorAll(".attachment-node")];

  await Promise.all([
    ...imageNodes.map((node) => refreshImageNode(node)),
    ...attachmentNodes.map((node) => refreshAttachmentNode(node)),
  ]);
}

function scheduleEmbeddedResourceRefresh() {
  const refreshToken = ++state.resourceRefreshToken;
  window.clearTimeout(state.resourceRefreshTimer);

  state.resourceRefreshTimer = window.setTimeout(() => {
    state.resourceRefreshTimer = null;
    refreshEmbeddedResources()
      .then(() => {
        if (refreshToken === state.resourceRefreshToken) {
          scheduleUiRefresh();
        }
      })
      .catch((error) => {
        if (refreshToken === state.resourceRefreshToken) {
          reportError("刷新文档资源失败", error);
        }
      });
  }, 0);
}

async function loadDocumentLibrary() {
  const result = await api.loadDocumentLibrary();
  applyLibraryIndexResult(result);
  reconcileLibraryFilters();
  renderLibraryView();
}

async function chooseDocumentLibraryRoot() {
  const result = await api.chooseDocumentLibraryRoot();

  if (result?.canceled) {
    return false;
  }

  applyLibraryIndexResult(result?.library || {});
  reconcileLibraryFilters();
  renderLibraryView();
  return true;
}

async function resetDocumentLibraryRoot() {
  const result = await api.resetDocumentLibraryRoot();

  if (result?.canceled) {
    return false;
  }

  applyLibraryIndexResult(result?.library || {});
  reconcileLibraryFilters();
  renderLibraryView();
  return true;
}

async function openLibraryDocument(filePath) {
  const documentPayload = await api.openDocumentAtPath(filePath);
  await mountDocument(documentPayload, "文档已打开");
}

async function openDocumentFromSystemRequest(filePath) {
  if (!filePath) {
    return false;
  }

  const documentPayload = await api.openDocumentAtPath(filePath);
  await mountDocument(documentPayload, "已从系统打开文档");
  return true;
}

async function persistCurrentDocumentTags() {
  if (!state.currentDocument) {
    return false;
  }

  state.currentDocument.tags = normalizeTagList(state.currentDocument.tags);
  renderCurrentDocumentTags();
  await saveDocument("标签已更新", "success", { force: true, toast: true, skipCleanup: true });
  await loadDocumentLibrary();
  return true;
}

function addTagsFromInput() {
  if (!state.currentDocument) {
    return false;
  }

  const incoming = normalizeTagList(refs.tagInput.value);

  if (!incoming.length) {
    return false;
  }

  state.currentDocument.tags = normalizeTagList([...(state.currentDocument.tags || []), ...incoming]);
  refs.tagInput.value = "";
  renderCurrentDocumentTags();
  persistCurrentDocumentTags().catch((error) => {
    reportError("更新标签失败", error);
  });
  return true;
}

function resetDocumentUi() {
  window.clearTimeout(state.saveTimer);
  window.clearTimeout(state.historyTimer);
  window.clearTimeout(state.titleSyncTimer);
  window.cancelAnimationFrame(state.uiFrame);
  state.codeBlockRenderTimers.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  state.codeBlockRenderTimers.clear();
  window.clearTimeout(state.resourceRefreshTimer);
  state.resourceRefreshToken += 1;
  state.titleSyncPromise = null;
  state.savedSelection = null;
  closeAttachmentPreview();
  hideImageContextMenu();
  clearSpecialSelection();
  hideSelectionBubble();
  hideBlockHandle();
}

async function mountDocument(documentPayload, successMessage) {
  const rawLoadedHtml = documentPayload.html || "<h1>未命名文档</h1><p><br></p>";
  const loadedHtml = sanitizeEditorMarkup(rawLoadedHtml) || "<p><br></p>";
  const documentTitle = documentPayload.title || getDocumentTitleFromPath(documentPayload.filePath);
  const documentTags = normalizeTagList(documentPayload.tags);

  updateDocumentMeta(documentPayload.filePath, documentTitle, documentTags);
  refs.emptyState.classList.add("hidden");
  refs.editorSurface.classList.remove("hidden");
  refs.editor.innerHTML = loadedHtml;

  resetDocumentUi();
  normalizeEditor();
  ensureDocumentTitleHeading(state.currentDocument.title);
  renderDocumentOutline();
  await refreshEmbeddedResources();
  state.library.recentDocuments = recordRecentDocument(documentPayload.filePath);

  const serializedHtml = serializeDocument();
  const normalizedDocumentChanged = serializedHtml !== rawLoadedHtml;
  state.lastSavedHtml = normalizedDocumentChanged ? rawLoadedHtml : serializedHtml;
  state.lastSavedTags = documentTags;
  initializeHistoryState(serializedHtml);
  updateAvailability();
  setStatus(successMessage, "success");
  showToast(successMessage, "success", 1800);

  placeCaretInside(refs.editor.lastElementChild || refs.editor, { start: false });
  saveSelection();
  scheduleUiRefresh();

  if (normalizedDocumentChanged) {
    scheduleAutosave();
  }

  loadDocumentLibrary().catch((error) => {
    reportError("刷新文档库失败", error);
  });
}

function getActiveBlock(range = getSelectionRange()) {
  if (!range || !isRangeInsideEditor(range)) {
    return null;
  }

  const codeEditor = nodeToElement(range.startContainer)?.closest(".code-block-editor");

  if (codeEditor) {
    return codeEditor.closest(".code-block-node");
  }

  return getTopLevelNode(range.startContainer) || refs.editor.lastElementChild || null;
}

function copyRect(rect, overrides = {}) {
  if (!rect) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    ...overrides,
  };
}

function getRectFromRange(range) {
  if (!range) {
    return null;
  }

  const rects = [...range.getClientRects()].filter((rect) => rect.width || rect.height);

  if (rects.length) {
    return copyRect(rects[rects.length - 1]);
  }

  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? copyRect(rect) : null;
}

function getLineHeight(element) {
  const target = nodeToElement(element);

  if (!target) {
    return 26;
  }

  const computed = window.getComputedStyle(target);
  const explicitLineHeight = Number.parseFloat(computed.lineHeight);

  if (Number.isFinite(explicitLineHeight)) {
    return explicitLineHeight;
  }

  const fontSize = Number.parseFloat(computed.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.6 : 26;
}

function createVirtualCaretRect(left, top, height) {
  return {
    left,
    top,
    right: left,
    bottom: top + height,
    width: 0,
    height,
  };
}

function getElementStartCaretRect(element) {
  const target = nodeToElement(element);

  if (!target) {
    return null;
  }

  const rect = target.getBoundingClientRect();

  if (!rect.width && !rect.height) {
    return null;
  }

  const computed = window.getComputedStyle(target);
  const lineHeight = getLineHeight(target);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
  const effectiveHeight = rect.height || lineHeight;

  return createVirtualCaretRect(
    rect.left + paddingLeft + borderLeft,
    rect.top + Math.max(0, (effectiveHeight - lineHeight) / 2),
    lineHeight,
  );
}

function getTextCaretRect(textNode, offset) {
  const textContent = textNode.textContent || "";

  if (!textContent.length) {
    return null;
  }

  const measureRange = document.createRange();

  if (offset < textContent.length) {
    measureRange.setStart(textNode, offset);
    measureRange.setEnd(textNode, offset + 1);
    const rect = getRectFromRange(measureRange);

    if (rect) {
      return createVirtualCaretRect(rect.left, rect.top, rect.height || getLineHeight(textNode.parentElement));
    }
  }

  if (offset > 0) {
    measureRange.setStart(textNode, offset - 1);
    measureRange.setEnd(textNode, offset);
    const rect = getRectFromRange(measureRange);

    if (rect) {
      return createVirtualCaretRect(rect.right, rect.top, rect.height || getLineHeight(textNode.parentElement));
    }
  }

  return null;
}

function getNodeEdgeCaretRect(node, edge = "before") {
  if (!node) {
    return null;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length || 0;
    return getTextCaretRect(node, edge === "before" ? 0 : length);
  }

  const element = nodeToElement(node);
  const rect = element?.getBoundingClientRect();

  if (!rect || (!rect.width && !rect.height)) {
    return null;
  }

  return createVirtualCaretRect(
    edge === "before" ? rect.left : rect.right,
    rect.top,
    rect.height || getLineHeight(element),
  );
}

function getElementCaretRect(container, offset) {
  if (container === refs.editor) {
    return getElementStartCaretRect(getActiveBlock()) || getElementStartCaretRect(refs.editor);
  }

  const afterNode = container.childNodes[offset] || null;
  const beforeNode = offset > 0 ? container.childNodes[offset - 1] : null;

  return (
    getNodeEdgeCaretRect(afterNode, "before") ||
    getNodeEdgeCaretRect(beforeNode, "after") ||
    getElementStartCaretRect(container)
  );
}

function measureCaretRectWithMarker(range) {
  if (!range?.collapsed || !isRangeInsideEditor(range)) {
    return null;
  }

  const selection = getSelection();
  const preservedRange = range.cloneRange();
  const markerRange = range.cloneRange();
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  marker.setAttribute("aria-hidden", "true");
  marker.style.display = "inline-block";
  marker.style.width = "0";
  marker.style.padding = "0";
  marker.style.margin = "0";
  marker.style.border = "0";
  marker.style.overflow = "hidden";
  marker.style.pointerEvents = "none";
  marker.style.userSelect = "none";
  marker.style.lineHeight = "1";

  markerRange.collapse(true);
  markerRange.insertNode(marker);

  const rect = marker.getBoundingClientRect();
  const markerParent = nodeToElement(marker.parentNode) || getActiveBlock(range) || refs.editor;

  marker.remove();
  markerParent.normalize?.();

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(preservedRange);
  }

  if (!rect.width && !rect.height) {
    return null;
  }

  return createVirtualCaretRect(rect.left, rect.top, rect.height || getLineHeight(markerParent));
}

function getCaretRect(range) {
  const markerRect = measureCaretRectWithMarker(range);

  if (markerRect) {
    return markerRect;
  }

  const directRect = getRectFromRange(range);

  if (directRect) {
    return directRect;
  }

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    return (
      getTextCaretRect(range.startContainer, range.startOffset) ||
      getElementStartCaretRect(range.startContainer.parentElement) ||
      getElementStartCaretRect(getActiveBlock(range))
    );
  }

  if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    return (
      getElementCaretRect(range.startContainer, range.startOffset) ||
      getElementStartCaretRect(getActiveBlock(range))
    );
  }

  return getElementStartCaretRect(getActiveBlock(range));
}

function toOverlayRect(rect) {
  if (!rect || !refs.editorSurface) {
    return null;
  }

  const surfaceRect = refs.editorSurface.getBoundingClientRect();
  const offsetLeft = surfaceRect.left + refs.editorSurface.clientLeft;
  const offsetTop = surfaceRect.top + refs.editorSurface.clientTop;

  return {
    left: rect.left - offsetLeft,
    top: rect.top - offsetTop,
    right: rect.right - offsetLeft,
    bottom: rect.bottom - offsetTop,
    width: rect.width,
    height: rect.height,
  };
}

function clampOverlayLeft(left, width, padding = 12) {
  if (!refs.editorSurface) {
    return left;
  }

  const maxLeft = Math.max(padding, refs.editorSurface.clientWidth - width - padding);
  return Math.min(maxLeft, Math.max(padding, left));
}

function positionSelectionBubble(range) {
  const viewportRect = range.getBoundingClientRect();

  if (!viewportRect.width && !viewportRect.height) {
    hideSelectionBubble();
    return;
  }

  const rect = toOverlayRect(viewportRect);

  if (!rect) {
    hideSelectionBubble();
    return;
  }

  refs.selectionBubble.classList.remove("hidden");
  const bubbleWidth = refs.selectionBubble.offsetWidth || 360;
  const bubbleCenter = rect.left + rect.width / 2;
  const minCenter = bubbleWidth / 2 + 12;
  const maxCenter = Math.max(minCenter, refs.editorSurface.clientWidth - bubbleWidth / 2 - 12);
  const clampedCenter = Math.min(maxCenter, Math.max(minCenter, bubbleCenter));
  refs.selectionBubble.style.left = `${Math.round(clampedCenter)}px`;
  refs.selectionBubble.style.top = `${Math.max(16, Math.round(rect.top - 14))}px`;
}

function positionBlockHandle(range) {
  const caretRect = getCaretRect(range);

  if (!caretRect) {
    hideBlockHandle();
    return;
  }

  const rect = toOverlayRect(caretRect);

  if (!rect) {
    hideBlockHandle();
    return;
  }

  const resolvedLeft = clampOverlayLeft(
    Math.round(rect.left + rect.width / 2 - BLOCK_HANDLE_WIDTH / 2),
    BLOCK_HANDLE_WIDTH,
  );
  refs.blockHandle.dataset.menuDirection = resolvedLeft < 196 ? "right" : "left";
  refs.blockHandle.style.left = `${resolvedLeft}px`;
  refs.blockHandle.style.top = `${Math.max(12, Math.round(rect.top - BLOCK_HANDLE_HEIGHT - 8))}px`;
  refs.blockHandle.classList.remove("hidden");
}

function refreshFloatingControls() {
  if (!state.currentDocument || state.isPointerSelecting || getSelectedSpecialBlock()) {
    hideSelectionBubble();
    hideBlockHandle();
    return;
  }

  const range = getSelectionRange();

  if (!range || !isRangeInsideEditor(range)) {
    hideSelectionBubble();
    hideBlockHandle();
    return;
  }

  const selection = getSelection();

  if (!selection.isCollapsed && !isRangeInsideCodeEditor(range)) {
    positionSelectionBubble(range);
    hideBlockHandle();
    return;
  }

  hideSelectionBubble();
  positionBlockHandle(range);
}

function rememberSelectionIfNeeded() {
  if (state.isExternalControlInteracting || isChoiceMenuOpen()) {
    scheduleUiRefresh();
    return;
  }

  const range = getSelectionRange();
  const currentGap = nodeToElement(range?.startContainer)?.closest("p.editor-gap");

  if (!state.isPointerSelecting) {
    collapseTransientGaps(currentGap || null);
  }

  syncSelectAllScope();

  if (range && isRangeInsideEditor(range)) {
    clearSpecialSelection();
    saveSelection();
  }

  updateDocumentOutlineActiveState();
  scheduleUiRefresh();
}

function applyBlock(tagName) {
  restoreSelection();
  document.execCommand("formatBlock", false, `<${tagName}>`);
  normalizeEditor();
  saveSelection();
  queueEditorMutation({ history: "capture" });
}

function applyInlineCommand(command) {
  restoreSelection();
  document.execCommand(command, false);
  saveSelection();
  queueEditorMutation({ history: "capture" });
}

function applyTextColor(color) {
  const range = restoreSelection();

  if (!color || !range || range.collapsed) {
    showToast("请先选中文字", "error", 1400);
    return;
  }

  document.execCommand("styleWithCSS", false, true);
  document.execCommand("foreColor", false, color);
  document.execCommand("styleWithCSS", false, false);
  saveSelection();
  queueEditorMutation({ history: "capture" });
}

function applyInlineCode() {
  const range = restoreSelection();

  if (!range || range.collapsed) {
    showToast("请先选中文字", "error", 1400);
    return;
  }

  const selectedText = normalizeCodeText(getSelection().toString()).replace(/\s+/gu, " ").trim();

  if (!selectedText) {
    showToast("请先选中文字", "error", 1400);
    return;
  }

  insertHtmlAtSelection(`<code>${escapeHtml(selectedText)}</code>`);
  normalizeEditor();
  saveSelection();
  queueEditorMutation({ history: "capture" });
}

function insertCodeBlock(codeText = "") {
  const { nodeId, html } = buildCodeBlockMarkup(codeText);
  clearSpecialSelection();
  collapseTransientGaps();
  insertHtmlAtSelection(html);
  normalizeEditor();
  focusCodeBlockById(nodeId);
  queueEditorMutation({ history: "capture" });
}

function insertLinkMarkup(link) {
  const html = buildLinkMarkup(link);

  if (!html) {
    return false;
  }

  clearSpecialSelection();
  collapseTransientGaps();
  restoreSelection();
  insertHtmlAtSelection(html);
  normalizeInlineLinks();
  saveSelection();
  queueEditorMutation({ history: "capture" });
  return true;
}

async function insertVideoEmbeds(embeds) {
  if (!embeds.length) {
    return;
  }

  clearSpecialSelection();
  collapseTransientGaps();
  restoreSelection();

  embeds.forEach((embed) => {
    insertHtmlAtSelection(buildVideoEmbedMarkup(embed).html);
  });

  normalizeEditor();
  saveSelection();
  queueEditorMutation({ history: "capture" });
}

async function insertImageFiles(files) {
  if (!insertResourceFiles(files, buildImageMarkup)) {
    return;
  }

  await finalizeEmbeddedResourceInsertion();
}

async function insertAttachmentFiles(files) {
  if (!insertResourceFiles(files, buildAttachmentMarkup)) {
    return;
  }

  await finalizeEmbeddedResourceInsertion();
}

async function handleCreateDocument() {
  setStatus("正在选择新文档位置...");
  const result = await api.createDocument();

  if (result.canceled) {
    setStatus("已取消新建文档");
    return;
  }

  await mountDocument(result.document, "新文档已创建");
}

async function handleOpenDocument() {
  setStatus("正在打开文档...");
  const result = await api.openDocument();

  if (result.canceled) {
    setStatus("已取消打开文档");
    return;
  }

  await mountDocument(result.document, "文档已打开");
}

async function openAnchorLink(anchor) {
  const href = normalizeExternalUrl(anchor?.dataset.href || anchor?.getAttribute("href"));

  if (!href) {
    return false;
  }

  await api.openExternal(href);
  return true;
}

function closeLinkEditor({ restoreFocus = true } = {}) {
  if (!refs.linkEditorModal) {
    return;
  }

  refs.linkEditorModal.classList.add("hidden");
  refs.linkEditorModal.setAttribute("aria-hidden", "true");

  const anchor = state.linkEditorAnchor;
  state.linkEditorAnchor = null;

  if (restoreFocus && anchor?.isConnected) {
    anchor.focus?.();
  }
}

function submitLinkEditor(nextValue) {
  const anchor = state.linkEditorAnchor;

  if (!anchor || !anchor.isConnected) {
    closeLinkEditor({ restoreFocus: false });
    return false;
  }

  const nextHref = normalizeExternalUrl(nextValue);

  if (!nextHref) {
    unwrapElementPreservingChildren(anchor);
    saveSelection();
    queueEditorMutation({ history: "capture" });
    closeLinkEditor({ restoreFocus: false });
    showToast("链接已移除", "success", 1600);
    return true;
  }

  anchor.setAttribute("href", nextHref);
  anchor.dataset.href = nextHref;
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer");
  anchor.setAttribute("title", LINK_OPEN_HINT);

  if (!normalizeCodeText(anchor.textContent).trim()) {
    anchor.textContent = nextHref;
  }

  saveSelection();
  queueEditorMutation({ history: "capture" });
  closeLinkEditor({ restoreFocus: false });
  showToast("链接已更新", "success", 1600);
  return true;
}

function openLinkEditor(anchor) {
  if (!anchor || !refs.linkEditorModal || !refs.linkEditorInput) {
    return false;
  }

  state.linkEditorAnchor = anchor;
  refs.linkEditorInput.value = normalizeExternalUrl(anchor.dataset.href || anchor.getAttribute("href"));
  refs.linkEditorModal.classList.remove("hidden");
  refs.linkEditorModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    refs.linkEditorInput.focus();
    refs.linkEditorInput.select();
  }, 0);
  return true;
}

function _editAnchorLink(anchor) {
  if (!anchor) {
    return false;
  }

  const currentHref = normalizeExternalUrl(anchor.dataset.href || anchor.getAttribute("href"));
  const nextValue = window.prompt("编辑链接地址", currentHref);

  if (nextValue === null) {
    return false;
  }

  const nextHref = normalizeExternalUrl(nextValue);

  if (!nextHref) {
    unwrapElementPreservingChildren(anchor);
    saveSelection();
    queueEditorMutation({ history: "capture" });
    showToast("链接已移除", "success", 1600);
    return true;
  }

  anchor.setAttribute("href", nextHref);
  anchor.dataset.href = nextHref;
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer");
  anchor.setAttribute("title", LINK_OPEN_HINT);

  if (!normalizeCodeText(anchor.textContent).trim()) {
    anchor.textContent = nextHref;
  }

  saveSelection();
  queueEditorMutation({ history: "capture" });
  showToast("链接已更新", "success", 1600);
  return true;
}

function prepareInsertionPointFromCaret() {
  const activeBlock = getActiveBlock(restoreSelection());

  if (!activeBlock) {
    return;
  }

  if ((activeBlock.tagName === "P" || isGapParagraph(activeBlock)) && !paragraphHasContent(activeBlock)) {
    const selection = getSelection();
    const range = document.createRange();
    range.selectNode(activeBlock);
    selection.removeAllRanges();
    selection.addRange(range);
    state.savedSelection = createSelectionBookmark(range);
    return;
  }

  const selection = getSelection();
  const range = document.createRange();
  range.setStartAfter(activeBlock);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
}

async function handleInsertImages(source = "selection") {
  if (!state.currentDocument) {
    return;
  }

  if (source === "block") {
    prepareInsertionPointFromCaret();
  } else {
    saveSelection();
  }

  const result = await api.insertImages(state.currentDocument.filePath);

  if (result.canceled) {
    return;
  }

  await insertImageFiles(result.files);
  showToast(`已插入 ${result.files.length} 张图片`);
}

async function handleInsertAttachments(source = "selection") {
  if (!state.currentDocument) {
    return;
  }

  if (source === "block") {
    prepareInsertionPointFromCaret();
  } else {
    saveSelection();
  }

  const result = await api.insertAttachments(state.currentDocument.filePath);

  if (result.canceled) {
    return;
  }

  await insertAttachmentFiles(result.files);
  showToast(`已插入 ${result.files.length} 个附件`);
}

function insertPlainTextAtCursor(text) {
  const selection = getSelection();

  if (!selection.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("无法读取剪贴板图片。"));
    reader.readAsDataURL(blob);
  });
}

async function handlePaste(event) {
  if (!state.currentDocument || !event.clipboardData) {
    return;
  }

  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    event.preventDefault();
    const plainText = event.clipboardData.getData("text/plain");
    insertPlainTextAtCursor(plainText);
    syncCodeBlockEditor(codeEditor);
    return;
  }

  const items = [...event.clipboardData.items];
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  const plainText = event.clipboardData.getData("text/plain");
  const html = event.clipboardData.getData("text/html");

  if (imageItem) {
    event.preventDefault();
    saveSelection();

    const imageFile = imageItem.getAsFile();

    if (!imageFile) {
      return;
    }

    const dataUrl = await blobToDataUrl(imageFile);
    const suggestedName = imageFile.name || `pasted-image-${Date.now()}.png`;
    const saved = await api.savePastedImage({
      docPath: state.currentDocument.filePath,
      dataUrl,
      suggestedName,
    });

    await insertImageFiles([saved]);
    showToast("剪贴板图片已插入");
    return;
  }

  const videoEmbeds = getClipboardVideoEmbeds(html, plainText);

  if (videoEmbeds.length) {
    event.preventDefault();
    saveSelection();
    await insertVideoEmbeds(videoEmbeds);
    showToast(`已嵌入 ${videoEmbeds.length} 个视频`, "success", 1800);
    return;
  }

  if (html.includes("<iframe") || plainText.includes("<iframe")) {
    event.preventDefault();
    showToast("暂不支持该视频嵌入来源", "error", 1800);
    return;
  }

  const link = extractLinkFromClipboard(html, plainText);

  if (link) {
    event.preventDefault();
    saveSelection();

    if (insertLinkMarkup(link)) {
      showToast("链接已插入", "success", 1600);
    }
    return;
  }
  if (html) {
    event.preventDefault();
    saveSelection();
    const sanitizedHtml = sanitizeEditorMarkup(html);

    if (sanitizedHtml.trim()) {
      insertHtmlAtSelection(sanitizedHtml);
      normalizeEditor();
      queueEditorMutation({ history: "capture" });
      return;
    }

    if (plainText) {
      restoreSelection();
      insertPlainTextAtCursor(plainText);
      queueEditorMutation({ history: "capture" });
    }
  }
}

async function handleAttachmentDownload(button) {
  const node = button.closest(".attachment-node");

  if (!node || !state.currentDocument || node.classList.contains("missing")) {
    return;
  }

  const result = await api.downloadAttachment({
    docPath: state.currentDocument.filePath,
    relativePath: node.dataset.src,
  });

  showToast(`附件已复制到 ${result.savedPath}`, "success", 2600);
}

async function handleAttachmentPreview(button) {
  const node = button.closest(".attachment-node");

  if (!node || !state.currentDocument || node.classList.contains("missing")) {
    return;
  }

  const result = await api.previewAttachment({
    docPath: state.currentDocument.filePath,
    relativePath: node.dataset.src,
  });

  if (!result.exists) {
    showToast(`附件资源缺失：${node.dataset.src}`, "error", 2200);
    return;
  }

  if (!result.previewable) {
    showToast("当前附件暂不支持预览", "error", 2200);
    return;
  }

  openAttachmentPreview(result, node.dataset.src);
}

async function handleSaveImageAs(relativePath) {
  if (!state.currentDocument || !relativePath) {
    return;
  }

  const result = await api.saveImageAs({
    docPath: state.currentDocument.filePath,
    relativePath,
  });

  if (result.canceled) {
    return;
  }

  showToast(`图片已另存为 ${result.savedPath}`, "success", 2200);
}

async function handleOpenImage(relativePath) {
  if (!state.currentDocument || !relativePath) {
    return;
  }

  await api.openImage({
    docPath: state.currentDocument.filePath,
    relativePath,
  });
}

async function handleRevealImageInFolder(relativePath) {
  if (!state.currentDocument || !relativePath) {
    return;
  }

  await api.revealImageInFolder({
    docPath: state.currentDocument.filePath,
    relativePath,
  });
}

function reportError(prefix, error) {
  const message = `${prefix}：${error.message}`;
  setStatus(message, "error");
  showToast(message, "error", 3200);
}

function isCaretAtBoundary(container, range, boundary) {
  const comparison = range.cloneRange();
  comparison.selectNodeContents(container);

  if (boundary === "start") {
    comparison.setEnd(range.startContainer, range.startOffset);
  } else {
    comparison.setStart(range.endContainer, range.endOffset);
  }

  return comparison.toString().length === 0;
}

function findAdjacentSpecialBlock(referenceBlock, direction) {
  let current =
    direction === "backward" ? referenceBlock.previousElementSibling : referenceBlock.nextElementSibling;

  while (current && isGapParagraph(current) && !paragraphHasContent(current)) {
    current = direction === "backward" ? current.previousElementSibling : current.nextElementSibling;
  }

  return isSpecialBlock(current) ? current : null;
}

function queryNodeById(nodeId) {
  return nodeId ? refs.editor.querySelector(`[data-node-id="${nodeId}"]`) : null;
}

function removeSpecialBlock(block) {
  if (!block) {
    return;
  }

  const previousId = block.previousElementSibling?.dataset?.nodeId || null;
  const nextId = block.nextElementSibling?.dataset?.nodeId || null;

  clearSpecialSelection();

  const previous = block.previousElementSibling;
  const next = block.nextElementSibling;

  block.remove();

  if (isGapParagraph(previous) && !paragraphHasContent(previous)) {
    previous.remove();
  }

  if (isGapParagraph(next) && !paragraphHasContent(next)) {
    next.remove();
  }

  normalizeEditor();

  const nextCandidate = queryNodeById(nextId);
  const previousCandidate = queryNodeById(previousId);
  const focusCandidate = nextCandidate || previousCandidate || refs.editor.lastElementChild;

  if (focusCandidate) {
    if (isGapParagraph(focusCandidate)) {
      activateGapParagraph(focusCandidate);
    } else if (isSpecialBlock(focusCandidate)) {
      const surroundingGap =
        (isGapParagraph(focusCandidate.nextElementSibling) && focusCandidate.nextElementSibling) ||
        (isGapParagraph(focusCandidate.previousElementSibling) && focusCandidate.previousElementSibling);

      if (surroundingGap) {
        activateGapParagraph(surroundingGap);
      } else {
        placeCaretInside(focusCandidate, { start: false });
      }
    } else {
      placeCaretInside(focusCandidate, { start: true });
    }
  }

  saveSelection();
  queueEditorMutation({ history: "capture" });
}

function handleDeletionKey(event) {
  if (!state.currentDocument || !["Backspace", "Delete"].includes(event.key)) {
    return false;
  }

  const selectedSpecial = getSelectedSpecialBlock();

  if (selectedSpecial) {
    event.preventDefault();
    removeSpecialBlock(selectedSpecial);
    return true;
  }

  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    const codeBlock = codeEditor.closest(".code-block-node");
    const codeText = getEditablePlainText(codeEditor);

    if (isEmptyText(codeText)) {
      event.preventDefault();
      removeSpecialBlock(codeBlock);
      return true;
    }

    return false;
  }

  const range = getSelectionRange();

  if (!range || !range.collapsed || !isRangeInsideEditor(range)) {
    return false;
  }

  const activeBlock = getActiveBlock(range);

  if (!activeBlock) {
    return false;
  }

  if (event.key === "Backspace" && isCaretAtBoundary(activeBlock, range, "start")) {
    const previousSpecial = findAdjacentSpecialBlock(activeBlock, "backward");

    if (previousSpecial) {
      event.preventDefault();
      removeSpecialBlock(previousSpecial);
      return true;
    }
  }

  if (event.key === "Delete" && isCaretAtBoundary(activeBlock, range, "end")) {
    const nextSpecial = findAdjacentSpecialBlock(activeBlock, "forward");

    if (nextSpecial) {
      event.preventDefault();
      removeSpecialBlock(nextSpecial);
      return true;
    }
  }

  return false;
}

refs.newDocButton.addEventListener("click", () => {
  handleCreateDocument().catch((error) => {
    reportError("新建失败", error);
  });
});

refs.openDocButton.addEventListener("click", () => {
  handleOpenDocument().catch((error) => {
    reportError("打开失败", error);
  });
});

refs.saveDocButton.addEventListener("click", () => {
  saveDocument("文档已保存", "success", {
    force: true,
    toast: true,
    syncPath: true,
    syncTitle: true,
    skipCleanup: false,
  }).catch((error) => {
    reportError("保存失败", error);
  });
});

refs.exportPdfButton.addEventListener("click", () => {
  exportCurrentDocumentAsPdf().catch((error) => {
    reportError("导出 PDF 失败", error);
  });
});

refs.addTagButton.addEventListener("click", () => {
  addTagsFromInput();
});

refs.tagInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  addTagsFromInput();
});

refs.docTags.addEventListener("click", (event) => {
  const removeTarget = event.target.closest("[data-remove-tag]");

  if (!removeTarget || !state.currentDocument) {
    return;
  }

  const tag = removeTarget.dataset.removeTag || "";
  state.currentDocument.tags = normalizeTagList(
    (state.currentDocument.tags || []).filter((item) => item !== tag),
  );
  renderCurrentDocumentTags();
  persistCurrentDocumentTags().catch((error) => {
    reportError("更新标签失败", error);
  });
});

refs.docOutline.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-outline-toggle]");

  if (toggle) {
    toggleOutlineCollapse(toggle.dataset.outlineToggle || "");
    return;
  }

  const button = event.target.closest("[data-outline-target]");

  if (!button || !state.currentDocument) {
    return;
  }

  jumpToOutlineHeading(button.dataset.outlineTarget || "");
});

refs.toggleOutlineCollapseButton?.addEventListener("click", () => {
  const outlineItems = decorateDocumentOutlineItems(getDocumentOutlineItems()).filter((item) => item.hasChildren);

  if (!outlineItems.length) {
    return;
  }

  const hasCollapsed = outlineItems.some((item) => item.isCollapsed);
  syncOutlineCollapseState(hasCollapsed ? [] : outlineItems.map((item) => item.id));
});

refs.sidebarResizer.addEventListener("mousedown", (event) => {
  beginSidebarResize(event);
});

refs.sidebarResizer.addEventListener("dblclick", () => {
  resetSidebarWidth();
});

refs.sidebarResizer.addEventListener("keydown", (event) => {
  if (isCompactLayout()) {
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    applySidebarWidth(MIN_SIDEBAR_WIDTH, { persist: true });
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    applySidebarWidth(getSidebarMaxWidth(), { persist: true });
    return;
  }

  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const step = event.shiftKey ? 36 : 18;
  const direction = event.key === "ArrowRight" ? 1 : -1;
  applySidebarWidth(state.sidebarWidth + direction * step, { persist: true });
});

refs.librarySearchInput.addEventListener("input", (event) => {
  state.library.searchText = event.target.value || "";
  renderLibraryView();
});

refs.documentFontStyleButton?.addEventListener("pointerdown", prepareChoiceMenuInteraction);
refs.codeFontStyleButton?.addEventListener("pointerdown", prepareChoiceMenuInteraction);
refs.librarySortButton?.addEventListener("pointerdown", prepareChoiceMenuInteraction);
refs.chooseLibraryRootButton?.addEventListener("pointerdown", prepareChoiceMenuInteraction);
refs.resetLibraryRootButton?.addEventListener("pointerdown", prepareChoiceMenuInteraction);
refs.refreshLibraryButton?.addEventListener("pointerdown", prepareChoiceMenuInteraction);

refs.documentFontStyleButton?.addEventListener("click", () => {
  toggleChoiceMenu("document-font");
});

refs.codeFontStyleButton?.addEventListener("click", () => {
  toggleChoiceMenu("code-font");
});

refs.librarySortButton?.addEventListener("click", () => {
  toggleChoiceMenu("library-sort");
});

refs.documentFontStyleMenu?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-choice-value]");

  if (!option) {
    return;
  }

  applyChoiceMenuValue("document-font", option.dataset.choiceValue || "");
  closeChoiceMenus();
  endExternalControlInteraction();
});

refs.codeFontStyleMenu?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-choice-value]");

  if (!option) {
    return;
  }

  applyChoiceMenuValue("code-font", option.dataset.choiceValue || "");
  closeChoiceMenus();
  endExternalControlInteraction();
});

refs.librarySortMenu?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-choice-value]");

  if (!option) {
    return;
  }

  applyChoiceMenuValue("library-sort", option.dataset.choiceValue || "");
  closeChoiceMenus();
  endExternalControlInteraction();
});

refs.focusModeButton?.addEventListener("click", () => {
  toggleFocusMode();
});

refs.libraryTagFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-library-tag]");

  if (!button) {
    return;
  }

  state.library.selectedTag = button.dataset.libraryTag || "";
  renderLibraryView();
});

refs.libraryDocList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-library-doc]");

  if (!button) {
    return;
  }

  openLibraryDocument(button.dataset.openLibraryDoc).catch((error) => {
    reportError("从文档库打开失败", error);
  });
});

refs.refreshLibraryButton.addEventListener("click", () => {
  loadDocumentLibrary()
    .then(() => {
      showToast("文档库已刷新", "success", 1400);
    })
    .catch((error) => {
      reportError("刷新文档库失败", error);
    })
    .finally(() => {
      endExternalControlInteraction();
    });
});

refs.chooseLibraryRootButton?.addEventListener("click", () => {
  chooseDocumentLibraryRoot()
    .then((changed) => {
      if (!changed) {
        return;
      }

      showToast("文档库目录已更新", "success", 1600);
    })
    .catch((error) => {
      reportError("更新文档库目录失败", error);
    })
    .finally(() => {
      endExternalControlInteraction();
    });
});

refs.resetLibraryRootButton?.addEventListener("click", () => {
  resetDocumentLibraryRoot()
    .then((changed) => {
      if (!changed) {
        return;
      }

      showToast("已恢复默认文档库目录", "success", 1600);
    })
    .catch((error) => {
      reportError("恢复默认文档库目录失败", error);
    })
    .finally(() => {
      endExternalControlInteraction();
    });
});

refs.selectionBubble.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) {
    event.preventDefault();
  }
});

refs.selectionBubble.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button || !state.currentDocument) {
    return;
  }

  const command = button.dataset.command;
  const block = button.dataset.block;
  const color = button.dataset.color;
  const special = button.dataset.special;

  if (command) {
    applyInlineCommand(command);
    return;
  }

  if (block) {
    applyBlock(block);
    return;
  }

  if (color) {
    applyTextColor(color);
    return;
  }

  if (special === "inline-code") {
    applyInlineCode();
    return;
  }

  if (special === "code-block") {
    restoreSelection();
    const selectedText = getSelection().toString();
    insertCodeBlock(selectedText);
  }
});

refs.blockHandle.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) {
    event.preventDefault();
  }
});

refs.blockHandleButton.addEventListener("click", () => {
  if (!state.currentDocument) {
    return;
  }

  refs.insertMenu.classList.toggle("hidden");
});

refs.insertMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button || !state.currentDocument) {
    return;
  }

  hideInsertMenu();

  const action = button.dataset.insert;

  if (action === "image") {
    handleInsertImages("block").catch((error) => {
      reportError("插入图片失败", error);
    });
    return;
  }

  if (action === "attachment") {
    handleInsertAttachments("block").catch((error) => {
      reportError("上传附件失败", error);
    });
    return;
  }

  if (action === "code-block") {
    prepareInsertionPointFromCaret();
    insertCodeBlock();
    return;
  }

  if (action === "quote") {
    prepareInsertionPointFromCaret();
    insertHtmlAtSelection("<blockquote>引用内容</blockquote>");
    normalizeEditor();
    queueEditorMutation({ history: "capture" });
  }
});

refs.editor.addEventListener("mousedown", (event) => {
  hideImageContextMenu();
  clearSelectAllScope();

  if (event.target.closest("a.editor-link") && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    return;
  }

  const attachmentAction = event.target.closest(
    "[data-action='download-attachment'], [data-action='preview-attachment']",
  );

  if (attachmentAction) {
    return;
  }

  if (event.target.closest("[data-action='copy-code']") || event.target.closest(".code-language-select")) {
    clearSpecialSelection();
    collapseTransientGaps();
    return;
  }

  if (event.target.closest(".code-block-editor")) {
    if (event.button === 0) {
      beginPointerSelection();
    }
    clearSpecialSelection();
    collapseTransientGaps();
    return;
  }

  const codeBlockFrame = event.target.closest(".code-block-frame");

  if (codeBlockFrame) {
    const codeEditor = codeBlockFrame.querySelector(".code-block-editor");
    clearSpecialSelection();
    collapseTransientGaps();

    if (codeEditor && event.button === 0) {
      event.preventDefault();
      beginPointerSelection();
      placeCaretFromPoint(event.clientX, event.clientY, codeEditor);
    }

    return;
  }

  const gap = event.target.closest("p.editor-gap");

  if (gap) {
    event.preventDefault();
    activateGapParagraph(gap);
    return;
  }

  const specialBlock = event.target.closest(SPECIAL_BLOCK_SELECTOR);

  if (specialBlock) {
    event.preventDefault();
    selectSpecialBlock(specialBlock);
    return;
  }

  clearSpecialSelection();
  collapseTransientGaps();

  if (event.button === 0) {
    beginPointerSelection();
  }
});

refs.editor.addEventListener("contextmenu", (event) => {
  const imageNode = event.target.closest(".image-node");

  if (!imageNode || !state.currentDocument || imageNode.classList.contains("missing")) {
    hideImageContextMenu();
    return;
  }

  event.preventDefault();
  selectSpecialBlock(imageNode);
  showImageContextMenu(event, imageNode);
});

refs.editor.addEventListener("input", (event) => {
  clearSelectAllScope();

  const titleNode = event.target.closest("h1");
  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    syncCodeBlockEditor(codeEditor);
    return;
  }

  const activeGap = event.target.closest("p.editor-gap");

  if (activeGap) {
    promoteGapParagraphIfNeeded(activeGap);
  }

  clearSpecialSelection();
  saveSelection();

  if (titleNode && titleNode === getPrimaryTitleNode()) {
    const liveTitle = normalizeDocumentTitle(getBlockText(titleNode));
    updateDocumentTitlePreview(liveTitle);
    scheduleDocumentTitleSync();
  }

  queueEditorMutation();
});

refs.editor.addEventListener("paste", (event) => {
  handlePaste(event).catch((error) => {
    reportError("粘贴失败", error);
  });
});

refs.editor.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const withModifier = event.ctrlKey || event.metaKey;
  const codeEditor = event.target.closest(".code-block-editor");

  if (withModifier && key === "a") {
    if (handleSelectAllShortcut(codeEditor)) {
      event.preventDefault();
      return;
    }
  } else if (!["Control", "Meta", "Shift", "Alt"].includes(event.key)) {
    clearSelectAllScope();
  }

  if (handleDeletionKey(event)) {
    return;
  }

  if (codeEditor && event.key === "Tab") {
    event.preventDefault();
    insertPlainTextAtCursor("  ");
    syncCodeBlockEditor(codeEditor);
  }
});

refs.editor.addEventListener("click", (event) => {
  const anchor = event.target.closest("a.editor-link");

  if (anchor && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    openAnchorLink(anchor).catch((error) => {
      reportError("打开链接失败", error);
    });
    return;
  }

  const previewButton = event.target.closest("[data-action='preview-attachment']");

  if (previewButton) {
    handleAttachmentPreview(previewButton).catch((error) => {
      reportError("附件预览失败", error);
    });
    return;
  }

  const downloadButton = event.target.closest("[data-action='download-attachment']");

  if (downloadButton) {
    handleAttachmentDownload(downloadButton).catch((error) => {
      reportError("下载附件失败", error);
    });
    return;
  }

  const copyButton = event.target.closest("[data-action='copy-code']");

  if (copyButton) {
    copyCodeBlock(copyButton).catch((error) => {
      reportError("复制代码失败", error);
    });
    return;
  }

  rememberSelectionIfNeeded();
});

refs.editor.addEventListener("dblclick", (event) => {
  const anchor = event.target.closest("a.editor-link");

  if (!anchor) {
    return;
  }

  event.preventDefault();
  openLinkEditor(anchor);
});

refs.editor.addEventListener("change", (event) => {
  const languageSelect = event.target.closest(".code-language-select");

  if (!languageSelect) {
    return;
  }

  const block = languageSelect.closest(".code-block-node");
  block.dataset.language = languageSelect.value;
  renderCodeBlock(block);
  saveSelection();
  queueEditorMutation({ history: "capture" });
});

refs.editor.addEventListener("focusout", (event) => {
  const titleNode = event.target.closest("h1");
  const codeEditor = event.target.closest(".code-block-editor");

  if (titleNode && titleNode === getPrimaryTitleNode()) {
    scheduleDocumentTitleSync();
  }

  if (codeEditor) {
    scheduleCodeBlockRender(codeEditor);
  }
});

refs.editor.addEventListener("focusin", rememberSelectionIfNeeded);
refs.editor.addEventListener("mouseup", () => {
  endPointerSelection();
  rememberSelectionIfNeeded();
});
refs.editor.addEventListener("keyup", rememberSelectionIfNeeded);
document.addEventListener("selectionchange", rememberSelectionIfNeeded);

refs.attachmentPreviewClose.addEventListener("click", () => {
  closeAttachmentPreview();
});

refs.attachmentPreviewDownload.addEventListener("click", () => {
  if (!state.currentDocument || !refs.attachmentPreviewDownload.dataset.relativePath) {
    return;
  }

  api
    .downloadAttachment({
      docPath: state.currentDocument.filePath,
      relativePath: refs.attachmentPreviewDownload.dataset.relativePath,
    })
    .then((result) => {
      showToast(`附件已复制到 ${result.savedPath}`, "success", 2600);
    })
    .catch((error) => {
      reportError("下载附件失败", error);
    });
});

refs.attachmentPreviewModal.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-action='copy-preview-code']");

  if (!copyButton) {
    return;
  }

  copyPreviewCode(copyButton).catch((error) => {
    reportError("Markdown 代码复制失败", error);
  });
});

refs.linkEditorForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLinkEditor(refs.linkEditorInput.value);
});

refs.linkEditorCancel?.addEventListener("click", () => {
  closeLinkEditor();
});

refs.linkEditorRemove?.addEventListener("click", () => {
  submitLinkEditor("");
});

refs.linkEditorModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-link-editor-close]")) {
    closeLinkEditor();
  }
});

refs.imageContextMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-image-menu-action]");

  if (!button || !state.currentDocument) {
    return;
  }

  const relativePath = refs.imageContextMenu.dataset.relativePath || state.imageContextMenuPath;
  const action = button.dataset.imageMenuAction || "";
  hideImageContextMenu();

  if (action === "save-as") {
    handleSaveImageAs(relativePath).catch((error) => {
      reportError("图片另存为失败", error);
    });
    return;
  }

  if (action === "open") {
    handleOpenImage(relativePath).catch((error) => {
      reportError("打开图片失败", error);
    });
    return;
  }

  if (action === "reveal") {
    handleRevealImageInFolder(relativePath).catch((error) => {
      reportError("定位图片失败", error);
    });
  }
});

document.addEventListener("mousedown", (event) => {
  if (isChoiceMenuTarget(event.target)) {
    beginExternalControlInteraction(900);
  } else {
    closeChoiceMenus();
  }

  if (!event.target.closest("#blockHandle")) {
    hideInsertMenu();
  }

  if (!event.target.closest("#imageContextMenu")) {
    hideImageContextMenu();
  }

  if (isChoiceMenuTarget(event.target)) {
    return;
  }

  if (!event.target.closest(".editor-gap, #blockHandle, #selectionBubble")) {
    collapseTransientGaps();
  }

  if (!event.target.closest(SPECIAL_BLOCK_SELECTOR)) {
    clearSpecialSelection();
  }

  if (event.target.closest("[data-preview-close]")) {
    closeAttachmentPreview();
  }
});

document.addEventListener("mouseup", () => {
  endSidebarResize();
  endPointerSelection();

  if (!isChoiceMenuOpen()) {
    endExternalControlInteraction();
  }
});

document.addEventListener("mousemove", (event) => {
  updateSidebarResize(event);
});

window.addEventListener("resize", () => {
  applySidebarWidth(state.sidebarWidth);
  endSidebarResize();
  closeChoiceMenus();
  hideImageContextMenu();
  scheduleUiRefresh();
});
window.addEventListener(
  "scroll",
  () => {
    hideImageContextMenu();
    scheduleUiRefresh();
  },
  true,
);
window.addEventListener("focus", () => {
  hideImageContextMenu();
  refreshDocumentPathFromDisk().catch((error) => {
    reportError("文档路径同步失败", error);
  });

  loadDocumentLibrary().catch((error) => {
    reportError("刷新文档库失败", error);
  });
});

window.addEventListener("blur", () => {
  endSidebarResize();
  closeChoiceMenus();
});

api.onDocumentOpenRequested?.((payload) => {
  openDocumentFromSystemRequest(payload?.filePath).catch((error) => {
    reportError("打开系统关联文档失败", error);
  });
});

document.addEventListener("keydown", (event) => {
  if (refs.linkEditorModal && event.key === "Escape" && !refs.linkEditorModal.classList.contains("hidden")) {
    closeLinkEditor();
    return;
  }

  if (event.key === "Escape" && !refs.imageContextMenu.classList.contains("hidden")) {
    hideImageContextMenu();
    return;
  }

  if (event.key === "Escape" && !refs.attachmentPreviewModal.classList.contains("hidden")) {
    closeAttachmentPreview();
    return;
  }

  if (event.key === "Escape" && isChoiceMenuOpen()) {
    closeChoiceMenus();
    endExternalControlInteraction();
    return;
  }

  if (!state.currentDocument) {
    return;
  }

  if (["Backspace", "Delete"].includes(event.key)) {
    const selectedSpecial = getSelectedSpecialBlock();

    if (selectedSpecial) {
      event.preventDefault();
      removeSpecialBlock(selectedSpecial);
      return;
    }
  }

  const key = event.key.toLowerCase();
  const withModifier = event.ctrlKey || event.metaKey;

  if (withModifier && key === "s") {
    event.preventDefault();
    saveDocument("文档已保存", "success", {
      force: true,
      toast: true,
      syncPath: true,
      syncTitle: true,
      skipCleanup: false,
    }).catch((error) => {
      reportError("保存失败", error);
    });
    return;
  }

  if (withModifier && event.shiftKey && key === "f") {
    event.preventDefault();
    toggleFocusMode();
    return;
  }

  if (withModifier && key === "z" && !event.shiftKey) {
    event.preventDefault();
    undoHistory().catch((error) => {
      reportError("撤销失败", error);
    });
    return;
  }

  if ((withModifier && key === "y") || (withModifier && event.shiftKey && key === "z")) {
    event.preventDefault();
    redoHistory().catch((error) => {
      reportError("重做失败", error);
    });
  }
});

updateAvailability();
restoreSidebarWidth();
applyFocusMode(state.isFocusMode, { persist: false });
applyFontPreferences({ persist: false });
renderCurrentDocumentTags();
renderDocumentOutline();
renderLibraryView();
loadDocumentLibrary().catch((error) => {
  reportError("加载文档库失败", error);
});
