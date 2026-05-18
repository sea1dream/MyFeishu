const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  DOCUMENT_LIBRARY_ROOT_KEY,
  getSettingsPath,
  readDocumentLibraryPreference,
  writeDocumentLibraryPreference,
} = require("../shared/library-root-settings");

test("writeDocumentLibraryPreference persists and normalizes a custom root", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "flowdoc-library-settings-"));
  const userDataPath = path.join(tempRoot, "userData");
  const customRoot = path.join(tempRoot, "docs", "..", "docs", "library");

  const savedRoot = writeDocumentLibraryPreference(customRoot, { userDataPath });
  const settingsPath = getSettingsPath({ userDataPath });
  const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

  assert.equal(savedRoot, path.resolve(customRoot));
  assert.equal(parsed[DOCUMENT_LIBRARY_ROOT_KEY], path.resolve(customRoot));
  assert.equal(readDocumentLibraryPreference({ userDataPath }), path.resolve(customRoot));
});

test("writeDocumentLibraryPreference clears the stored root when reset", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "flowdoc-library-settings-"));
  const userDataPath = path.join(tempRoot, "userData");

  writeDocumentLibraryPreference(path.join(tempRoot, "library"), { userDataPath });
  const clearedRoot = writeDocumentLibraryPreference("", { userDataPath });
  const settingsPath = getSettingsPath({ userDataPath });

  assert.equal(clearedRoot, "");
  assert.equal(readDocumentLibraryPreference({ userDataPath }), "");
  assert.equal(fs.existsSync(settingsPath), false);
});
