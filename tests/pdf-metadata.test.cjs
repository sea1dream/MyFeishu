const test = require("node:test");
const assert = require("node:assert/strict");

const { PDFDocument } = require("pdf-lib");

const { applyPdfMetadataAsync } = require("../main-modules/pdf-metadata");

test("applyPdfMetadataAsync writes standard PDF metadata", async () => {
  const sourceDocument = await PDFDocument.create();
  sourceDocument.addPage([240, 320]);
  const sourceBuffer = Buffer.from(await sourceDocument.save());

  const resultBuffer = await applyPdfMetadataAsync(sourceBuffer, {
    title: "FlowDoc Demo",
    author: "FlowDoc",
    subject: "FlowDoc export flowdoc_demo",
    keywords: ["FlowDoc", "document-id:flowdoc_demo", "device:fddev1_demo"],
    creator: "FlowDoc 1.0.0",
    producer: "FlowDoc PDF Export",
    creationDate: "2026-05-19T00:00:00.000Z",
    modificationDate: "2026-05-19T01:00:00.000Z",
  });

  const savedDocument = await PDFDocument.load(resultBuffer);

  assert.equal(savedDocument.getTitle(), "FlowDoc Demo");
  assert.equal(savedDocument.getAuthor(), "FlowDoc");
  assert.equal(savedDocument.getSubject(), "FlowDoc export flowdoc_demo");
  assert.match(savedDocument.getKeywords(), /FlowDoc/u);
  assert.match(savedDocument.getKeywords(), /document-id:flowdoc_demo/u);
  assert.match(savedDocument.getKeywords(), /device:fddev1_demo/u);
  assert.equal(savedDocument.getCreator(), "FlowDoc 1.0.0");
  assert.ok(savedDocument.getProducer());
});
