const SIDEBAR_WIDTH_STORAGE_KEY = "flowdoc-sidebar-width";
const FOCUS_MODE_STORAGE_KEY = "flowdoc-focus-mode";
const LIBRARY_SORT_STORAGE_KEY = "flowdoc-library-sort";
const RECENT_DOCUMENTS_STORAGE_KEY = "flowdoc-recent-documents";
const OUTLINE_COLLAPSE_STORAGE_KEY = "flowdoc-outline-collapsed";
const DOCUMENT_FONT_STYLE_STORAGE_KEY = "flowdoc-document-font-style";
const CODE_FONT_STYLE_STORAGE_KEY = "flowdoc-code-font-style";
const RECENT_DOCUMENT_LIMIT = 40;

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Ignore storage failures.
  }
}

export function loadSidebarWidth(defaultWidth) {
  const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
  const parsed = Number.parseFloat(raw || "");
  return Number.isFinite(parsed) ? parsed : defaultWidth;
}

export function saveSidebarWidth(width) {
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(Math.round(width)));
  } catch (_error) {
    // Ignore storage failures.
  }
}

export function loadFocusMode() {
  return window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === "1";
}

export function saveFocusMode(enabled) {
  try {
    window.localStorage.setItem(FOCUS_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch (_error) {
    // Ignore storage failures.
  }
}

export function loadLibrarySort(defaultValue = "recent") {
  const raw = window.localStorage.getItem(LIBRARY_SORT_STORAGE_KEY);
  return raw || defaultValue;
}

export function saveLibrarySort(value) {
  try {
    window.localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, String(value || "recent"));
  } catch (_error) {
    // Ignore storage failures.
  }
}

export function loadRecentDocuments() {
  return readJson(RECENT_DOCUMENTS_STORAGE_KEY, {});
}

export function recordRecentDocument(filePath) {
  const current = loadRecentDocuments();
  const next = {
    ...current,
    [filePath]: new Date().toISOString(),
  };
  const trimmed = Object.fromEntries(
    Object.entries(next)
      .sort((left, right) => Date.parse(right[1] || "") - Date.parse(left[1] || ""))
      .slice(0, RECENT_DOCUMENT_LIMIT),
  );
  writeJson(RECENT_DOCUMENTS_STORAGE_KEY, trimmed);
  return trimmed;
}

export function loadCollapsedOutlineIds() {
  const raw = readJson(OUTLINE_COLLAPSE_STORAGE_KEY, []);
  return Array.isArray(raw) ? raw.filter((value) => typeof value === "string" && value) : [];
}

export function saveCollapsedOutlineIds(ids) {
  writeJson(
    OUTLINE_COLLAPSE_STORAGE_KEY,
    Array.isArray(ids) ? [...new Set(ids.filter((value) => typeof value === "string" && value))] : [],
  );
}

export function loadDocumentFontStyle(defaultValue) {
  const raw = window.localStorage.getItem(DOCUMENT_FONT_STYLE_STORAGE_KEY);
  return raw || defaultValue;
}

export function saveDocumentFontStyle(value) {
  try {
    window.localStorage.setItem(DOCUMENT_FONT_STYLE_STORAGE_KEY, String(value || ""));
  } catch (_error) {
    // Ignore storage failures.
  }
}

export function loadCodeFontStyle(defaultValue) {
  const raw = window.localStorage.getItem(CODE_FONT_STYLE_STORAGE_KEY);
  return raw || defaultValue;
}

export function saveCodeFontStyle(value) {
  try {
    window.localStorage.setItem(CODE_FONT_STYLE_STORAGE_KEY, String(value || ""));
  } catch (_error) {
    // Ignore storage failures.
  }
}
