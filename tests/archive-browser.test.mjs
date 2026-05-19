import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArchiveBreadcrumbs,
  buildArchiveBrowserTree,
  getArchiveDirectoryNode,
  summarizeArchiveDirectory,
} from "../renderer-modules/archive-browser.mjs";

test("buildArchiveBrowserTree synthesizes folders and groups direct children", () => {
  const tree = buildArchiveBrowserTree([
    { path: "docs/readme.txt", isDirectory: false, size: 12 },
    { path: "docs/nested/demo.py", isDirectory: false, size: 30 },
    { path: "assets", isDirectory: true, size: 0 },
  ]);

  const rootSummary = summarizeArchiveDirectory(tree);
  const docsNode = getArchiveDirectoryNode(tree, "docs");
  const nestedNode = getArchiveDirectoryNode(tree, "docs/nested");

  assert.deepEqual(rootSummary, {
    childDirectoryCount: 2,
    childFileCount: 0,
  });
  assert.equal(docsNode?.directories[0]?.name, "nested");
  assert.equal(docsNode?.files[0]?.name, "readme.txt");
  assert.equal(nestedNode?.files[0]?.path, "docs/nested/demo.py");
});

test("getArchiveDirectoryNode returns null for missing folders", () => {
  const tree = buildArchiveBrowserTree([{ path: "one.txt", isDirectory: false, size: 1 }]);

  assert.equal(getArchiveDirectoryNode(tree, ""), tree);
  assert.equal(getArchiveDirectoryNode(tree, "missing"), null);
});

test("buildArchiveBreadcrumbs expands nested paths", () => {
  assert.deepEqual(buildArchiveBreadcrumbs("docs/nested", "根目录"), [
    { label: "根目录", path: "" },
    { label: "docs", path: "docs" },
    { label: "nested", path: "docs/nested" },
  ]);
});
