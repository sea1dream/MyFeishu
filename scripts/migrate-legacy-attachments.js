"use strict";

const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const {
  DOC_EXTENSION,
  getDocumentTitleFromPath,
  migrateDocumentPayload,
  normalizeDocumentTitle,
  serializeDocumentPayload,
} = require("../shared/document-format");

function parseArguments(argv) {
  const options = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = argv[index + 1];

    if (!nextValue || nextValue.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = nextValue;
    index += 1;
  }

  return options;
}

function splitBaseName(fileName) {
  const extension = path.extname(fileName);
  const name = path.basename(fileName, extension) || "resource";
  return { name, extension };
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function walkFlowDocFiles(rootDirectory) {
  if (!(await pathExists(rootDirectory))) {
    return [];
  }

  const results = [];
  const pending = [rootDirectory];

  while (pending.length) {
    const currentDirectory = pending.pop();
    const entries = await fsp.readdir(currentDirectory, { withFileTypes: true });

    entries.forEach((entry) => {
      const absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        pending.push(absolutePath);
        return;
      }

      if (entry.isFile() && path.extname(entry.name).toLowerCase() === DOC_EXTENSION) {
        results.push(absolutePath);
      }
    });
  }

  return results;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeAttachmentPath(resourcePath) {
  return String(resourcePath || "").split("\\").join("/").trim();
}

function extractAttachmentPaths(html) {
  const attachmentPaths = new Set();
  const tagPattern = /<[^>]+>/gu;
  let match;

  while ((match = tagPattern.exec(String(html || "")))) {
    const tag = match[0];
    const isAttachmentTag =
      /data-kind\s*=\s*"attachment"/iu.test(tag) || /class\s*=\s*"[^"]*\battachment-node\b[^"]*"/iu.test(tag);

    if (!isAttachmentTag) {
      continue;
    }

    const srcMatch = /data-src\s*=\s*"([^"]+)"/iu.exec(tag);
    const relativePath = normalizeAttachmentPath(srcMatch?.[1] || "");

    if (relativePath.startsWith("attachments/")) {
      attachmentPaths.add(relativePath);
    }
  }

  return [...attachmentPaths];
}

function getAttachmentFolderName(documentPath) {
  return normalizeDocumentTitle(getDocumentTitleFromPath(documentPath));
}

function buildStoredAttachmentPath(documentPath, fileName) {
  return ["attachments", getAttachmentFolderName(documentPath), fileName].join("/");
}

async function getUniqueTargetPath(directory, desiredName) {
  const { name, extension } = splitBaseName(desiredName);
  let candidate = path.join(directory, desiredName);
  let counter = 0;

  while (await pathExists(candidate)) {
    counter += 1;
    candidate = path.join(directory, `${name}-${counter}${extension}`);
  }

  return candidate;
}

async function filesAreEqual(leftPath, rightPath) {
  const [leftStat, rightStat] = await Promise.all([fsp.stat(leftPath), fsp.stat(rightPath)]);

  if (leftStat.size !== rightStat.size) {
    return false;
  }

  const [leftBuffer, rightBuffer] = await Promise.all([fsp.readFile(leftPath), fsp.readFile(rightPath)]);
  return leftBuffer.equals(rightBuffer);
}

async function ensureTargetPath(targetDirectory, sourcePath) {
  const desiredName = path.basename(sourcePath);
  const desiredPath = path.join(targetDirectory, desiredName);

  if (!(await pathExists(desiredPath))) {
    return desiredPath;
  }

  if (await filesAreEqual(sourcePath, desiredPath)) {
    return desiredPath;
  }

  return getUniqueTargetPath(targetDirectory, desiredName);
}

function replaceAllExact(html, fromValue, toValue) {
  return String(html || "").replace(new RegExp(escapeRegExp(fromValue), "gu"), toValue);
}

async function pruneEmptyDirectories(rootDirectory, startingDirectory) {
  let currentDirectory = path.resolve(startingDirectory || "");
  const resolvedRoot = path.resolve(rootDirectory);

  while (currentDirectory.startsWith(resolvedRoot) && currentDirectory !== resolvedRoot) {
    let entries = [];

    try {
      entries = await fsp.readdir(currentDirectory);
    } catch (_error) {
      break;
    }

    if (entries.length > 0) {
      break;
    }

    try {
      await fsp.rmdir(currentDirectory);
    } catch (_error) {
      break;
    }

    currentDirectory = path.dirname(currentDirectory);
  }
}

async function copyDocumentBackup(backupRoot, documentsRoot, documentPath) {
  const relativePath = path.relative(documentsRoot, documentPath);
  const targetPath = path.join(backupRoot, "documents", relativePath);
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.copyFile(documentPath, targetPath);
}

