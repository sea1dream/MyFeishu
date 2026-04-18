const api = window.flowDocApi;

const CODE_LANGUAGES = [
  { value: "auto", label: "自动识别" },
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "HTML / XML" },
  { value: "css", label: "CSS" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
];

const HISTORY_LIMIT = 180;
const HISTORY_PERSIST_LIMIT = 60;
const HISTORY_INPUT_DELAY = 160;
const CODE_COPY_FEEDBACK_DELAY = 1800;
const BLOCK_HANDLE_WIDTH = 42;
const BLOCK_HANDLE_HEIGHT = 42;
const BLOCK_HANDLE_GAP = 10;

const state = {
  currentDocument: null,
  saveTimer: null,
  historyTimer: null,
  titleSyncTimer: null,
  toastTimer: null,
  savedSelection: null,
  lastSavedHtml: "",
  uiFrame: null,
  titleSyncPromise: null,
  history: {
    entries: [],
    index: -1,
    isRestoring: false,
  },
  selectedSpecialNodeId: null,
  selectAllScope: null,
};

const refs = {
  newDocButton: document.getElementById("newDocButton"),
  openDocButton: document.getElementById("openDocButton"),
  saveDocButton: document.getElementById("saveDocButton"),
  editorSurface: document.getElementById("editorSurface"),
  editor: document.getElementById("editor"),
  emptyState: document.getElementById("emptyState"),
  statusText: document.getElementById("statusText"),
  docName: document.getElementById("docName"),
  docPath: document.getElementById("docPath"),
  selectionBubble: document.getElementById("selectionBubble"),
  blockHandle: document.getElementById("blockHandle"),
  blockHandleButton: document.getElementById("blockHandleButton"),
  insertMenu: document.getElementById("insertMenu"),
  toast: document.getElementById("toast"),
};

function setStatus(message, tone = "") {
  refs.statusText.textContent = message;
  refs.statusText.dataset.tone = tone;
}

function showToast(message, tone = "success", duration = 2600) {
  refs.toast.textContent = message;
  refs.toast.dataset.tone = tone;
  refs.toast.classList.remove("hidden");

  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    refs.toast.classList.add("hidden");
  }, duration);
}

function hideSelectionBubble() {
  refs.selectionBubble.classList.add("hidden");
}

function hideInsertMenu() {
  refs.insertMenu.classList.add("hidden");
}

function hideBlockHandle() {
  refs.blockHandle.classList.add("hidden");
  hideInsertMenu();
}

