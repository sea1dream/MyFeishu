"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SETTINGS_FILE_NAME = "flowdoc-settings.json";
const DOCUMENT_LIBRARY_ROOT_KEY = "documentLibraryRoot";

function normalizeDirectoryPath(value) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  return normalizedValue ? path.resolve(normalizedValue) : "";
}

function getSettingsPath(options = {}) {
  if (typeof options.settingsPath === "string" && options.settingsPath.trim()) {
    return path.resolve(options.settingsPath);
  }

  if (typeof options.userDataPath === "string" && options.userDataPath.trim()) {
    return path.join(path.resolve(options.userDataPath), SETTINGS_FILE_NAME);
  }

  return path.resolve(SETTINGS_FILE_NAME);
}

function readSettingsObject(settingsPath) {
  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeSettingsObject(settingsPath, settings) {
  const entries = Object.entries(settings || {}).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    try {
      fs.unlinkSync(settingsPath);
    } catch (_error) {
      // Ignore missing files when clearing settings.
    }
    return;
  }

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`, "utf8");
}

function readDocumentLibraryPreference(options = {}) {
  const settingsPath = getSettingsPath(options);
  const settings = readSettingsObject(settingsPath);
  return normalizeDirectoryPath(settings[DOCUMENT_LIBRARY_ROOT_KEY]);
}

function writeDocumentLibraryPreference(rootPath, options = {}) {
  const settingsPath = getSettingsPath(options);
  const settings = readSettingsObject(settingsPath);
  const normalizedRoot = normalizeDirectoryPath(rootPath);

  if (normalizedRoot) {
    settings[DOCUMENT_LIBRARY_ROOT_KEY] = normalizedRoot;
  } else {
    delete settings[DOCUMENT_LIBRARY_ROOT_KEY];
  }

  writeSettingsObject(settingsPath, settings);
  return normalizedRoot;
}

module.exports = {
  DOCUMENT_LIBRARY_ROOT_KEY,
  SETTINGS_FILE_NAME,
  getSettingsPath,
  readDocumentLibraryPreference,
  writeDocumentLibraryPreference,
};
