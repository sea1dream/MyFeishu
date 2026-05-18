"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LEGACY_DOCUMENT_LIBRARY_FOLDER_NAME = "本地文档";
const DEFAULT_DOCUMENT_LIBRARY_FOLDER_NAME = "FlowDoc Library";
const DOCUMENT_LIBRARY_ROOT_ENV_KEY = "FLOWDOC_LIBRARY_ROOT";

function normalizeDirectoryPath(value) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  return normalizedValue ? path.resolve(normalizedValue) : "";
}

function getHomeDirectory(env = process.env) {
  return normalizeDirectoryPath(env.USERPROFILE || env.HOME || "") || os.homedir();
}

function resolveSystemPath(key, fallbackPath, getSystemPath) {
  if (typeof getSystemPath === "function") {
    try {
      const resolved = normalizeDirectoryPath(getSystemPath(key));

      if (resolved) {
        return resolved;
      }
    } catch {
      // Fall back to a conventional path when the platform API is unavailable.
    }
  }

  return normalizeDirectoryPath(fallbackPath);
}

function getLegacyDocumentLibraryRoot(options = {}) {
  const homeDirectory = getHomeDirectory(options.env);
  const desktopDirectory = resolveSystemPath("desktop", path.join(homeDirectory, "Desktop"), options.getSystemPath);
  return path.join(desktopDirectory, LEGACY_DOCUMENT_LIBRARY_FOLDER_NAME);
}

function getDefaultDocumentLibraryRoot(options = {}) {
  const homeDirectory = getHomeDirectory(options.env);
  const documentsDirectory = resolveSystemPath(
    "documents",
    path.join(homeDirectory, "Documents"),
    options.getSystemPath,
  );
  return path.join(documentsDirectory, DEFAULT_DOCUMENT_LIBRARY_FOLDER_NAME);
}

function getConfiguredDocumentLibraryRoot(options = {}) {
  return normalizeDirectoryPath((options.env || process.env)[DOCUMENT_LIBRARY_ROOT_ENV_KEY]);
}

function getSavedDocumentLibraryRoot(options = {}) {
  return normalizeDirectoryPath(options.savedRoot);
}

function directoryExists(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveDocumentLibraryRootInfo(options = {}) {
  const configuredRoot = getConfiguredDocumentLibraryRoot(options);

  if (configuredRoot) {
    return {
      rootPath: configuredRoot,
      source: "environment",
    };
  }

  const savedRoot = getSavedDocumentLibraryRoot(options);

  if (savedRoot) {
    return {
      rootPath: savedRoot,
      source: "saved",
    };
  }

  const legacyRoot = getLegacyDocumentLibraryRoot(options);

  if (directoryExists(legacyRoot)) {
    return {
      rootPath: legacyRoot,
      source: "legacy",
    };
  }

  const defaultRoot = getDefaultDocumentLibraryRoot(options);
  return {
    rootPath: defaultRoot,
    source: "default",
  };
}

function resolveDocumentLibraryRoot(options = {}) {
  return resolveDocumentLibraryRootInfo(options).rootPath;
}

function resolveDownloadsDirectory(options = {}) {
  const homeDirectory = getHomeDirectory(options.env);
  return resolveSystemPath("downloads", path.join(homeDirectory, "Downloads"), options.getSystemPath);
}

module.exports = {
  DEFAULT_DOCUMENT_LIBRARY_FOLDER_NAME,
  DOCUMENT_LIBRARY_ROOT_ENV_KEY,
  LEGACY_DOCUMENT_LIBRARY_FOLDER_NAME,
  getDefaultDocumentLibraryRoot,
  getLegacyDocumentLibraryRoot,
  resolveDocumentLibraryRootInfo,
  resolveDocumentLibraryRoot,
  resolveDownloadsDirectory,
};