function updateAvailability() {
  const enabled = Boolean(state.currentDocument);
  refs.saveDocButton.disabled = !enabled;
  refs.editor.contentEditable = enabled ? "true" : "false";

  if (!enabled) {
    hideSelectionBubble();
    hideBlockHandle();
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toDisplayName(filePath) {
  return filePath.split(/[\\/]/u).pop() || filePath;
}

function getDocumentTitleFromPath(filePath) {
  const displayName = toDisplayName(filePath || "");
  return displayName.replace(/\.[^.]+$/u, "") || "未命名文档";
}

function normalizeDocumentTitle(value) {
  const normalized = normalizeCodeText(value || "").replace(/\s+/gu, " ").trim();
  return normalized || "未命名文档";
}

function updateDocumentMeta(filePath, title = getDocumentTitleFromPath(filePath)) {
  if (!state.currentDocument) {
    state.currentDocument = { filePath, title };
  } else {
    state.currentDocument.filePath = filePath;
    state.currentDocument.title = title;
  }

  refs.docName.textContent = title;
  refs.docPath.textContent = filePath;
  document.title = `${title} - FlowDoc`;
}

function normalizeCodeText(text) {
  return String(text || "").replaceAll("\r\n", "\n").replaceAll("\u00a0", " ");
}

function isEmptyText(text) {
  return normalizeCodeText(text).replaceAll("\u200b", "").trim().length === 0;
}

function generateNodeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nodeToElement(node) {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function getSelection() {
  return window.getSelection();
}

function getSelectionRange() {
  const selection = getSelection();
  return selection && selection.rangeCount ? selection.getRangeAt(0) : null;
}

function isSpecialBlock(node) {
  return Boolean(
    node &&
      node.nodeType === Node.ELEMENT_NODE &&
      node.matches(".image-node, .attachment-node, .code-block-node"),
  );
}

function isGapParagraph(node) {
  return Boolean(node && node.nodeType === Node.ELEMENT_NODE && node.matches("p.editor-gap"));
}

function isParagraphLike(node) {
  return Boolean(
    node &&
      node.nodeType === Node.ELEMENT_NODE &&
      node.matches("p, h1, h2, h3, blockquote, li"),
  );
}

function getBlockText(node) {
  return normalizeCodeText(node?.innerText || node?.textContent || "");
}

function paragraphHasContent(node) {
  return !isEmptyText(getBlockText(node));
}

function isRangeInsideEditor(range) {
  return Boolean(range && refs.editor.contains(nodeToElement(range.commonAncestorContainer)));
}

function isRangeInsideCodeEditor(range) {
  return Boolean(nodeToElement(range?.commonAncestorContainer)?.closest(".code-block-editor"));
}

function getTopLevelNode(node) {
  let current = nodeToElement(node);

  while (current && current.parentElement !== refs.editor) {
    current = current.parentElement;
  }

  return current && current.parentElement === refs.editor ? current : null;
}

function getEditablePlainText(element) {
  return normalizeCodeText(element?.innerText || element?.textContent || "");
}

function getSelectionTextOffset(root) {
  const selection = getSelection();

  if (!selection.rangeCount) {
    return 0;
  }

  const range = selection.getRangeAt(0);

  if (!root.contains(range.endContainer)) {
    return getEditablePlainText(root).length;
  }

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(root);
  beforeRange.setEnd(range.endContainer, range.endOffset);
  return beforeRange.toString().length;
}

function setSelectionTextOffset(root, offset) {
  const selection = getSelection();
  const range = document.createRange();
  let remaining = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    if (remaining <= current.textContent.length) {
      range.setStart(current, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    remaining -= current.textContent.length;
    current = walker.nextNode();
  }

  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getNodePath(node, root = refs.editor) {
  const path = [];
  let current = node;

  while (current && current !== root) {
    const parent = current.parentNode;

    if (!parent) {
      return null;
    }

    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return current === root ? path : null;
}

function resolveNodePath(path, root = refs.editor) {
  let current = root;

  for (const index of path) {
    if (!current?.childNodes || index < 0 || index >= current.childNodes.length) {
      return null;
    }

    current = current.childNodes[index];
  }

  return current;
}

function createSelectionBookmark(range = getSelectionRange()) {
  if (!range || !isRangeInsideEditor(range)) {
    return null;
  }

  const startPath = getNodePath(range.startContainer);
  const endPath = getNodePath(range.endContainer);

  if (!startPath || !endPath) {
    return null;
  }

  return {
    collapsed: range.collapsed,
    startPath,
    startOffset: range.startOffset,
    endPath,
    endOffset: range.endOffset,
  };
}

function applySelectionBookmark(bookmark) {
  if (!bookmark) {
    return false;
  }

  const startNode = resolveNodePath(bookmark.startPath);
  const endNode = resolveNodePath(bookmark.endPath);

  if (!startNode || !endNode) {
    return false;
  }

  const selection = getSelection();
  const range = document.createRange();

  try {
    range.setStart(startNode, Math.min(bookmark.startOffset, startNode.length ?? startNode.childNodes.length));
    range.setEnd(endNode, Math.min(bookmark.endOffset, endNode.length ?? endNode.childNodes.length));
  } catch (_error) {
    return false;
  }

  const focusTarget = nodeToElement(range.startContainer)?.closest(".code-block-editor") || refs.editor;
  focusTarget.focus();
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function createEndSelectionBookmark() {
  const range = document.createRange();
  range.selectNodeContents(refs.editor);
  range.collapse(false);
  return createSelectionBookmark(range);
}

function saveSelection() {
  const bookmark = createSelectionBookmark();

  if (bookmark) {
    state.savedSelection = bookmark;
  }
}

function restoreSelection() {
  if (state.savedSelection && applySelectionBookmark(state.savedSelection)) {
    return getSelectionRange();
  }

  refs.editor.focus();
  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(refs.editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
  return range;
}

function clearSelectAllScope() {
  state.selectAllScope = null;
}

function selectNodeContents(target, focusTarget = target) {
  if (!target) {
    return null;
  }

  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(target);
  focusTarget?.focus?.();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
  return range;
}

function isSelectionExactlyNodeContents(target) {
  const range = getSelectionRange();

  if (!range || !target) {
    return false;
  }

  if (range.commonAncestorContainer !== target && !target.contains(range.commonAncestorContainer)) {
    return false;
  }

  const fullRange = document.createRange();
  fullRange.selectNodeContents(target);

  return (
    range.compareBoundaryPoints(Range.START_TO_START, fullRange) === 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, fullRange) === 0
  );
}

function syncSelectAllScope() {
  if (!state.selectAllScope) {
    return;
  }

  if (state.selectAllScope === "document") {
    if (!isSelectionExactlyNodeContents(refs.editor)) {
      clearSelectAllScope();
    }

    return;
  }

  if (!state.selectAllScope.startsWith("code:")) {
    clearSelectAllScope();
    return;
  }

  const nodeId = state.selectAllScope.slice("code:".length);
  const codeEditor = refs.editor
    .querySelector(`[data-node-id="${nodeId}"]`)
    ?.querySelector(".code-block-editor");

  if (!codeEditor || !isSelectionExactlyNodeContents(codeEditor)) {
    clearSelectAllScope();
  }
}

function handleSelectAllShortcut(codeEditor = null) {
  if (!state.currentDocument) {
    return false;
  }

  if (codeEditor) {
    const codeBlock = codeEditor.closest(".code-block-node");
    ensureNodeId(codeBlock, "code");
    const scope = `code:${codeBlock.dataset.nodeId}`;

    if (state.selectAllScope === scope && isSelectionExactlyNodeContents(codeEditor)) {
      selectNodeContents(refs.editor, refs.editor);
      state.selectAllScope = "document";
    } else {
      selectNodeContents(codeEditor, codeEditor);
      state.selectAllScope = scope;
    }

    scheduleUiRefresh();
    return true;
  }

  const range = getSelectionRange();

  if (!range || !isRangeInsideEditor(range)) {
    return false;
  }

  selectNodeContents(refs.editor, refs.editor);
  state.selectAllScope = "document";
  scheduleUiRefresh();
  return true;
}

function getPrimaryTitleNode() {
  return [...refs.editor.children].find((node) => node.tagName === "H1") || refs.editor.querySelector("h1");
}

function setNodeTextPreservingCaret(node, text) {
  if (!node) {
    return;
  }

  const selection = getSelection();
  const isActive = document.activeElement === node;
  const containsSelection =
    isActive && selection?.rangeCount && node.contains(selection.getRangeAt(0).commonAncestorContainer);
  const caretOffset = containsSelection ? getSelectionTextOffset(node) : null;

  node.textContent = text;

  if (containsSelection) {
    node.focus();
    setSelectionTextOffset(node, Math.min(caretOffset, text.length));
    saveSelection();
  }
}

function ensureDocumentTitleHeading(title = state.currentDocument?.title) {
  if (!state.currentDocument) {
    return null;
  }

  const normalizedTitle = normalizeDocumentTitle(title);
  let titleNode = getPrimaryTitleNode();

  if (!titleNode) {
    titleNode = document.createElement("h1");
    titleNode.textContent = normalizedTitle;
    refs.editor.prepend(titleNode);
    return titleNode;
  }

  if (normalizeDocumentTitle(getBlockText(titleNode)) !== normalizedTitle) {
    setNodeTextPreservingCaret(titleNode, normalizedTitle);
  }

  return titleNode;
}

function ensureDocumentTitleHeadingExists() {
  let titleNode = getPrimaryTitleNode();

  if (titleNode) {
    return titleNode;
  }

  titleNode = document.createElement("h1");
  titleNode.textContent = normalizeDocumentTitle(state.currentDocument?.title);
  refs.editor.prepend(titleNode);
  return titleNode;
}

async function refreshDocumentPathFromDisk() {
  if (!state.currentDocument) {
    return false;
  }

  const result = await api.refreshDocumentPath({
    filePath: state.currentDocument.filePath,
    lastSavedHtml: state.lastSavedHtml,
  });

  if (!result.exists || !result.changed) {
    return false;
  }

  updateDocumentMeta(result.filePath, result.title);
  ensureDocumentTitleHeading(result.title);
  saveSelection();
  scheduleUiRefresh();
  return true;
}

async function syncDocumentTitleNow() {
  if (!state.currentDocument) {
    return false;
  }

  const titleNode = ensureDocumentTitleHeadingExists();
  const desiredTitle = normalizeDocumentTitle(getBlockText(titleNode));
  const previousPath = state.currentDocument.filePath;
  const currentPathTitle = getDocumentTitleFromPath(state.currentDocument.filePath);
  let changed = false;

  const renameResult = await api.renameDocument({
    filePath: previousPath,
    title: desiredTitle,
  });

  updateDocumentMeta(renameResult.filePath, renameResult.title);

  if (renameResult.title !== desiredTitle) {
    setNodeTextPreservingCaret(titleNode, renameResult.title);
    changed = true;
  }

  return changed || renameResult.title !== currentPathTitle || renameResult.filePath !== previousPath;
}

function scheduleDocumentTitleSync() {
  if (!state.currentDocument) {
    return;
  }

  window.clearTimeout(state.titleSyncTimer);
  state.titleSyncTimer = window.setTimeout(() => {
    flushDocumentTitleSync().catch((error) => {
      reportError("标题同步失败", error);
    });
  }, 260);
}

async function flushDocumentTitleSync() {
  window.clearTimeout(state.titleSyncTimer);

  if (state.titleSyncPromise) {
    return state.titleSyncPromise;
  }

  state.titleSyncPromise = syncDocumentTitleNow().finally(() => {
    state.titleSyncPromise = null;
  });

  return state.titleSyncPromise;
}

function placeCaretInside(target, { start = true } = {}) {
  if (!target) {
    return;
  }

  const editableTarget = target.matches?.(".code-block-node")
    ? target.querySelector(".code-block-editor")
    : target;

  const selection = getSelection();
  const range = document.createRange();
  range.selectNodeContents(editableTarget);
  range.collapse(start);

  editableTarget.focus?.();
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
}

function moveCaretAfterNode(node) {
  const selection = getSelection();
  const range = document.createRange();

  if (node.nodeType === Node.ELEMENT_NODE) {
    range.selectNodeContents(node);
    range.collapse(false);
  } else {
    range.setStartAfter(node);
    range.collapse(true);
  }

  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
}

function scheduleUiRefresh() {
  window.cancelAnimationFrame(state.uiFrame);
  state.uiFrame = window.requestAnimationFrame(refreshFloatingControls);
}

function buildCodeLanguageOptions(selectedValue) {
  return CODE_LANGUAGES.map(
    ({ value, label }) =>
      `<option value="${value}"${selectedValue === value ? " selected" : ""}>${label}</option>`,
  ).join("");
}

function buildGapMarkup() {
  return `<p class="editor-gap" data-gap="true" data-node-id="${generateNodeId("gap")}"><br></p>`;
}

function buildImageMarkup(file) {
  const safeName = escapeHtml(file.name);
  const safePath = escapeHtml(file.relativePath);

  return `
    <figure class="resource-card image-node" data-kind="image" data-src="${safePath}" data-name="${safeName}" data-node-id="${generateNodeId("image")}" contenteditable="false">
      <img alt="${safeName}" />
      <div class="resource-placeholder" hidden></div>
    </figure>
    ${buildGapMarkup()}
  `;
}

function buildAttachmentMarkup(file) {
  const safeName = escapeHtml(file.name);
  const safePath = escapeHtml(file.relativePath);

  return `
    <div class="resource-card attachment-node" data-kind="attachment" data-src="${safePath}" data-name="${safeName}" data-node-id="${generateNodeId("attachment")}" contenteditable="false">
      <div class="attachment-head">
        <button class="attachment-icon" type="button" data-action="download-attachment" title="复制到 Downloads">↓</button>
        <div class="attachment-copy">
          <strong>${safeName}</strong>
          <span>${safePath}</span>
        </div>
        <button class="attachment-download" type="button" data-action="download-attachment">下载到 Downloads</button>
      </div>
      <div class="resource-placeholder" hidden></div>
    </div>
    ${buildGapMarkup()}
  `;
}

function buildCodeBlockMarkup(codeText = "", language = "auto") {
  const safeCode = escapeHtml(codeText);
  const nodeId = generateNodeId("code");

  return {
    nodeId,
    html: `
      <div class="code-block-node" data-kind="code-block" data-language="${language}" data-node-id="${nodeId}" contenteditable="false">
        <div class="code-block-head">
          <span>代码块</span>
          <div class="code-block-actions">
            <button class="code-copy-button" type="button" data-action="copy-code">Copy</button>
            <select class="code-language-select">${buildCodeLanguageOptions(language)}</select>
          </div>
        </div>
        <pre class="code-block-frame"><code class="code-block-editor hljs" contenteditable="true" spellcheck="false">${safeCode}</code></pre>
      </div>
      ${buildGapMarkup()}
    `,
  };
}

function insertHtmlAtSelection(html) {
  const range = restoreSelection();
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const nodes = [...template.content.childNodes];

  range.insertNode(template.content);

  if (nodes.length > 0) {
    moveCaretAfterNode(nodes[nodes.length - 1]);
  }

  return nodes;
}

function focusCodeBlockById(nodeId) {
  const block = refs.editor.querySelector(`.code-block-node[data-node-id="${nodeId}"]`);
  const codeEditor = block?.querySelector(".code-block-editor");

  if (!codeEditor) {
    return;
  }

  codeEditor.focus();
  setSelectionTextOffset(codeEditor, getEditablePlainText(codeEditor).length);
  saveSelection();
}

function createGapElement() {
  const template = document.createElement("template");
  template.innerHTML = buildGapMarkup();
  return template.content.firstElementChild;
}

function ensureNodeId(node, prefix) {
  if (!node.dataset.nodeId) {
    node.dataset.nodeId = generateNodeId(prefix);
  }
}

function markAsGap(node) {
  if (!node || node.tagName !== "P") {
    return node;
  }

  node.classList.add("editor-gap");
  node.dataset.gap = "true";
  ensureNodeId(node, "gap");

  if (!paragraphHasContent(node)) {
    node.innerHTML = "<br>";
  }

  return node;
}

function unmarkGap(node) {
  if (!node || node.tagName !== "P") {
    return;
  }

  node.classList.remove("editor-gap");
  node.removeAttribute("data-gap");
  node.removeAttribute("data-gap-active");

  if (!paragraphHasContent(node)) {
    node.innerHTML = "<br>";
  }
}

function activateGapParagraph(node) {
  const gap = markAsGap(node);
  gap.dataset.gapActive = "true";
  clearSpecialSelection();
  placeCaretInside(gap, { start: true });
  scheduleUiRefresh();
}

function collapseTransientGaps(except = null) {
  refs.editor.querySelectorAll("p.editor-gap[data-gap-active='true']").forEach((gap) => {
    if (gap === except) {
      return;
    }

    if (paragraphHasContent(gap)) {
      unmarkGap(gap);
      return;
    }

    gap.removeAttribute("data-gap-active");
    gap.innerHTML = "<br>";
  });
}

function promoteGapParagraphIfNeeded(node) {
  if (!isGapParagraph(node)) {
    return;
  }

  if (paragraphHasContent(node)) {
    unmarkGap(node);
  }
}

function migrateLegacyCodeBlocks() {
  const legacyBlocks = [...refs.editor.querySelectorAll("pre")].filter(
    (node) => !node.closest(".code-block-node"),
  );

  legacyBlocks.forEach((node) => {
    const legacyCode = normalizeCodeText(node.innerText || node.textContent || "");
    const fragment = document.createElement("template");
    fragment.innerHTML = buildCodeBlockMarkup(legacyCode).html.trim();
    node.replaceWith(...fragment.content.childNodes);
  });
}

function normalizeSpecialBlockLayout() {
  [...refs.editor.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && isEmptyText(node.textContent)) {
      node.remove();
    }
  });

  refs.editor.querySelectorAll(".image-node figcaption").forEach((caption) => {
    caption.remove();
  });

  [...refs.editor.children].forEach((node) => {
    if (isSpecialBlock(node)) {
      ensureNodeId(node, node.dataset.kind || "block");
      node.setAttribute("contenteditable", "false");
      node.tabIndex = -1;
    }

    if (isGapParagraph(node)) {
      markAsGap(node);
    }
  });

  let cursor = refs.editor.firstElementChild;

  while (cursor) {
    const next = cursor.nextElementSibling;

    if (isSpecialBlock(cursor)) {
      if (!next) {
        refs.editor.append(createGapElement());
      } else if (isSpecialBlock(next)) {
        next.before(createGapElement());
      } else if (next.tagName === "P" && !paragraphHasContent(next)) {
        markAsGap(next);
      }
    }

    cursor = cursor.nextElementSibling;
  }

  let previousEmptyGap = null;

  [...refs.editor.children].forEach((node) => {
    if (!isGapParagraph(node)) {
      previousEmptyGap = null;
      return;
    }

    if (paragraphHasContent(node)) {
      unmarkGap(node);
      previousEmptyGap = null;
      return;
    }

    const prev = node.previousElementSibling;
    const next = node.nextElementSibling;
    const shouldKeep = isSpecialBlock(prev) || isSpecialBlock(next);

    if (!shouldKeep) {
      node.remove();
      return;
    }

    node.innerHTML = "<br>";

    if (previousEmptyGap) {
      node.remove();
      return;
    }

    previousEmptyGap = node;
  });
}

function renderCodeBlock(block, desiredCaretOffset = null) {
  const codeElement = block.querySelector(".code-block-editor");
  const languageSelect = block.querySelector(".code-language-select");

  if (!codeElement || !languageSelect) {
    return;
  }

  const rawText = getEditablePlainText(codeElement);
  const language = languageSelect.value || block.dataset.language || "auto";
  block.dataset.language = language;
  codeElement.classList.add("hljs");

  if (!rawText) {
    codeElement.textContent = "";

    if (desiredCaretOffset !== null) {
      setSelectionTextOffset(codeElement, 0);
    }

    return;
  }

  const highlighted = api.highlightCode({ code: rawText, language });
  codeElement.innerHTML = highlighted.html;

  if (desiredCaretOffset !== null) {
    setSelectionTextOffset(codeElement, desiredCaretOffset);
  }
}

function setCopyButtonFeedback(button, label, tone = "") {
  if (!button) {
    return;
  }

  const previousTimerId = Number(button.dataset.resetTimerId || 0);

  if (previousTimerId) {
    window.clearTimeout(previousTimerId);
  }

  button.textContent = label;

  if (tone) {
    button.dataset.state = tone;
  } else {
    delete button.dataset.state;
  }

  const timerId = window.setTimeout(() => {
    button.textContent = "Copy";
    delete button.dataset.state;
    delete button.dataset.resetTimerId;
  }, CODE_COPY_FEEDBACK_DELAY);

  button.dataset.resetTimerId = String(timerId);
}

async function copyCodeBlock(button) {
  const block = button?.closest(".code-block-node");
  const codeEditor = block?.querySelector(".code-block-editor");

  if (!block || !codeEditor) {
    return;
  }

  const codeText = getEditablePlainText(codeEditor);

  if (!codeText) {
    setCopyButtonFeedback(button, "Empty", "idle");
    showToast("Code block is empty", "error", 1800);
    return;
  }

  if (typeof api.copyText === "function") {
    api.copyText(codeText);
  } else if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(codeText);
  } else {
    throw new Error("Clipboard write is not supported in this environment.");
  }

  setCopyButtonFeedback(button, "Copied", "success");
  showToast("Code copied to clipboard", "success", 1800);
}

function normalizeEditor() {
  migrateLegacyCodeBlocks();
  normalizeSpecialBlockLayout();

  refs.editor.querySelectorAll(".image-node, .attachment-node, .code-block-node").forEach((node) => {
    node.setAttribute("contenteditable", "false");
  });

  refs.editor.querySelectorAll(".code-block-node").forEach((block) => {
    const codeElement = block.querySelector(".code-block-editor");
    const languageSelect = block.querySelector(".code-language-select");

    if (codeElement) {
      codeElement.setAttribute("contenteditable", "true");
      codeElement.setAttribute("spellcheck", "false");
    }

    if (languageSelect && !languageSelect.value) {
      languageSelect.value = block.dataset.language || "auto";
    }

    renderCodeBlock(block);
  });

  if (!refs.editor.innerHTML.trim()) {
    refs.editor.innerHTML = "<p><br></p>";
  }
}

function clearSpecialSelection() {
  refs.editor.querySelectorAll(".is-selected-block").forEach((node) => {
    node.classList.remove("is-selected-block");
  });

  state.selectedSpecialNodeId = null;
}

function getSelectedSpecialBlock() {
  if (!state.selectedSpecialNodeId) {
    return null;
  }

  return refs.editor.querySelector(`[data-node-id="${state.selectedSpecialNodeId}"]`);
}

function selectSpecialBlock(block) {
  ensureNodeId(block, block.dataset.kind || "block");
  clearSpecialSelection();
  collapseTransientGaps();
  block.classList.add("is-selected-block");
  state.selectedSpecialNodeId = block.dataset.nodeId;
  hideSelectionBubble();
  hideBlockHandle();
}

function serializeDocument() {
  const clone = refs.editor.cloneNode(true);

  clone.querySelectorAll(".is-selected-block").forEach((node) => {
    node.classList.remove("is-selected-block");
  });

  clone.querySelectorAll(".image-node img").forEach((image) => {
    image.removeAttribute("src");
  });

  clone.querySelectorAll(".image-node figcaption").forEach((caption) => {
    caption.remove();
  });

  clone.querySelectorAll(".resource-placeholder").forEach((placeholder) => {
    placeholder.hidden = true;
    placeholder.textContent = "";
  });

  clone.querySelectorAll("p.editor-gap").forEach((gap) => {
    gap.removeAttribute("data-gap-active");

    if (!paragraphHasContent(gap)) {
      gap.innerHTML = "<br>";
    }
  });

  clone.querySelectorAll(".code-block-node .code-block-editor").forEach((codeElement) => {
    codeElement.textContent = getEditablePlainText(codeElement);
  });

  return clone.innerHTML;
}

function getHistoryStorageKey() {
  return state.currentDocument ? `flowdoc-history:${state.currentDocument.filePath}` : null;
}

function persistHistoryState() {
  const key = getHistoryStorageKey();

  if (!key) {
    return;
  }

  try {
    const entries = state.history.entries.slice(-HISTORY_PERSIST_LIMIT);
    const indexOffset = Math.max(0, state.history.entries.length - entries.length);
    const payload = {
      version: 1,
      index: Math.max(0, state.history.index - indexOffset),
      entries,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function initializeHistoryState(currentHtml) {
  const fallbackEntry = {
    html: currentHtml,
    bookmark: createEndSelectionBookmark(),
  };

  let entries = [fallbackEntry];

  try {
    const raw = localStorage.getItem(getHistoryStorageKey());

    if (raw) {
      const payload = JSON.parse(raw);
      const persistedEntries = Array.isArray(payload?.entries)
        ? payload.entries.filter(
            (entry) => entry && typeof entry.html === "string" && typeof entry.bookmark === "object",
          )
        : [];

      if (persistedEntries.length > 0) {
        entries = persistedEntries.slice(-HISTORY_LIMIT);
      }
    }
  } catch (_error) {
    entries = [fallbackEntry];
  }

  const latestEntry = entries[entries.length - 1];

  if (!latestEntry || latestEntry.html !== currentHtml) {
    entries.push(fallbackEntry);
  }

  if (entries.length > HISTORY_LIMIT) {
    entries = entries.slice(-HISTORY_LIMIT);
  }

  state.history = {
    entries,
    index: entries.length - 1,
    isRestoring: false,
  };

  persistHistoryState();
}

function createHistoryEntry(html = serializeDocument()) {
  return {
    html,
    bookmark: createSelectionBookmark() || state.savedSelection || createEndSelectionBookmark(),
  };
}

function captureHistoryNow({ force = false } = {}) {
  if (!state.currentDocument || state.history.isRestoring) {
    return false;
  }

  const entry = createHistoryEntry();
  const current = state.history.entries[state.history.index];

  if (!force && current && current.html === entry.html) {
    current.bookmark = entry.bookmark;
    persistHistoryState();
    return false;
  }

  state.history.entries = state.history.entries.slice(0, state.history.index + 1);
  state.history.entries.push(entry);

  if (state.history.entries.length > HISTORY_LIMIT) {
    const overflow = state.history.entries.length - HISTORY_LIMIT;
    state.history.entries.splice(0, overflow);
  }

  state.history.index = state.history.entries.length - 1;
  persistHistoryState();
  return true;
}

function scheduleHistoryCapture() {
  window.clearTimeout(state.historyTimer);
  state.historyTimer = window.setTimeout(() => {
    captureHistoryNow();
  }, HISTORY_INPUT_DELAY);
}

function flushPendingHistoryCapture() {
  window.clearTimeout(state.historyTimer);
  captureHistoryNow();
}

async function restoreHistoryEntry(index) {
  if (index < 0 || index >= state.history.entries.length) {
    return false;
  }

  clearSpecialSelection();
  collapseTransientGaps();
  state.history.isRestoring = true;

  const entry = state.history.entries[index];
  refs.editor.innerHTML = entry.html || "<p><br></p>";
  normalizeEditor();
  const titleNode = ensureDocumentTitleHeading(getBlockText(getPrimaryTitleNode()) || state.currentDocument?.title);
  await refreshEmbeddedResources();

  state.history.index = index;
  state.history.isRestoring = false;

  if (!applySelectionBookmark(entry.bookmark)) {
    placeCaretInside(refs.editor.lastElementChild || refs.editor, { start: false });
  }

  if (titleNode) {
    const liveTitle = normalizeDocumentTitle(getBlockText(titleNode));
    refs.docName.textContent = liveTitle;
    document.title = `${liveTitle} - FlowDoc`;
  }

  saveSelection();
  scheduleDocumentTitleSync();
  scheduleUiRefresh();
  scheduleAutosave();
  persistHistoryState();
  return true;
}

async function undoHistory() {
  flushPendingHistoryCapture();

  if (state.history.index <= 0) {
    showToast("已经是最早的版本了", "error", 1600);
    return;
  }

  await restoreHistoryEntry(state.history.index - 1);
  setStatus("已撤销", "success");
}

async function redoHistory() {
  flushPendingHistoryCapture();

  if (state.history.index >= state.history.entries.length - 1) {
    showToast("已经是最新的版本了", "error", 1600);
    return;
  }

  await restoreHistoryEntry(state.history.index + 1);
  setStatus("已重做", "success");
}

async function saveDocument(reason = "自动保存完成", tone = "success", options = {}) {
  if (!state.currentDocument) {
    return false;
  }

  await refreshDocumentPathFromDisk();
  await flushDocumentTitleSync();
  const html = serializeDocument();
  const forceSave = options.force === true;

  if (!forceSave && html === state.lastSavedHtml) {
    return false;
  }

  await api.saveDocument({
    filePath: state.currentDocument.filePath,
    html,
  });

  state.lastSavedHtml = html;
  setStatus(reason, tone);

  if (options.toast) {
    showToast(reason, tone);
  }

  return true;
}

function scheduleAutosave() {
  if (!state.currentDocument) {
    return;
  }

  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    saveDocument().catch((error) => {
      const message = `自动保存失败：${error.message}`;
      setStatus(message, "error");
      showToast(message, "error", 3200);
    });
  }, 700);
}

async function refreshImageNode(node) {
  const relativePath = node.dataset.src;
  const placeholder = node.querySelector(".resource-placeholder");
  const image = node.querySelector("img");

  if (!relativePath || !state.currentDocument) {
    return;
  }

  const resolved = await api.resolveResource({
    docPath: state.currentDocument.filePath,
    relativePath,
  });

  if (resolved.exists) {
    node.classList.remove("missing");
    placeholder.hidden = true;
    image.hidden = false;
    image.src = resolved.fileUrl;
    image.alt = node.dataset.name || resolved.name;
    return;
  }

  node.classList.add("missing");
  image.hidden = true;
  image.removeAttribute("src");
  placeholder.hidden = false;
  placeholder.textContent = `图片资源缺失：${relativePath}`;
}

async function refreshAttachmentNode(node) {
  const relativePath = node.dataset.src;
  const placeholder = node.querySelector(".resource-placeholder");
  const buttons = node.querySelectorAll("[data-action='download-attachment']");

  if (!relativePath || !state.currentDocument) {
    return;
  }

  const resolved = await api.resolveResource({
    docPath: state.currentDocument.filePath,
    relativePath,
  });

  if (resolved.exists) {
    node.classList.remove("missing");
    placeholder.hidden = true;
    buttons.forEach((button) => {
      button.disabled = false;
    });
    return;
  }

  node.classList.add("missing");
  placeholder.hidden = false;
  placeholder.textContent = `附件资源缺失：${relativePath}`;
  buttons.forEach((button) => {
    button.disabled = true;
  });
}

async function refreshEmbeddedResources() {
  const imageNodes = [...refs.editor.querySelectorAll(".image-node")];
  const attachmentNodes = [...refs.editor.querySelectorAll(".attachment-node")];

  await Promise.all([
    ...imageNodes.map((node) => refreshImageNode(node)),
    ...attachmentNodes.map((node) => refreshAttachmentNode(node)),
  ]);
}

function resetDocumentUi() {
  window.clearTimeout(state.titleSyncTimer);
  state.titleSyncPromise = null;
  state.savedSelection = null;
  clearSpecialSelection();
  hideSelectionBubble();
  hideBlockHandle();
}

async function mountDocument(documentPayload, successMessage) {
  const loadedHtml = documentPayload.html || "<h1>未命名文档</h1><p><br></p>";
  updateDocumentMeta(
    documentPayload.filePath,
    documentPayload.title || getDocumentTitleFromPath(documentPayload.filePath),
  );

  refs.docName.textContent = documentPayload.title || toDisplayName(documentPayload.filePath);
  refs.docPath.textContent = documentPayload.filePath;
  refs.editor.innerHTML = documentPayload.html || "<h1>未命名文档</h1><p><br></p>";
  refs.emptyState.classList.add("hidden");
  refs.editorSurface.classList.remove("hidden");
  refs.editor.innerHTML = loadedHtml;

  resetDocumentUi();
  normalizeEditor();
  ensureDocumentTitleHeading(state.currentDocument.title);
  await refreshEmbeddedResources();

  const serializedHtml = serializeDocument();
  state.lastSavedHtml = loadedHtml;
  initializeHistoryState(serializedHtml);
  updateAvailability();
  setStatus(successMessage, "success");
  showToast(successMessage, "success", 1800);

  placeCaretInside(refs.editor.lastElementChild || refs.editor, { start: false });
  saveSelection();
  scheduleUiRefresh();

  if (serializedHtml !== loadedHtml) {
    scheduleAutosave();
  } else {
    state.lastSavedHtml = serializedHtml;
  }
}

function getActiveBlock(range = getSelectionRange()) {
  if (!range || !isRangeInsideEditor(range)) {
    return null;
  }

  const codeEditor = nodeToElement(range.startContainer)?.closest(".code-block-editor");

  if (codeEditor) {
    return codeEditor.closest(".code-block-node");
  }

  return getTopLevelNode(range.startContainer) || refs.editor.lastElementChild || null;
}

function copyRect(rect, overrides = {}) {
  if (!rect) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    ...overrides,
  };
}

function getRectFromRange(range) {
  if (!range) {
    return null;
  }

  const rects = [...range.getClientRects()].filter((rect) => rect.width || rect.height);

  if (rects.length) {
    return copyRect(rects[rects.length - 1]);
  }

  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? copyRect(rect) : null;
}

function getLineHeight(element) {
  const target = nodeToElement(element);

  if (!target) {
    return 26;
  }

  const computed = window.getComputedStyle(target);
  const explicitLineHeight = Number.parseFloat(computed.lineHeight);

  if (Number.isFinite(explicitLineHeight)) {
    return explicitLineHeight;
  }

  const fontSize = Number.parseFloat(computed.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.6 : 26;
}

function createVirtualCaretRect(left, top, height) {
  return {
    left,
    top,
    right: left,
    bottom: top + height,
    width: 0,
    height,
  };
}

function getElementStartCaretRect(element) {
  const target = nodeToElement(element);

  if (!target) {
    return null;
  }

  const rect = target.getBoundingClientRect();

  if (!rect.width && !rect.height) {
    return null;
  }

  const computed = window.getComputedStyle(target);
  const lineHeight = getLineHeight(target);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
  const effectiveHeight = rect.height || lineHeight;

  return createVirtualCaretRect(
    rect.left + paddingLeft + borderLeft,
    rect.top + Math.max(0, (effectiveHeight - lineHeight) / 2),
    lineHeight,
  );
}

function getTextCaretRect(textNode, offset) {
  const textContent = textNode.textContent || "";

  if (!textContent.length) {
    return null;
  }

  const measureRange = document.createRange();

  if (offset < textContent.length) {
    measureRange.setStart(textNode, offset);
    measureRange.setEnd(textNode, offset + 1);
    const rect = getRectFromRange(measureRange);

    if (rect) {
      return createVirtualCaretRect(rect.left, rect.top, rect.height || getLineHeight(textNode.parentElement));
    }
  }

  if (offset > 0) {
    measureRange.setStart(textNode, offset - 1);
    measureRange.setEnd(textNode, offset);
    const rect = getRectFromRange(measureRange);

    if (rect) {
      return createVirtualCaretRect(rect.right, rect.top, rect.height || getLineHeight(textNode.parentElement));
    }
  }

  return null;
}

function getNodeEdgeCaretRect(node, edge = "before") {
  if (!node) {
    return null;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length || 0;
    return getTextCaretRect(node, edge === "before" ? 0 : length);
  }

  const element = nodeToElement(node);
  const rect = element?.getBoundingClientRect();

  if (!rect || (!rect.width && !rect.height)) {
    return null;
  }

  return createVirtualCaretRect(
    edge === "before" ? rect.left : rect.right,
    rect.top,
    rect.height || getLineHeight(element),
  );
}

function getElementCaretRect(container, offset) {
  if (container === refs.editor) {
    return getElementStartCaretRect(getActiveBlock()) || getElementStartCaretRect(refs.editor);
  }

  const afterNode = container.childNodes[offset] || null;
  const beforeNode = offset > 0 ? container.childNodes[offset - 1] : null;

  return (
    getNodeEdgeCaretRect(afterNode, "before") ||
    getNodeEdgeCaretRect(beforeNode, "after") ||
    getElementStartCaretRect(container)
  );
}

function measureCaretRectWithMarker(range) {
  if (!range?.collapsed || !isRangeInsideEditor(range)) {
    return null;
  }

  const selection = getSelection();
  const preservedRange = range.cloneRange();
  const markerRange = range.cloneRange();
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  marker.setAttribute("aria-hidden", "true");
  marker.style.display = "inline-block";
  marker.style.width = "0";
  marker.style.padding = "0";
  marker.style.margin = "0";
  marker.style.border = "0";
  marker.style.overflow = "hidden";
  marker.style.pointerEvents = "none";
  marker.style.userSelect = "none";
  marker.style.lineHeight = "1";

  markerRange.collapse(true);
  markerRange.insertNode(marker);

  const rect = marker.getBoundingClientRect();
  const markerParent = nodeToElement(marker.parentNode) || getActiveBlock(range) || refs.editor;

  marker.remove();
  markerParent.normalize?.();

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(preservedRange);
  }

  if (!rect.width && !rect.height) {
    return null;
  }

  return createVirtualCaretRect(rect.left, rect.top, rect.height || getLineHeight(markerParent));
}

function getCaretRect(range) {
  const markerRect = measureCaretRectWithMarker(range);

  if (markerRect) {
    return markerRect;
  }

  const directRect = getRectFromRange(range);

  if (directRect) {
    return directRect;
  }

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    return (
      getTextCaretRect(range.startContainer, range.startOffset) ||
      getElementStartCaretRect(range.startContainer.parentElement) ||
      getElementStartCaretRect(getActiveBlock(range))
    );
  }

  if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    return (
      getElementCaretRect(range.startContainer, range.startOffset) ||
      getElementStartCaretRect(getActiveBlock(range))
    );
  }

  return getElementStartCaretRect(getActiveBlock(range));
}

function toOverlayRect(rect) {
  if (!rect || !refs.editorSurface) {
    return null;
  }

  const surfaceRect = refs.editorSurface.getBoundingClientRect();
  const offsetLeft = surfaceRect.left + refs.editorSurface.clientLeft;
  const offsetTop = surfaceRect.top + refs.editorSurface.clientTop;

  return {
    left: rect.left - offsetLeft,
    top: rect.top - offsetTop,
    right: rect.right - offsetLeft,
    bottom: rect.bottom - offsetTop,
    width: rect.width,
    height: rect.height,
  };
}

function positionSelectionBubble(range) {
  const viewportRect = range.getBoundingClientRect();

  if (!viewportRect.width && !viewportRect.height) {
    hideSelectionBubble();
    return;
  }

  const rect = toOverlayRect(viewportRect);

  if (!rect) {
    hideSelectionBubble();
    return;
  }

  refs.selectionBubble.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
  refs.selectionBubble.style.top = `${Math.max(16, Math.round(rect.top - 14))}px`;
  refs.selectionBubble.classList.remove("hidden");
}

function positionBlockHandle(range) {
  const caretRect = getCaretRect(range);

  if (!caretRect) {
    hideBlockHandle();
    return;
  }

  const rect = toOverlayRect(caretRect);

  if (!rect) {
    hideBlockHandle();
    return;
  }

  refs.blockHandle.style.left = `${Math.max(12, Math.round(rect.left - BLOCK_HANDLE_WIDTH - BLOCK_HANDLE_GAP))}px`;
  refs.blockHandle.style.top = `${Math.max(12, Math.round(rect.top + rect.height / 2 - BLOCK_HANDLE_HEIGHT / 2))}px`;
  refs.blockHandle.classList.remove("hidden");
}

function refreshFloatingControls() {
  if (!state.currentDocument || getSelectedSpecialBlock()) {
    hideSelectionBubble();
    hideBlockHandle();
    return;
  }

  const range = getSelectionRange();

  if (!range || !isRangeInsideEditor(range)) {
    hideSelectionBubble();
    hideBlockHandle();
    return;
  }

  const selection = getSelection();

  if (!selection.isCollapsed && !isRangeInsideCodeEditor(range)) {
    positionSelectionBubble(range);
    hideBlockHandle();
    return;
  }

  hideSelectionBubble();
  positionBlockHandle(range);
}

function rememberSelectionIfNeeded() {
  const range = getSelectionRange();
  const currentGap = nodeToElement(range?.startContainer)?.closest("p.editor-gap");

  collapseTransientGaps(currentGap || null);
  syncSelectAllScope();

  if (range && isRangeInsideEditor(range)) {
    clearSpecialSelection();
    saveSelection();
  }

  scheduleUiRefresh();
}

function applyBlock(tagName) {
  restoreSelection();
  document.execCommand("formatBlock", false, `<${tagName}>`);
  normalizeEditor();
  saveSelection();
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
}

function applyInlineCommand(command) {
  restoreSelection();
  document.execCommand(command, false);
  saveSelection();
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
}

function insertCodeBlock(codeText = "") {
  const { nodeId, html } = buildCodeBlockMarkup(codeText);
  clearSpecialSelection();
  collapseTransientGaps();
  insertHtmlAtSelection(html);
  normalizeEditor();
  focusCodeBlockById(nodeId);
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
}

async function insertImageFiles(files) {
  if (!files.length) {
    return;
  }

  clearSpecialSelection();
  collapseTransientGaps();
  restoreSelection();

  files.forEach((file) => {
    insertHtmlAtSelection(buildImageMarkup(file));
  });

  normalizeEditor();
  await refreshEmbeddedResources();
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
}

async function insertAttachmentFiles(files) {
  if (!files.length) {
    return;
  }

  clearSpecialSelection();
  collapseTransientGaps();
  restoreSelection();

  files.forEach((file) => {
    insertHtmlAtSelection(buildAttachmentMarkup(file));
  });

  normalizeEditor();
  await refreshEmbeddedResources();
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
}

async function handleCreateDocument() {
  setStatus("正在选择新文档位置...");
  const result = await api.createDocument();

  if (result.canceled) {
    setStatus("已取消新建文档");
    return;
  }

  await mountDocument(result.document, "新文档已创建");
}

async function handleOpenDocument() {
  setStatus("正在打开文档...");
  const result = await api.openDocument();

  if (result.canceled) {
    setStatus("已取消打开文档");
    return;
  }

  await mountDocument(result.document, "文档已打开");
}

function prepareInsertionPointFromCaret() {
  const activeBlock = getActiveBlock(restoreSelection());

  if (!activeBlock) {
    return;
  }

  if ((activeBlock.tagName === "P" || isGapParagraph(activeBlock)) && !paragraphHasContent(activeBlock)) {
    const selection = getSelection();
    const range = document.createRange();
    range.selectNode(activeBlock);
    selection.removeAllRanges();
    selection.addRange(range);
    state.savedSelection = createSelectionBookmark(range);
    return;
  }

  const selection = getSelection();
  const range = document.createRange();
  range.setStartAfter(activeBlock);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  state.savedSelection = createSelectionBookmark(range);
}

async function handleInsertImages(source = "selection") {
  if (!state.currentDocument) {
    return;
  }

  if (source === "block") {
    prepareInsertionPointFromCaret();
  } else {
    saveSelection();
  }

  const result = await api.insertImages(state.currentDocument.filePath);

  if (result.canceled) {
    return;
  }

  await insertImageFiles(result.files);
  showToast(`已插入 ${result.files.length} 张图片`);
}

async function handleInsertAttachments(source = "selection") {
  if (!state.currentDocument) {
    return;
  }

  if (source === "block") {
    prepareInsertionPointFromCaret();
  } else {
    saveSelection();
  }

  const result = await api.insertAttachments(state.currentDocument.filePath);

  if (result.canceled) {
    return;
  }

  await insertAttachmentFiles(result.files);
  showToast(`已插入 ${result.files.length} 个附件`);
}

function insertPlainTextAtCursor(text) {
  const selection = getSelection();

  if (!selection.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("无法读取剪贴板图片。"));
    reader.readAsDataURL(blob);
  });
}

