const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CURRENT_DOCUMENT_VERSION,
  ensureDocumentExtension,
  migrateDocumentPayload,
  normalizeDocumentTags,
  serializeDocumentPayload,
} = require("../shared/document-format");

test("normalizeDocumentTags deduplicates and trims tags", () => {
  assert.deepEqual(normalizeDocumentTags([" Alpha ", "alpha", "Beta", "", " beta "]), ["Alpha", "Beta"]);
});

test("ensureDocumentExtension appends missing suffix", () => {
  assert.equal(ensureDocumentExtension("D:/docs/demo"), "D:/docs/demo.flowdoc");
  assert.equal(ensureDocumentExtension("D:/docs/demo.flowdoc"), "D:/docs/demo.flowdoc");
});

test("migrateDocumentPayload upgrades legacy documents to current schema", () => {
  const migrated = migrateDocumentPayload({
    html: "<h1>Hello</h1>",
    tags: "alpha, beta",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }, {
    runtimeMetadata: {
      appId: "com.flowdoc.editor",
      appName: "FlowDoc",
      appVersion: "1.0.0",
      platform: "win32",
      arch: "x64",
      osRelease: "10.0.26200",
      hostname: "test-host",
    },
  });

  assert.equal(migrated.kind, "flowdoc");
  assert.equal(migrated.version, CURRENT_DOCUMENT_VERSION);
  assert.equal(migrated.createdAt, "2025-01-01T00:00:00.000Z");
  assert.deepEqual(migrated.tags, ["alpha", "beta"]);
  assert.match(migrated.metadata.documentId, /^flowdoc_/u);
  assert.match(migrated.metadata.createdByDevice, /^fddev1_/u);
});

test("serializeDocumentPayload preserves createdAt and normalizes tags", () => {
  const payload = serializeDocumentPayload("<p>Updated</p>", {
    existing: {
      createdAt: "2024-05-01T10:00:00.000Z",
      updatedAt: "2024-05-02T10:00:00.000Z",
      tags: ["old"],
      html: "<p>Old</p>",
      metadata: {
        documentId: "flowdoc_existing",
        createdByDevice: "fddev1_created",
      },
    },
    tags: [" New ", "new", "Second"],
    runtimeMetadata: {
      appId: "com.flowdoc.editor",
      appName: "FlowDoc",
      appVersion: "1.0.0",
      platform: "win32",
      arch: "x64",
      osRelease: "10.0.26200",
      hostname: "test-host-2",
    },
  });

  assert.equal(payload.createdAt, "2024-05-01T10:00:00.000Z");
  assert.equal(payload.version, CURRENT_DOCUMENT_VERSION);
  assert.equal(payload.html, "<p>Updated</p>");
  assert.deepEqual(payload.tags, ["New", "Second"]);
  assert.equal(payload.metadata.documentId, "flowdoc_existing");
  assert.equal(payload.metadata.createdByDevice, "fddev1_created");
  assert.match(payload.metadata.lastSavedByDevice, /^fddev1_/u);
});
