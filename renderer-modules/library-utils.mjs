export const LIBRARY_SORT_OPTIONS = [
  { value: "recent", label: "最近打开" },
  { value: "updatedAt", label: "最近更新" },
  { value: "title", label: "按标题" },
];

function normalizeSearchText(value) {
  return String(value || "").replaceAll("\r\n", "\n").replaceAll("\u00a0", " ").toLocaleLowerCase();
}

function compareByTitle(left, right) {
  return String(left.title || "").localeCompare(String(right.title || ""), "zh-CN");
}

function compareByUpdatedAt(left, right) {
  const leftTime = Date.parse(left.updatedAt || "") || 0;
  const rightTime = Date.parse(right.updatedAt || "") || 0;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return compareByTitle(left, right);
}

function compareByRecent(left, right, recentDocuments) {
  const leftTime = Date.parse(recentDocuments[left.filePath] || "") || 0;
  const rightTime = Date.parse(recentDocuments[right.filePath] || "") || 0;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return compareByUpdatedAt(left, right);
}

export function filterAndSortLibraryDocuments({
  documents,
  searchText,
  selectedTag,
  untaggedFilter,
  recentDocuments,
  sortKey,
}) {
  const keyword = normalizeSearchText(searchText);
  const filteredDocuments = (Array.isArray(documents) ? documents : []).filter((documentItem) => {
    const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];
    const matchesTag =
      !selectedTag || (selectedTag === untaggedFilter ? !tags.length : tags.includes(selectedTag));

    if (!matchesTag) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [documentItem.title, documentItem.relativePath, tags.join(" ")].join(" ").toLocaleLowerCase();
    return haystack.includes(keyword);
  });

  const comparator =
    sortKey === "title"
      ? compareByTitle
      : sortKey === "updatedAt"
        ? compareByUpdatedAt
        : (left, right) => compareByRecent(left, right, recentDocuments || {});

  return filteredDocuments.sort(comparator);
}