async function main() {
  const options = parseArguments(process.argv);
  const repoRoot = path.resolve(__dirname, "..");
  const documentsRoot = path.resolve(
    options["documents-root"] || path.join(process.env.USERPROFILE || "", "Desktop", "本地文档"),
  );
  const attachmentsRoot = path.resolve(options["attachments-root"] || path.join(repoRoot, "attachments"));
  const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const backupRoot = path.join(repoRoot, "migration-backups", `legacy-attachments-${timestamp}`);

  const documentPaths = await walkFlowDocFiles(documentsRoot);
  const attachmentPlans = new Map();
  const documentPlans = [];

  for (const documentPath of documentPaths) {
    const raw = await fsp.readFile(documentPath, "utf8");
    const parsed = migrateDocumentPayload(JSON.parse(raw));
    const attachmentPaths = extractAttachmentPaths(parsed.html);

    if (!attachmentPaths.length) {
      continue;
    }

    const documentFolder = getAttachmentFolderName(documentPath);
    const targetDirectory = path.join(attachmentsRoot, documentFolder);
    const replacements = new Map();

    for (const oldRelativePath of attachmentPaths) {
      const normalizedOldPath = normalizeAttachmentPath(oldRelativePath);
      const oldSegments = normalizedOldPath.split("/").filter(Boolean);
      const sourceAbsolutePath = path.join(attachmentsRoot, ...oldSegments.slice(1));

      if (!(await pathExists(sourceAbsolutePath))) {
        continue;
      }

      await fsp.mkdir(targetDirectory, { recursive: true });
      const targetAbsolutePath = await ensureTargetPath(targetDirectory, sourceAbsolutePath);
      const newRelativePath = buildStoredAttachmentPath(documentPath, path.basename(targetAbsolutePath));

      if (normalizedOldPath === newRelativePath) {
        continue;
      }

      replacements.set(normalizedOldPath, newRelativePath);

      if (!attachmentPlans.has(sourceAbsolutePath)) {
        attachmentPlans.set(sourceAbsolutePath, {
          sourceAbsolutePath,
          copies: new Map(),
        });
      }

      attachmentPlans.get(sourceAbsolutePath).copies.set(targetAbsolutePath, {
        targetAbsolutePath,
        newRelativePath,
        documentPath,
      });
    }

    if (!replacements.size) {
      continue;
    }

    let nextHtml = parsed.html;
    [...replacements.entries()]
      .sort((left, right) => right[0].length - left[0].length)
      .forEach(([fromValue, toValue]) => {
        nextHtml = replaceAllExact(nextHtml, fromValue, toValue);
      });

    documentPlans.push({
      documentPath,
      rawPayload: JSON.parse(raw),
      parsedPayload: parsed,
      nextHtml,
      replacements,
    });
  }

  if (!documentPlans.length) {
    console.log(
      JSON.stringify(
        {
          documentsRoot,
          attachmentsRoot,
          migratedDocuments: 0,
          copiedAttachments: 0,
          deletedLegacyAttachments: 0,
          backupRoot: null,
        },
        null,
        2,
      ),
    );
    return;
  }

  await fsp.mkdir(backupRoot, { recursive: true });

  let copiedAttachments = 0;

  for (const plan of attachmentPlans.values()) {
    for (const copyPlan of plan.copies.values()) {
      if (!(await pathExists(copyPlan.targetAbsolutePath))) {
        await fsp.mkdir(path.dirname(copyPlan.targetAbsolutePath), { recursive: true });
        await fsp.copyFile(plan.sourceAbsolutePath, copyPlan.targetAbsolutePath);
        copiedAttachments += 1;
      }
    }
  }

  for (const documentPlan of documentPlans) {
    await copyDocumentBackup(backupRoot, documentsRoot, documentPlan.documentPath);
    const serialized = serializeDocumentPayload(documentPlan.nextHtml, {
      existing: {
        ...documentPlan.rawPayload,
        ...documentPlan.parsedPayload,
      },
      tags: documentPlan.parsedPayload.tags,
    });
    await fsp.writeFile(documentPlan.documentPath, JSON.stringify(serialized, null, 2), "utf8");
  }

  let deletedLegacyAttachments = 0;

  for (const plan of attachmentPlans.values()) {
    if (!(await pathExists(plan.sourceAbsolutePath))) {
      continue;
    }

    await fsp.unlink(plan.sourceAbsolutePath);
    deletedLegacyAttachments += 1;
    await pruneEmptyDirectories(attachmentsRoot, path.dirname(plan.sourceAbsolutePath));
  }

  const summary = {
    documentsRoot,
    attachmentsRoot,
    migratedDocuments: documentPlans.length,
    copiedAttachments,
    deletedLegacyAttachments,
    backupRoot,
    documents: documentPlans.map((plan) => ({
      documentPath: plan.documentPath,
      replacements: Object.fromEntries(plan.replacements),
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