async function handlePaste(event) {
  if (!state.currentDocument || !event.clipboardData) {
    return;
  }

  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    event.preventDefault();
    const plainText = event.clipboardData.getData("text/plain");
    insertPlainTextAtCursor(plainText);
    const caretOffset = getSelectionTextOffset(codeEditor);
    renderCodeBlock(codeEditor.closest(".code-block-node"), caretOffset);
    saveSelection();
    scheduleHistoryCapture();
    scheduleAutosave();
    scheduleUiRefresh();
    return;
  }

  const items = [...event.clipboardData.items];
  const imageItem = items.find((item) => item.type.startsWith("image/"));

  if (!imageItem) {
    return;
  }

  event.preventDefault();
  saveSelection();

  const imageFile = imageItem.getAsFile();

  if (!imageFile) {
    return;
  }

  const dataUrl = await blobToDataUrl(imageFile);
  const suggestedName = imageFile.name || `pasted-image-${Date.now()}.png`;
  const saved = await api.savePastedImage({
    docPath: state.currentDocument.filePath,
    dataUrl,
    suggestedName,
  });

  await insertImageFiles([saved]);
  showToast("剪贴板图片已插入");
}

async function handleAttachmentDownload(button) {
  const node = button.closest(".attachment-node");

  if (!node || !state.currentDocument || node.classList.contains("missing")) {
    return;
  }

  const result = await api.downloadAttachment({
    docPath: state.currentDocument.filePath,
    relativePath: node.dataset.src,
  });

  showToast(`附件已复制到 ${result.savedPath}`, "success", 2600);
}

