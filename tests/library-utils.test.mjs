import test from "node:test";
import assert from "node:assert/strict";

import { filterAndSortLibraryDocuments } from "../renderer-modules/library-utils.mjs";

const documents = [
  {
    filePath: "a",
    title: "Alpha",
    relativePath: "alpha.flowdoc",
    updatedAt: "2026-05-10T12:00:00.000Z",
    tags: ["work"],
  },
  {
    filePath: "b",
    title: "Beta",
    relativePath: "beta.flowdoc",
    updatedAt: "2026-05-11T12:00:00.000Z",
    tags: [],
  },
];

test("filterAndSortLibraryDocuments sorts by recent open", () => {
  const sorted = filterAndSortLibraryDocuments({
    documents,
    searchText: "",
    selectedTag: "",
    untaggedFilter: "__UNTAGGED__",
    recentDocuments: {
      a: "2026-05-12T08:00:00.000Z",
      b: "2026-05-12T07:00:00.000Z",
    },
    sortKey: "recent",
  });

  assert.deepEqual(sorted.map((item) => item.filePath), ["a", "b"]);
});

test("filterAndSortLibraryDocuments filters by untagged tag", () => {
  const filtered = filterAndSortLibraryDocuments({
    documents,
    searchText: "",
    selectedTag: "__UNTAGGED__",
    untaggedFilter: "__UNTAGGED__",
    recentDocuments: {},
    sortKey: "updatedAt",
  });

  assert.deepEqual(filtered.map((item) => item.filePath), ["b"]);
});
