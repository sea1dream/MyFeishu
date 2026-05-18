"use strict";

const FLOWZIP_EXTENSION = ".flowzip";
const FLOWZIP_KIND = "flowzip";
const CURRENT_FLOWZIP_VERSION = 1;

function pathExtname(filePath) {
  const normalized = String(filePath || "");
  const segments = normalized.split(/[\\/]/u);
  const baseName = segments[segments.length - 1] || "";
  const lastDotIndex = baseName.lastIndexOf(".");
  return lastDotIndex > 0 ? baseName.slice(lastDotIndex) : "";
}

function ensureFlowzipExtension(filePath) {
  return pathExtname(filePath).toLowerCase() === FLOWZIP_EXTENSION ? filePath : `${filePath}${FLOWZIP_EXTENSION}`;
}

function normalizeArchiveRelativePath(filePath) {
  const segments = String(filePath || "")
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const normalizedSegments = [];

  segments.forEach((segment) => {
    if (segment === "." || segment === "..") {
      return;
    }

    normalizedSegments.push(segment);
  });

  return normalizedSegments.join("/");
}

function normalizeFlowzipManifest(rawManifest = {}) {
  const source = rawManifest && typeof rawManifest === "object" ? rawManifest : {};
  const now = new Date().toISOString();
  const documents = Array.isArray(source.documents)
    ? source.documents
        .map((document) => {
          const resources = Array.isArray(document?.resources)
            ? document.resources
                .map((resource) => {
                  const originalPath = normalizeArchiveRelativePath(resource?.originalPath);
                  const archivePath = normalizeArchiveRelativePath(resource?.archivePath);

                  if (!originalPath || !archivePath) {
                    return null;
                  }

                  return {
                    originalPath,
                    archivePath,
                    kind: resource?.kind === "image" ? "image" : "attachment",
                    fileName: String(resource?.fileName || ""),
                  };
                })
                .filter(Boolean)
            : [];

          const archivePath = normalizeArchiveRelativePath(document?.archivePath);
          const relativePath = normalizeArchiveRelativePath(document?.relativePath);

          if (!archivePath || !relativePath) {
            return null;
          }

          return {
            archivePath,
            relativePath,
            title: String(document?.title || ""),
            resources,
            missingResources: Array.isArray(document?.missingResources)
              ? document.missingResources.map((resourcePath) => normalizeArchiveRelativePath(resourcePath)).filter(Boolean)
              : [],
          };
        })
        .filter(Boolean)
    : [];

  return {
    kind: FLOWZIP_KIND,
    version: CURRENT_FLOWZIP_VERSION,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
    source: {
      mode: source?.source?.mode === "directory" ? "directory" : "document",
      rootName: String(source?.source?.rootName || ""),
    },
    documents,
  };
}

function serializeFlowzipManifest(payload = {}) {
  return {
    ...normalizeFlowzipManifest(payload),
    kind: FLOWZIP_KIND,
    version: CURRENT_FLOWZIP_VERSION,
  };
}

function rewriteHtmlResourcePaths(html, replacements = {}) {
  const normalizedEntries = Object.entries(replacements)
    .map(([fromPath, toPath]) => [normalizeArchiveRelativePath(fromPath), normalizeArchiveRelativePath(toPath)])
    .filter(([fromPath, toPath]) => fromPath && toPath);

  if (!normalizedEntries.length) {
    return String(html || "");
  }

  const replacementMap = new Map(normalizedEntries);

  return String(html || "").replace(/data-src\s*=\s*"([^"]+)"/giu, (fullMatch, rawValue) => {
    const normalizedValue = normalizeArchiveRelativePath(
      String(rawValue || "")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&"),
    );
    const nextValue = replacementMap.get(normalizedValue);

    if (!nextValue) {
      return fullMatch;
    }

    return fullMatch.replace(rawValue, nextValue.replaceAll("&", "&amp;").replaceAll('"', "&quot;"));
  });
}

module.exports = {
  CURRENT_FLOWZIP_VERSION,
  FLOWZIP_EXTENSION,
  FLOWZIP_KIND,
  ensureFlowzipExtension,
  normalizeArchiveRelativePath,
  normalizeFlowzipManifest,
  rewriteHtmlResourcePaths,
  serializeFlowzipManifest,
};