function reportError(prefix, error) {
  const message = `${prefix}：${error.message}`;
  setStatus(message, "error");
  showToast(message, "error", 3200);
}

function isCaretAtBoundary(container, range, boundary) {
  const comparison = range.cloneRange();
  comparison.selectNodeContents(container);

  if (boundary === "start") {
    comparison.setEnd(range.startContainer, range.startOffset);
  } else {
    comparison.setStart(range.endContainer, range.endOffset);
  }

  return comparison.toString().length === 0;
}

function findAdjacentSpecialBlock(referenceBlock, direction) {
  let current =
    direction === "backward" ? referenceBlock.previousElementSibling : referenceBlock.nextElementSibling;

  while (current && isGapParagraph(current) && !paragraphHasContent(current)) {
    current = direction === "backward" ? current.previousElementSibling : current.nextElementSibling;
  }

  return isSpecialBlock(current) ? current : null;
}

function queryNodeById(nodeId) {
  return nodeId ? refs.editor.querySelector(`[data-node-id="${nodeId}"]`) : null;
}

function removeSpecialBlock(block) {
  if (!block) {
    return;
  }

  const previousId = block.previousElementSibling?.dataset?.nodeId || null;
  const nextId = block.nextElementSibling?.dataset?.nodeId || null;

  clearSpecialSelection();

  const previous = block.previousElementSibling;
  const next = block.nextElementSibling;

  block.remove();

  if (isGapParagraph(previous) && !paragraphHasContent(previous)) {
    previous.remove();
  }

  if (isGapParagraph(next) && !paragraphHasContent(next)) {
    next.remove();
  }

  normalizeEditor();

  const nextCandidate = queryNodeById(nextId);
  const previousCandidate = queryNodeById(previousId);
  const focusCandidate = nextCandidate || previousCandidate || refs.editor.lastElementChild;

  if (focusCandidate) {
    if (isGapParagraph(focusCandidate)) {
      activateGapParagraph(focusCandidate);
    } else if (isSpecialBlock(focusCandidate)) {
      const surroundingGap =
        (isGapParagraph(focusCandidate.nextElementSibling) && focusCandidate.nextElementSibling) ||
        (isGapParagraph(focusCandidate.previousElementSibling) && focusCandidate.previousElementSibling);

      if (surroundingGap) {
        activateGapParagraph(surroundingGap);
      } else {
        placeCaretInside(focusCandidate, { start: false });
      }
    } else {
      placeCaretInside(focusCandidate, { start: true });
    }
  }

  saveSelection();
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
}

