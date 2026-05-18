const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  DEFAULT_DOCUMENT_LIBRARY_FOLDER_NAME,
  DOCUMENT_LIBRARY_ROOT_ENV_KEY,
  LEGACY_DOCUMENT_LIBRARY_FOLDER_NAME,
  getDefaultDocumentLibraryRoot,
  getLegacyDocumentLibraryRoot,
  resolveDocumentLibraryRoot,
  resolveDownloadsDirectory,
} = require("../shared/path-config");

test("resolveDocumentLibraryRoot prefers explicit environment override", () => {
  const customRoot = path.resolve("D:/custom-flowdoc-root");

  assert.equal(
    resolveDocumentLibraryRoot({
      env: {
        [DOCUMENT_LIBRARY_ROOT_ENV_KEY]: customRoot,
        USERPROFILE: "C:/Users/Test",
      },
    }),
    customRoot,
  );
});

test("document library helpers derive conventional default folders", () => {
  const options = {
    env: {
      USERPROFILE: "C:/Users/Test",
    },
  };

  assert.equal(
    getLegacyDocumentLibraryRoot(options),
    path.resolve(`C:/Users/Test/Desktop/${LEGACY_DOCUMENT_LIBRARY_FOLDER_NAME}`),
  );
  assert.equal(
    getDefaultDocumentLibraryRoot(options),
    path.resolve(`C:/Users/Test/Documents/${DEFAULT_DOCUMENT_LIBRARY_FOLDER_NAME}`),
  );
});

test("resolveDocumentLibraryRoot falls back to platform documents directory when no legacy library exists", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "flowdoc-path-config-"));
  const documentsDirectory = path.join(tempRoot, "Documents");
  const desktopDirectory = path.join(tempRoot, "Desktop");

  fs.mkdirSync(documentsDirectory, { recursive: true });
  fs.mkdirSync(desktopDirectory, { recursive: true });

  const root = resolveDocumentLibraryRoot({
    env: {
      USERPROFILE: tempRoot,
    },
    getSystemPath: (key) => {
      if (key === "documents") {
        return documentsDirectory;
      }

      if (key === "desktop") {
        return desktopDirectory;
      }

      return "";
    },
  });

  assert.equal(root, path.resolve(path.join(documentsDirectory, DEFAULT_DOCUMENT_LIBRARY_FOLDER_NAME)));
});

test("resolveDocumentLibraryRoot keeps using an existing legacy desktop library", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "flowdoc-path-config-"));
  const documentsDirectory = path.join(tempRoot, "Documents");
  const desktopDirectory = path.join(tempRoot, "Desktop");
  const legacyLibraryDirectory = path.join(desktopDirectory, LEGACY_DOCUMENT_LIBRARY_FOLDER_NAME);

  fs.mkdirSync(documentsDirectory, { recursive: true });
  fs.mkdirSync(legacyLibraryDirectory, { recursive: true });

  const root = resolveDocumentLibraryRoot({
    env: {
      USERPROFILE: tempRoot,
    },
    getSystemPath: (key) => {
      if (key === "documents") {
        return documentsDirectory;
      }

      if (key === "desktop") {
        return desktopDirectory;
      }

      return "";
    },
  });

  assert.equal(root, path.resolve(legacyLibraryDirectory));
});

test("resolveDownloadsDirectory uses system downloads path when available", () => {
  assert.equal(
    resolveDownloadsDirectory({
      env: {
        USERPROFILE: "C:/Users/Test",
      },
      getSystemPath: (key) => (key === "downloads" ? "E:/My Downloads" : ""),
    }),
    path.resolve("E:/My Downloads"),
  );
});
