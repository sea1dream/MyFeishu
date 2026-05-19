const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeArchivePreviewPath,
  parseSevenZipListOutput,
  summarizeArchiveEntries,
} = require("../shared/archive-preview");

test("normalizeArchivePreviewPath normalizes separators and trims roots", () => {
  assert.equal(normalizeArchivePreviewPath("\\nested\\folder\\a.txt"), "nested/folder/a.txt");
  assert.equal(normalizeArchivePreviewPath("///docs//demo/"), "docs/demo");
});

test("parseSevenZipListOutput extracts archive entries and type", () => {
  const stdout = `
Path = D:\\archives\\demo.7z
Type = 7z

----------
Path = docs
Folder = +
Size = 0
Packed Size = 0
Modified = 2026-05-19 10:12:33

Path = docs\\a.txt
Folder = -
Size = 12
Packed Size = 9
Modified = 2026-05-19 10:12:34

Path = docs\\nested\\b.bin
Folder = -
Size = 24
Packed Size = 16
Modified = 2026-05-19 10:12:35
`;

  const parsed = parseSevenZipListOutput(stdout, { limit: 10 });

  assert.equal(parsed.archiveType, "7z");
  assert.equal(parsed.entryCount, 3);
  assert.equal(parsed.truncated, false);
  assert.deepEqual(parsed.entries.map((entry) => entry.path), ["docs", "docs/a.txt", "docs/nested/b.bin"]);
  assert.equal(parsed.entries[0].isDirectory, true);
  assert.equal(parsed.entries[1].size, 12);
});

test("summarizeArchiveEntries counts files, folders, and unpacked size", () => {
  const summary = summarizeArchiveEntries([
    { path: "docs", isDirectory: true, size: 0 },
    { path: "docs/a.txt", isDirectory: false, size: 12 },
    { path: "docs/b.txt", isDirectory: false, size: 30 },
  ]);

  assert.deepEqual(summary, {
    fileCount: 2,
    directoryCount: 1,
    totalUnpackedSize: 42,
  });
});