function handleDeletionKey(event) {
  if (!state.currentDocument || !["Backspace", "Delete"].includes(event.key)) {
    return false;
  }

  const selectedSpecial = getSelectedSpecialBlock();

  if (selectedSpecial) {
    event.preventDefault();
    removeSpecialBlock(selectedSpecial);
    return true;
  }

  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    const codeBlock = codeEditor.closest(".code-block-node");
    const codeText = getEditablePlainText(codeEditor);

    if (isEmptyText(codeText)) {
      event.preventDefault();
      removeSpecialBlock(codeBlock);
      return true;
    }

    return false;
  }

  const range = getSelectionRange();

  if (!range || !range.collapsed || !isRangeInsideEditor(range)) {
    return false;
  }

  const activeBlock = getActiveBlock(range);

  if (!activeBlock) {
    return false;
  }

  if (event.key === "Backspace" && isCaretAtBoundary(activeBlock, range, "start")) {
    const previousSpecial = findAdjacentSpecialBlock(activeBlock, "backward");

    if (previousSpecial) {
      event.preventDefault();
      removeSpecialBlock(previousSpecial);
      return true;
    }
  }

  if (event.key === "Delete" && isCaretAtBoundary(activeBlock, range, "end")) {
    const nextSpecial = findAdjacentSpecialBlock(activeBlock, "forward");

    if (nextSpecial) {
      event.preventDefault();
      removeSpecialBlock(nextSpecial);
      return true;
    }
  }

  return false;
}

