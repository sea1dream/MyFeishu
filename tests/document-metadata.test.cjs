const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDeviceFingerprint,
  buildMetadataKeywordList,
  buildRuntimeDocumentMetadata,
  ensureDocumentMetadata,
} = require("../shared/document-metadata");

test("buildDeviceFingerprint is stable for the same environment seed", () => {
  const seed = {
    appId: "com.flowdoc.editor",
    platform: "win32",
    arch: "x64",
    osRelease: "10.0.26200",
    hostname: "codex-lab",
  };

  assert.equal(buildDeviceFingerprint(seed), buildDeviceFingerprint(seed));
  assert.match(buildDeviceFingerprint(seed), /^fddev1_[0-9a-f]{24}$/u);
});

test("ensureDocumentMetadata preserves document id and refreshes save fingerprint", () => {
  const runtime = buildRuntimeDocumentMetadata({
    appId: "com.flowdoc.editor",
    appName: "FlowDoc",
    appVersion: "1.0.0",
    platform: "win32",
    arch: "x64",
    osRelease: "10.0.26200",
    hostname: "codex-lab",
  });
  const metadata = ensureDocumentMetadata(
    {
      documentId: "flowdoc_existing",
      createdByDevice: "fddev1_origin",
    },
    runtime,
  );

  assert.equal(metadata.documentId, "flowdoc_existing");
  assert.equal(metadata.createdByDevice, "fddev1_origin");
  assert.equal(metadata.lastSavedByDevice, runtime.deviceFingerprint);
  assert.equal(metadata.generator.appName, "FlowDoc");
});

test("buildMetadataKeywordList includes document and environment markers", () => {
  const keywords = buildMetadataKeywordList({
    documentId: "flowdoc_123",
    lastSavedByDevice: "fddev1_abc",
    environment: {
      platform: "win32",
      arch: "x64",
    },
    generator: {
      appVersion: "1.0.0",
    },
  });

  assert.ok(keywords.includes("FlowDoc"));
  assert.ok(keywords.includes("document-id:flowdoc_123"));
  assert.ok(keywords.includes("device:fddev1_abc"));
});
