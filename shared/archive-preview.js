"use strict";

const ARCHIVE_PREVIEW_ENTRY_LIMIT = 800;

function normalizeArchivePreviewPath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/u, "")
    .replace(/\/+/gu, "/")
    .replace(/\/$/u, "");
}

function parseArchivePreviewSize(value) {
  const size = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(size) && size >= 0 ? size : 0;
}

function parseArchivePreviewDate(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function summarizeArchiveEntries(entries = []) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];

  return normalizedEntries.reduce(
    (summary, entry) => {
      if (entry?.isDirectory) {
        summary.directoryCount += 1;
        return summary;
      }

      summary.fileCount += 1;
      summary.totalUnpackedSize += parseArchivePreviewSize(entry?.size);
      return summary;
    },
    {
      fileCount: 0,
      directoryCount: 0,
      totalUnpackedSize: 0,
    },
  );
}

function parseSevenZipListOutput(stdout, options = {}) {
  const limit =
    Number.isInteger(options.limit) && options.limit > 0 ? options.limit : ARCHIVE_PREVIEW_ENTRY_LIMIT;
  const lines = String(stdout || "").split(/\r?\n/u);
  const entries = [];
  let archiveType = "";
  let currentEntry = null;
  let entrySectionStarted = false;
  let truncated = false;

  function commitCurrentEntry() {
    if (!currentEntry?.Path) {
      currentEntry = null;
      return;
    }

    const normalizedPath = normalizeArchivePreviewPath(currentEntry.Path);

    if (!normalizedPath) {
      currentEntry = null;
      return;
    }

    if (entries.length >= limit) {
      truncated = true;
      currentEntry = null;
      return;
    }

    entries.push({
      path: normalizedPath,
      isDirectory: String(currentEntry.Folder || "").trim() === "+",
      size: parseArchivePreviewSize(currentEntry.Size),
      packedSize: parseArchivePreviewSize(currentEntry["Packed Size"]),
      modifiedAt: parseArchivePreviewDate(currentEntry.Modified),
    });
    currentEntry = null;
  }

  lines.forEach((line) => {
    if (!entrySectionStarted) {
      if (!archiveType && line.startsWith("Type = ")) {
        archiveType = line.slice("Type = ".length).trim().toLowerCase();
      }

      if (line.startsWith("----------")) {
        entrySectionStarted = true;
      }

      return;
    }

    if (!line.trim()) {
      commitCurrentEntry();
      return;
    }

    const delimiterIndex = line.indexOf(" = ");

    if (delimiterIndex === -1) {
      return;
    }

    if (!currentEntry) {
      currentEntry = {};
    }

    const key = line.slice(0, delimiterIndex).trim();
    const value = line.slice(delimiterIndex + 3);
    currentEntry[key] = value;
  });

  commitCurrentEntry();

  return {
    archiveType: archiveType || "archive",
    entries,
    entryCount: entries.length,
    truncated,
  };
}

module.exports = {
  ARCHIVE_PREVIEW_ENTRY_LIMIT,
  normalizeArchivePreviewPath,
  parseSevenZipListOutput,
  summarizeArchiveEntries,
};