refs.newDocButton.addEventListener("click", () => {
  handleCreateDocument().catch((error) => {
    reportError("新建失败", error);
  });
});

refs.openDocButton.addEventListener("click", () => {
  handleOpenDocument().catch((error) => {
    reportError("打开失败", error);
  });
});

refs.saveDocButton.addEventListener("click", () => {
  saveDocument("文档已保存", "success", { force: true, toast: true }).catch((error) => {
    reportError("保存失败", error);
  });
});

refs.selectionBubble.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) {
    event.preventDefault();
  }
});

refs.selectionBubble.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button || !state.currentDocument) {
    return;
  }

  const command = button.dataset.command;
  const block = button.dataset.block;
  const special = button.dataset.special;

  if (command) {
    applyInlineCommand(command);
    return;
  }

  if (block) {
    applyBlock(block);
    return;
  }

  if (special === "code-block") {
    restoreSelection();
    const selectedText = getSelection().toString();
    insertCodeBlock(selectedText);
  }
});

refs.blockHandle.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) {
    event.preventDefault();
  }
});

refs.blockHandleButton.addEventListener("click", () => {
  if (!state.currentDocument) {
    return;
  }

  refs.insertMenu.classList.toggle("hidden");
});

refs.insertMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button || !state.currentDocument) {
    return;
  }

  hideInsertMenu();

  const action = button.dataset.insert;

  if (action === "image") {
    handleInsertImages("block").catch((error) => {
      reportError("插入图片失败", error);
    });
    return;
  }

  if (action === "attachment") {
    handleInsertAttachments("block").catch((error) => {
      reportError("上传附件失败", error);
    });
    return;
  }

  if (action === "code-block") {
    prepareInsertionPointFromCaret();
    insertCodeBlock();
    return;
  }

  if (action === "quote") {
    prepareInsertionPointFromCaret();
    insertHtmlAtSelection("<blockquote>引用内容</blockquote>");
    normalizeEditor();
    captureHistoryNow();
    scheduleAutosave();
    scheduleUiRefresh();
  }
});

