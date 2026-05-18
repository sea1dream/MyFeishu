const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CURRENT_FLOWZIP_VERSION,
  FLOWZIP_KIND,
  ensureFlowzipExtension,
  normalizeArchiveRelativePath,
  normalizeFlowzipManifest,
  rewriteHtmlResourcePaths,
  serializeFlowzipManifest,
} = require("../shared/archive-format");

test("ensureFlowzipExtension appends custom archive suffix", () => {
  assert.equal(ensureFlowzipExtension("D:/docs/demo"), "D:/docs/demo.flowzip");
  assert.equal(ensureFlowzipExtension("D:/docs/demo.flowzip"), "D:/docs/demo.flowzip");
});

test("normalizeFlowzipManifest drops invalid document/resource entries", () => {
  const manifest = normalizeFlowzipManifest({
    source: { mode: "directory", rootName: "demo" },
    documents: [
      {
        archivePath: "documents/demo.flowdoc",
        relativePath: "demo.flowdoc",
        resources: [
          { originalPath: "images/demo.png", archivePath: "resources/doc-001/demo.png", kind: "image" },
          { originalPath: "", archivePath: "resources/doc-001/skip.bin" },
        ],
      },
      {
        archivePath: "",
        relativePath: "skip.flowdoc",
      },
    ],
  });

  assert.equal(manifest.kind, FLOWZIP_KIND);
  assert.equal(manifest.version, CURRENT_FLOWZIP_VERSION);
  assert.equal(manifest.documents.length, 1);
  assert.deepEqual(manifest.documents[0].resources, [
    {
      originalPath: "images/demo.png",
      archivePath: "resources/doc-001/demo.png",
      kind: "image",
      fileName: "",
    },
  ]);
});

test("serializeFlowzipManifest normalizes source metadata", () => {
  const manifest = serializeFlowzipManifest({
    source: { mode: "document", rootName: "single" },
    documents: [],
  });

  assert.equal(manifest.kind, FLOWZIP_KIND);
  assert.equal(manifest.version, CURRENT_FLOWZIP_VERSION);
  assert.equal(manifest.source.mode, "document");
  assert.equal(manifest.source.rootName, "single");
});

test("normalizeArchiveRelativePath strips traversal segments", () => {
  assert.equal(normalizeArchiveRelativePath("../demo/./nested/../../note.flowdoc"), "demo/nested/note.flowdoc");
});

test("rewriteHtmlResourcePaths updates only matching data-src attributes", () => {
  const html = `
    <div class="image-node" data-kind="image" data-src="images/one.png"></div>
    <div class="attachment-node" data-kind="attachment" data-src="attachments/demo/file.pdf"></div>
    <div class="image-node" data-kind="image" data-src="images/two.png"></div>
  `;

  const rewritten = rewriteHtmlResourcePaths(html, {
    "images/one.png": "images/imported-one.png",
    "attachments/demo/file.pdf": "attachments/demo-2/file.pdf",
  });

  assert.match(rewritten, /data-src="images\/imported-one\.png"/u);
  assert.match(rewritten, /data-src="attachments\/demo-2\/file\.pdf"/u);
  assert.match(rewritten, /data-src="images\/two\.png"/u);
});
