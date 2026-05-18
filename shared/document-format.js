"use strict";

const { ensureDocumentMetadata } = require("./document-metadata");

const DOC_EXTENSION = ".flowdoc";
const PDF_EXTENSION = ".pdf";
const CURRENT_DOCUMENT_VERSION = 3;

function ensureDocumentExtension(filePath) {
  return pathExtname(filePath) ? filePath : `${filePath}${DOC_EXTENSION}`;
}

function ensurePdfExtension(filePath) {
  return pathExtname(filePath).toLowerCase() === PDF_EXTENSION ? filePath : `${filePath}${PDF_EXTENSION}`;
}

function pathExtname(filePath) {
  const normalized = String(filePath || "");
  const segments = normalized.split(/[\\/]/u);
  const baseName = segments[segments.length - 1] || "";
  const lastDotIndex = baseName.lastIndexOf(".");
  return lastDotIndex > 0 ? baseName.slice(lastDotIndex) : "";
}

function getDocumentTitleFromPath(filePath) {
  const normalized = String(filePath || "");
  const baseName = normalized.split(/[\\/]/u).pop() || "";
  const extension = pathExtname(baseName);
  return baseName.slice(0, Math.max(0, baseName.length - extension.length)) || "未命名文档";
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
  return String(tag || "").replace(/\s+/gu, " ").trim();
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
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function migrateDocumentPayload(rawPayload = {}, options = {}) {
  const source = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const html = typeof source.html === "string" ? source.html : "";
  const tags = normalizeDocumentTags(source.tags);
  const now = new Date().toISOString();
  const updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : now;
  const createdAt =
    typeof source.createdAt === "string" ? source.createdAt : typeof source.updatedAt === "string" ? source.updatedAt : now;
  const metadata = ensureDocumentMetadata(source.metadata, options.runtimeMetadata);

  return {
    kind: "flowdoc",
    version: CURRENT_DOCUMENT_VERSION,
    createdAt,
    updatedAt,
    html,
    tags,
    metadata,
  };
}

function serializeDocumentPayload(html, options = {}) {
  const existingPayload = options.existing && typeof options.existing === "object" ? options.existing : {};
  const basePayload = migrateDocumentPayload(existingPayload, { runtimeMetadata: options.runtimeMetadata });

  return {
    ...basePayload,
    kind: "flowdoc",
    version: CURRENT_DOCUMENT_VERSION,
    createdAt: basePayload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    html: typeof html === "string" ? html : "",
    tags: normalizeDocumentTags(options.tags ?? basePayload.tags),
    metadata: ensureDocumentMetadata(basePayload.metadata, options.runtimeMetadata),
  };
}

module.exports = {
  CURRENT_DOCUMENT_VERSION,
  DOC_EXTENSION,
  PDF_EXTENSION,
  ensureDocumentExtension,
  ensurePdfExtension,
  escapeHtml,
  getDocumentTitleFromPath,
  migrateDocumentPayload,
  normalizeDocumentTag,
  normalizeDocumentTags,
  normalizeDocumentTitle,
  serializeDocumentPayload,
};