refs.editor.addEventListener("mousedown", (event) => {
  clearSelectAllScope();

  const attachmentAction = event.target.closest("[data-action='download-attachment']");

  if (attachmentAction) {
    return;
  }

  const copyAction = event.target.closest("[data-action='copy-code']");

  if (copyAction) {
    clearSpecialSelection();
    collapseTransientGaps();
    return;
  }

  const languageSelect = event.target.closest(".code-language-select");

  if (languageSelect) {
    clearSpecialSelection();
    collapseTransientGaps();
    return;
  }

  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    clearSpecialSelection();
    collapseTransientGaps();
    return;
  }

  const gap = event.target.closest("p.editor-gap");

  if (gap) {
    event.preventDefault();
    activateGapParagraph(gap);
    return;
  }

  const specialBlock = event.target.closest(".image-node, .attachment-node, .code-block-node");

  if (specialBlock) {
    event.preventDefault();
    selectSpecialBlock(specialBlock);
    return;
  }

  clearSpecialSelection();
  collapseTransientGaps();
});

refs.editor.addEventListener("input", (event) => {
  clearSelectAllScope();

  const titleNode = event.target.closest("h1");
  const codeEditor = event.target.closest(".code-block-editor");

  if (codeEditor) {
    const caretOffset = getSelectionTextOffset(codeEditor);
    renderCodeBlock(codeEditor.closest(".code-block-node"), caretOffset);
    saveSelection();
    scheduleHistoryCapture();
    scheduleAutosave();
    scheduleUiRefresh();
    return;
  }

  const activeGap = event.target.closest("p.editor-gap");

  if (activeGap) {
    promoteGapParagraphIfNeeded(activeGap);
  }

  clearSpecialSelection();
  saveSelection();

  if (titleNode && titleNode === getPrimaryTitleNode()) {
    const liveTitle = normalizeDocumentTitle(getBlockText(titleNode));
    refs.docName.textContent = liveTitle;
    document.title = `${liveTitle} - FlowDoc`;
    scheduleDocumentTitleSync();
  }

  scheduleHistoryCapture();
  scheduleAutosave();
  scheduleUiRefresh();
});

