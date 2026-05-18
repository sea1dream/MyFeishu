"use strict";

const { PDFDocument } = require("pdf-lib");

function toDateOrNull(value) {
  if (!value) {
    return null;
  }

  const nextDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

async function applyPdfMetadataAsync(pdfBuffer, metadata = {}) {
  if (!pdfBuffer) {
    throw new Error("Missing PDF buffer.");
  }

  const pdfDocument = await PDFDocument.load(pdfBuffer, { updateMetadata: false });

  if (metadata.title) {
    pdfDocument.setTitle(String(metadata.title));
  }

  if (metadata.author) {
    pdfDocument.setAuthor(String(metadata.author));
  }

  if (metadata.subject) {
    pdfDocument.setSubject(String(metadata.subject));
  }

  if (Array.isArray(metadata.keywords) && metadata.keywords.length) {
    pdfDocument.setKeywords(metadata.keywords.map((keyword) => String(keyword)));
  }

  if (metadata.creator) {
    pdfDocument.setCreator(String(metadata.creator));
  }

  if (metadata.producer) {
    pdfDocument.setProducer(String(metadata.producer));
  }

  const creationDate = toDateOrNull(metadata.creationDate);

  if (creationDate) {
    pdfDocument.setCreationDate(creationDate);
  }

  const modificationDate = toDateOrNull(metadata.modificationDate);

  if (modificationDate) {
    pdfDocument.setModificationDate(modificationDate);
  }

  return Buffer.from(await pdfDocument.save());
}

module.exports = {
  applyPdfMetadataAsync,
};
