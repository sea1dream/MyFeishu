"use strict";

const crypto = require("node:crypto");

const DOCUMENT_ID_PREFIX = "flowdoc";
const DEVICE_FINGERPRINT_PREFIX = "fddev1";

function normalizeOptionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function createDocumentId() {
  return `${DOCUMENT_ID_PREFIX}_${crypto.randomUUID()}`;
}

function buildDeviceFingerprint(seed = {}) {
  const payload = [
    normalizeOptionalString(seed.appId) || "com.flowdoc.editor",
    normalizeOptionalString(seed.platform) || "unknown",
    normalizeOptionalString(seed.arch) || "unknown",
    normalizeOptionalString(seed.osRelease) || "unknown",
    normalizeOptionalString(seed.hostname) || "unknown",
  ].join("|");
  const digest = crypto.createHash("sha256").update(payload).digest("hex");
  return `${DEVICE_FINGERPRINT_PREFIX}_${digest.slice(0, 24)}`;
}

function buildRuntimeDocumentMetadata(runtime = {}) {
  const appId = normalizeOptionalString(runtime.appId) || "com.flowdoc.editor";
  const appName = normalizeOptionalString(runtime.appName) || "FlowDoc";
  const appVersion = normalizeOptionalString(runtime.appVersion) || "0.0.0";
  const platform = normalizeOptionalString(runtime.platform) || null;
  const arch = normalizeOptionalString(runtime.arch) || null;
  const osRelease = normalizeOptionalString(runtime.osRelease) || null;
  const deviceFingerprint =
    normalizeOptionalString(runtime.deviceFingerprint) ||
    buildDeviceFingerprint({
      appId,
      platform,
      arch,
      osRelease,
      hostname: runtime.hostname,
    });

  return {
    deviceFingerprint,
    generator: {
      appId,
      appName,
      appVersion,
    },
    environment: {
      platform,
      arch,
      osRelease,
    },
  };
}

function ensureDocumentMetadata(metadata = {}, runtimeMetadata = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  const runtime = buildRuntimeDocumentMetadata(runtimeMetadata);
  const sourceGenerator = source.generator && typeof source.generator === "object" ? source.generator : {};
  const sourceEnvironment = source.environment && typeof source.environment === "object" ? source.environment : {};
  const createdByDevice =
    normalizeOptionalString(source.createdByDevice) ||
    normalizeOptionalString(source.deviceFingerprint) ||
    runtime.deviceFingerprint;

  return {
    documentId: normalizeOptionalString(source.documentId) || createDocumentId(),
    createdByDevice,
    lastSavedByDevice:
      runtime.deviceFingerprint ||
      normalizeOptionalString(source.lastSavedByDevice) ||
      normalizeOptionalString(source.deviceFingerprint) ||
      createdByDevice,
    generator: {
      appId: normalizeOptionalString(sourceGenerator.appId) || runtime.generator.appId,
      appName: normalizeOptionalString(sourceGenerator.appName) || runtime.generator.appName,
      appVersion: normalizeOptionalString(sourceGenerator.appVersion) || runtime.generator.appVersion,
    },
    environment: {
      platform: normalizeOptionalString(sourceEnvironment.platform) || runtime.environment.platform,
      arch: normalizeOptionalString(sourceEnvironment.arch) || runtime.environment.arch,
      osRelease: normalizeOptionalString(sourceEnvironment.osRelease) || runtime.environment.osRelease,
    },
  };
}

function buildMetadataKeywordList(metadata = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  const sourceEnvironment = source.environment && typeof source.environment === "object" ? source.environment : {};
  const sourceGenerator = source.generator && typeof source.generator === "object" ? source.generator : {};
  const documentId = normalizeOptionalString(source.documentId) || createDocumentId();
  const lastSavedByDevice =
    normalizeOptionalString(source.lastSavedByDevice) || normalizeOptionalString(source.deviceFingerprint) || "unknown";
  const keywords = [
    "FlowDoc",
    `document-id:${documentId}`,
    `device:${lastSavedByDevice}`,
    normalizeOptionalString(sourceEnvironment.platform) ? `platform:${sourceEnvironment.platform}` : null,
    normalizeOptionalString(sourceEnvironment.arch) ? `arch:${sourceEnvironment.arch}` : null,
    normalizeOptionalString(sourceGenerator.appVersion) ? `app-version:${sourceGenerator.appVersion}` : null,
  ].filter(Boolean);

  return [...new Set(keywords)];
}

module.exports = {
  buildDeviceFingerprint,
  buildMetadataKeywordList,
  buildRuntimeDocumentMetadata,
  createDocumentId,
  ensureDocumentMetadata,
};