refs.editor.addEventListener("paste", (event) => {
  handlePaste(event).catch((error) => {
    reportError("粘贴失败", error);
  });
});

refs.editor.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const withModifier = event.ctrlKey || event.metaKey;
  const codeEditor = event.target.closest(".code-block-editor");

  if (withModifier && key === "a") {
    if (handleSelectAllShortcut(codeEditor)) {
      event.preventDefault();
      return;
    }
  } else if (!["Control", "Meta", "Shift", "Alt"].includes(event.key)) {
    clearSelectAllScope();
  }

  if (handleDeletionKey(event)) {
    return;
  }

  if (codeEditor && event.key === "Tab") {
    event.preventDefault();
    insertPlainTextAtCursor("  ");
    const caretOffset = getSelectionTextOffset(codeEditor);
    renderCodeBlock(codeEditor.closest(".code-block-node"), caretOffset);
    saveSelection();
    scheduleHistoryCapture();
    scheduleAutosave();
    scheduleUiRefresh();
  }
});

refs.editor.addEventListener("click", (event) => {
  const downloadButton = event.target.closest("[data-action='download-attachment']");

  if (downloadButton) {
    handleAttachmentDownload(downloadButton).catch((error) => {
      reportError("下载附件失败", error);
    });
    return;
  }

  const copyButton = event.target.closest("[data-action='copy-code']");

  if (copyButton) {
    copyCodeBlock(copyButton).catch((error) => {
      reportError("Copy code failed", error);
    });
    return;
  }

  rememberSelectionIfNeeded();
});

refs.editor.addEventListener("change", (event) => {
  const languageSelect = event.target.closest(".code-language-select");

  if (!languageSelect) {
    return;
  }

  const block = languageSelect.closest(".code-block-node");
  block.dataset.language = languageSelect.value;
  renderCodeBlock(block);
  saveSelection();
  captureHistoryNow();
  scheduleAutosave();
  scheduleUiRefresh();
});

refs.editor.addEventListener("focusout", (event) => {
  const titleNode = event.target.closest("h1");

  if (titleNode && titleNode === getPrimaryTitleNode()) {
    flushDocumentTitleSync().catch((error) => {
      reportError("标题同步失败", error);
    });
  }
});

refs.editor.addEventListener("focusin", rememberSelectionIfNeeded);
refs.editor.addEventListener("mouseup", rememberSelectionIfNeeded);
refs.editor.addEventListener("keyup", rememberSelectionIfNeeded);
document.addEventListener("selectionchange", rememberSelectionIfNeeded);

document.addEventListener("mousedown", (event) => {
  if (!event.target.closest("#blockHandle")) {
    hideInsertMenu();
  }

  if (!event.target.closest(".editor-gap, #blockHandle, #selectionBubble")) {
    collapseTransientGaps();
  }

  if (!event.target.closest(".image-node, .attachment-node, .code-block-node")) {
    clearSpecialSelection();
  }
});

window.addEventListener("resize", scheduleUiRefresh);
window.addEventListener("scroll", scheduleUiRefresh, true);
window.addEventListener("focus", () => {
  refreshDocumentPathFromDisk().catch((error) => {
    reportError("文档路径同步失败", error);
  });
});

document.addEventListener("keydown", (event) => {
  if (!state.currentDocument) {
    return;
  }

  if (["Backspace", "Delete"].includes(event.key)) {
    const selectedSpecial = getSelectedSpecialBlock();

    if (selectedSpecial) {
      event.preventDefault();
      removeSpecialBlock(selectedSpecial);
      return;
    }
  }

  const key = event.key.toLowerCase();
  const withModifier = event.ctrlKey || event.metaKey;

  if (withModifier && key === "s") {
    event.preventDefault();
    saveDocument("文档已保存", "success", { force: true, toast: true }).catch((error) => {
      reportError("保存失败", error);
    });
    return;
  }

  if (withModifier && key === "z" && !event.shiftKey) {
    event.preventDefault();
    undoHistory().catch((error) => {
      reportError("撤销失败", error);
    });
    return;
  }

  if ((withModifier && key === "y") || (withModifier && event.shiftKey && key === "z")) {
    event.preventDefault();
    redoHistory().catch((error) => {
      reportError("重做失败", error);
    });
  }
});

updateAvailability();
