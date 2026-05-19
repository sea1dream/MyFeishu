function normalizeArchivePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/u, "")
    .replace(/\/+/gu, "/")
    .replace(/\/$/u, "");
}

function compareArchiveNames(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function createDirectoryNode(name = "", path = "") {
  return {
    type: "directory",
    name,
    path,
    directories: [],
    files: [],
  };
}

function findDirectoryChild(node, name) {
  return node.directories.find((candidate) => candidate.name === name) || null;
}

function ensureDirectoryNode(root, segments = []) {
  let current = root;
  let currentPath = "";

  segments.forEach((segment) => {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    let next = findDirectoryChild(current, segment);

    if (!next) {
      next = createDirectoryNode(segment, currentPath);
      current.directories.push(next);
    }

    current = next;
  });

  return current;
}

function sortDirectoryTree(node) {
  node.directories.sort((left, right) => compareArchiveNames(left.name, right.name));
  node.files.sort((left, right) => compareArchiveNames(left.name, right.name));
  node.directories.forEach((child) => sortDirectoryTree(child));
  return node;
}

export function buildArchiveBrowserTree(entries = []) {
  const root = createDirectoryNode("", "");
  const seenFiles = new Set();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const normalizedPath = normalizeArchivePath(entry?.path);

    if (!normalizedPath) {
      return;
    }

    const segments = normalizedPath.split("/").filter(Boolean);

    if (!segments.length) {
      return;
    }

    if (entry?.isDirectory) {
      ensureDirectoryNode(root, segments);
      return;
    }

    const parentSegments = segments.slice(0, -1);
    const parent = ensureDirectoryNode(root, parentSegments);
    const filePath = segments.join("/");

    if (seenFiles.has(filePath)) {
      return;
    }

    parent.files.push({
      type: "file",
      name: segments.at(-1) || filePath,
      path: filePath,
      size: Number(entry?.size || 0),
      packedSize: Number(entry?.packedSize || 0),
      modifiedAt: entry?.modifiedAt || null,
    });
    seenFiles.add(filePath);
  });

  return sortDirectoryTree(root);
}

export function getArchiveDirectoryNode(tree, directoryPath = "") {
  const normalizedPath = normalizeArchivePath(directoryPath);

  if (!tree || tree.type !== "directory") {
    return null;
  }

  if (!normalizedPath) {
    return tree;
  }

  return normalizedPath
    .split("/")
    .filter(Boolean)
    .reduce((current, segment) => {
      if (!current) {
        return null;
      }

      return findDirectoryChild(current, segment);
    }, tree);
}

export function buildArchiveBreadcrumbs(directoryPath = "", rootLabel = "压缩包") {
  const normalizedPath = normalizeArchivePath(directoryPath);
  const breadcrumbs = [{ label: rootLabel, path: "" }];

  if (!normalizedPath) {
    return breadcrumbs;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  let currentPath = "";

  segments.forEach((segment) => {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    breadcrumbs.push({
      label: segment,
      path: currentPath,
    });
  });

  return breadcrumbs;
}

export function summarizeArchiveDirectory(node) {
  const directory = node?.type === "directory" ? node : createDirectoryNode("", "");

  return {
    childDirectoryCount: directory.directories.length,
    childFileCount: directory.files.length,
  };
}
