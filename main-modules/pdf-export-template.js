"use strict";

const { normalizeDocumentTitle } = require("../shared/document-format");

function buildPdfExportStyles(highlightThemeCss = "", fontFaceCss = "", fontFamilies = {}) {
  const bodyFamily =
    fontFamilies.bodyFamily || '"Atkinson Hyperlegible Next", "Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif';
  const displayFamily = fontFamilies.displayFamily || bodyFamily;
  const codeFamily =
    fontFamilies.codeFamily || '"Google Sans Code", "Cascadia Code", "Consolas", monospace';

  return `
    ${fontFaceCss}

    :root {
      color-scheme: light;
      --paper: #fffdf8;
      --ink: #251a11;
      --ink-soft: #705746;
      --line: rgba(72, 48, 31, 0.14);
      --accent: #b65a3a;
      --accent-soft: rgba(182, 90, 58, 0.12);
      --code-bg: #1f2530;
      --code-border: rgba(32, 40, 58, 0.68);
      --code-copy: rgba(245, 239, 231, 0.86);
      --font-editor-body: ${bodyFamily};
      --font-editor-display: ${displayFamily};
      --font-code: ${codeFamily};
    }

    @page {
      size: A4;
      margin: 15mm 13mm 17mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      background: #ffffff;
      color: var(--ink);
      font-family: var(--font-editor-body);
      font-variant-ligatures: none;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .export-shell {
      width: 100%;
      padding: 0;
    }

    .export-document > *:first-child {
      margin-top: 0;
    }

    .export-document > *:last-child {
      margin-bottom: 0;
    }

    p,
    li,
    blockquote {
      font-family: var(--font-editor-body);
      font-size: 11pt;
      line-height: 1.9;
    }

    h1,
    h2,
    h3 {
      margin-top: 1.35em;
      margin-bottom: 0.55em;
      font-family: var(--font-editor-display);
      font-variant-ligatures: none;
      letter-spacing: 0.015em;
      line-height: 1.2;
      color: #24180f;
      page-break-after: avoid;
      break-after: avoid;
    }

    h1 {
      font-size: 24pt;
    }

    h2 {
      font-size: 19pt;
    }

    h3 {
      font-size: 15pt;
    }

    ul,
    ol {
      padding-left: 1.55em;
    }

    blockquote {
      margin: 1.2em 0;
      padding: 0.55em 1.1em;
      border-left: 4px solid #d48b69;
      color: #5f4d3f;
      background: rgba(182, 90, 58, 0.06);
      border-radius: 0 12px 12px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    a {
      color: #8f4328;
      text-decoration: underline;
      text-decoration-color: rgba(143, 67, 40, 0.38);
      text-underline-offset: 0.14em;
    }

    code:not(.code-block-editor) {
      display: inline;
      padding: 0.14em 0.44em;
      border-radius: 8px;
      border: 1px solid rgba(143, 67, 40, 0.14);
      background: rgba(47, 31, 20, 0.08);
      color: #8f4328;
      font-family: var(--font-code);
      font-size: 0.94em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    .image-node,
    .attachment-node,
    .video-embed-node {
      margin: 1.25em 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .image-node img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
      border-radius: 18px;
      box-shadow: 0 10px 26px rgba(72, 48, 31, 0.12);
    }

    .export-missing-note {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px dashed rgba(182, 90, 58, 0.32);
      background: rgba(182, 90, 58, 0.06);
      color: #7a523c;
    }

    .attachment-export-card,
    .video-export-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: linear-gradient(135deg, #fffaf3, #fff4e6);
      box-shadow: 0 10px 24px rgba(72, 48, 31, 0.08);
    }

    .attachment-export-card.is-missing,
    .video-export-card.is-missing {
      border-style: dashed;
      background: rgba(182, 90, 58, 0.06);
    }

    .attachment-export-icon,
    .video-export-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 54px;
      height: 54px;
      padding: 0;
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      border: 1px solid rgba(72, 48, 31, 0.14);
    }

    .attachment-export-badge {
      position: relative;
      display: grid;
      grid-template-rows: 1fr auto;
      align-items: center;
      justify-items: center;
      width: 100%;
      height: 100%;
      padding: 7px 6px 6px;
      border-radius: 16px;
      color: #fffdf9;
      text-transform: uppercase;
      background: linear-gradient(160deg, #8f6e58, #5d4636);
    }

    .attachment-export-badge::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 14px;
      height: 14px;
      border-bottom-left-radius: 8px;
      background: rgba(255, 255, 255, 0.28);
    }

    .attachment-export-glyph {
      font-size: 10pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .attachment-export-label {
      font-size: 6.2pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .attachment-export-badge--pdf { background: linear-gradient(160deg, #e5534b, #a02c25); }
    .attachment-export-badge--python { background: linear-gradient(160deg, #4b7db8, #d0a940); }
    .attachment-export-badge--markdown { background: linear-gradient(160deg, #465266, #222c3a); }
    .attachment-export-badge--text { background: linear-gradient(160deg, #5d8fd9, #355f9f); }
    .attachment-export-badge--document { background: linear-gradient(160deg, #3f79d3, #2852a0); }
    .attachment-export-badge--sheet { background: linear-gradient(160deg, #2fa565, #1f6f45); }
    .attachment-export-badge--slides { background: linear-gradient(160deg, #f08a34, #c86319); }
    .attachment-export-badge--archive { background: linear-gradient(160deg, #8a68d8, #5d3ca9); }
    .attachment-export-badge--executable { background: linear-gradient(160deg, #705c4d, #372c25); }
    .attachment-export-badge--image { background: linear-gradient(160deg, #32a6a6, #1f6e74); }
    .attachment-export-badge--video { background: linear-gradient(160deg, #c95ab2, #8a3b7a); }
    .attachment-export-badge--audio { background: linear-gradient(160deg, #ef7c58, #bd5130); }
    .attachment-export-badge--data { background: linear-gradient(160deg, #4fa0b5, #346c86); }
    .attachment-export-badge--code { background: linear-gradient(160deg, #5d76c8, #394f94); }
    .attachment-export-badge--generic { background: linear-gradient(160deg, #8f6e58, #5d4636); }

    .attachment-export-copy,
    .video-export-copy {
      min-width: 0;
    }

    .attachment-export-copy strong,
    .attachment-export-copy span,
    .video-export-copy strong,
    .video-export-copy span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .attachment-export-copy span,
    .video-export-copy span {
      margin-top: 4px;
      color: var(--ink-soft);
      font-size: 9.5pt;
    }

    .code-block-node {
      margin: 1.35em 0;
      border-radius: 18px;
      overflow: visible !important;
      border: 1px solid var(--code-border);
      background: var(--code-bg);
      box-shadow: 0 14px 30px rgba(28, 20, 16, 0.12);
      break-inside: auto;
      page-break-inside: auto;
    }

    .code-block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--code-copy);
    }

    .code-block-head span {
      font-size: 9.5pt;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .code-block-frame {
      margin: 0;
      padding: 16px 18px;
      overflow: visible !important;
      background: transparent;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      break-inside: auto;
      page-break-inside: auto;
    }

    .code-block-editor {
      display: block;
      margin: 0;
      padding: 0 !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      background: transparent !important;
      color: #f5ede4;
      font-family: var(--font-code);
      font-variant-ligatures: normal;
      font-feature-settings: "calt" 1, "liga" 1;
      font-size: 9.5pt;
      line-height: 1.72;
    }

    .code-block-editor.hljs {
      display: block;
      overflow: visible !important;
      padding: 0 !important;
      background: transparent !important;
    }

    .editor-gap,
    .resource-placeholder,
    .attachment-actions,
    .attachment-preview,
    .attachment-download,
    .code-copy-button,
    .code-language-select {
      display: none !important;
    }

    ${highlightThemeCss}

    .hljs {
      background: transparent !important;
    }
  `;
}

function buildPdfExportHtml({ title, html, resources, highlightThemeCss, fontFaceCss = "", fontFamilies = {} }) {
  const exportPayload = JSON.stringify({
    title: normalizeDocumentTitle(title),
    html: String(html || ""),
    resources: resources || {},
  })
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FlowDoc PDF Export</title>
    <style>${buildPdfExportStyles(highlightThemeCss, fontFaceCss, fontFamilies)}</style>
  </head>
  <body>
    <div class="export-shell">
      <main id="exportDocument" class="export-document"></main>
    </div>
    <script id="exportPayload" type="application/json">${exportPayload}</script>
    <script>
      const payload = JSON.parse(document.getElementById("exportPayload")?.textContent || "{}");

      function escapeHtml(value) {
        return String(value || "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function normalizeCodeText(value) {
        return String(value || "").replaceAll("\\r\\n", "\\n").replaceAll("\\u00a0", " ");
      }

      function normalizeExternalUrl(value) {
        const raw = normalizeCodeText(value || "").trim();

        if (!raw) {
          return "";
        }

        const candidate =
          /^(https?:\\/\\/|mailto:|tel:)/iu.test(raw) ? raw : /^www\\./iu.test(raw) ? \`https://\${raw}\` : "";

        if (!candidate) {
          return "";
        }

        try {
          const url = new URL(candidate);
          return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.toString() : "";
        } catch (_error) {
          return "";
        }
      }

      function getResource(resourcePath) {
        const normalized = String(resourcePath || "").split("\\\\").join("/").trim();
        return payload.resources?.[normalized] || { exists: false, fileUrl: "", name: "" };
      }

      function getAttachmentIconLabel(fileName) {
        const baseName = String(fileName || "").split(/[\\\\/]/u).pop() || "";
        const parts = baseName.split(".");
        const extension = parts.length > 1 ? parts.pop().toUpperCase() : "";
        return (extension || "FILE").slice(0, 5);
      }

      function getAttachmentIconMeta(fileName) {
        const baseName = String(fileName || "").split(/[\\\\/]/u).pop() || "";
        const parts = baseName.split(".");
        const extension = parts.length > 1 ? "." + parts.pop().toLowerCase() : "";
        const upperExtension = extension.replace(".", "").toUpperCase() || "FILE";
        const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"]);
        const markdownExtensions = new Set([".md", ".markdown"]);
        const textExtensions = new Set([".txt", ".text", ".log"]);
        const pdfExtensions = new Set([".pdf"]);
        const videoExtensions = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
        const audioExtensions = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);
        const documentExtensions = new Set([".doc", ".docx", ".rtf", ".odt", ".wps"]);
        const sheetExtensions = new Set([".xls", ".xlsx", ".csv", ".tsv", ".ods"]);
        const slidesExtensions = new Set([".ppt", ".pptx", ".odp", ".key"]);
        const archiveExtensions = new Set([".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bz2", ".xz"]);
        const executableExtensions = new Set([".exe", ".msi", ".bat", ".cmd", ".ps1", ".apk", ".appimage"]);
        const dataExtensions = new Set([".json", ".yaml", ".yml", ".toml", ".xml", ".ini", ".cfg"]);
        const pythonExtensions = new Set([".py", ".pyw", ".ipynb"]);
        const codeExtensions = new Set([
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".cjs",
          ".mjs",
          ".css",
          ".html",
          ".htm",
          ".java",
          ".go",
          ".rs",
          ".php",
          ".sh",
          ".sql",
          ".c",
          ".cpp",
          ".h",
        ]);

        if (pdfExtensions.has(extension)) {
          return { category: "pdf", glyph: "A", label: "PDF" };
        }

        if (pythonExtensions.has(extension)) {
          return { category: "python", glyph: "Py", label: "PY" };
        }

        if (markdownExtensions.has(extension)) {
          return { category: "markdown", glyph: "#", label: "MD" };
        }

        if (textExtensions.has(extension)) {
          return { category: "text", glyph: "T", label: "TXT" };
        }

        if (documentExtensions.has(extension)) {
          return { category: "document", glyph: "W", label: "DOC" };
        }

        if (sheetExtensions.has(extension)) {
          return { category: "sheet", glyph: "X", label: "XLS" };
        }

        if (slidesExtensions.has(extension)) {
          return { category: "slides", glyph: "P", label: "PPT" };
        }

        if (archiveExtensions.has(extension)) {
          return { category: "archive", glyph: "Z", label: "ZIP" };
        }

        if (executableExtensions.has(extension)) {
          return { category: "executable", glyph: "!", label: "EXE" };
        }

        if (imageExtensions.has(extension)) {
          return { category: "image", glyph: "I", label: "IMG" };
        }

        if (videoExtensions.has(extension)) {
          return { category: "video", glyph: "V", label: "VID" };
        }

        if (audioExtensions.has(extension)) {
          return { category: "audio", glyph: "A", label: "AUD" };
        }

        if (dataExtensions.has(extension)) {
          return { category: "data", glyph: "{}", label: upperExtension.slice(0, 4) };
        }

        if (codeExtensions.has(extension)) {
          return { category: "code", glyph: "<>", label: upperExtension.slice(0, 4) };
        }

        return { category: "generic", glyph: "F", label: getAttachmentIconLabel(fileName) };
      }

      function buildAttachmentIconMarkup(fileName) {
        const meta = getAttachmentIconMeta(fileName);
        return \`
          <div class="attachment-export-badge attachment-export-badge--\${escapeHtml(meta.category)}">
            <span class="attachment-export-glyph">\${escapeHtml(meta.glyph)}</span>
            <span class="attachment-export-label">\${escapeHtml(meta.label)}</span>
          </div>
        \`;
      }

      function sanitizeExportFragment(root) {
        root
          .querySelectorAll(
            [
              "script",
              "style",
              "link",
              "meta",
              "base",
              "iframe",
              "embed",
              "object",
              "applet",
              "frame",
              "frameset",
              "form",
              "input",
              "textarea",
              "select",
              "option",
              "button",
              "audio",
              "video",
              "source",
              "track",
              "svg",
              "math",
              "canvas",
            ].join(", "),
          )
          .forEach((node) => {
            node.remove();
          });

        root.querySelectorAll("*").forEach((element) => {
          if (!element.parentNode) {
            return;
          }

          if (element.tagName?.toLowerCase() === "img" && !element.closest(".image-node")) {
            element.remove();
            return;
          }

          [...element.attributes].forEach((attribute) => {
            const attributeName = attribute.name.toLowerCase();
            const tagName = element.tagName.toLowerCase();

            if (
              attributeName.startsWith("on") ||
              ["style", "srcdoc", "ping", "nonce", "integrity", "contenteditable"].includes(attributeName)
            ) {
              element.removeAttribute(attribute.name);
              return;
            }

            if (attributeName === "href") {
              if (tagName === "a") {
                const safeHref = normalizeExternalUrl(attribute.value);

                if (safeHref) {
                  element.setAttribute("href", safeHref);
                } else {
                  element.removeAttribute(attribute.name);
                }
              } else {
                element.removeAttribute(attribute.name);
              }

              return;
            }

            if (attributeName === "src") {
              element.removeAttribute(attribute.name);
              return;
            }

            if (attributeName === "target") {
              if (tagName === "a") {
                element.setAttribute("target", "_blank");
              } else {
                element.removeAttribute(attribute.name);
              }

              return;
            }

            if (attributeName === "rel") {
              if (tagName === "a") {
                element.setAttribute("rel", "noopener noreferrer");
              } else {
                element.removeAttribute(attribute.name);
              }
            }
          });
        });
      }

      function waitForImages(root) {
        const images = [...root.querySelectorAll("img")];

        return Promise.all(
          images.map(
            (image) =>
              new Promise((resolve) => {
                if (image.complete) {
                  resolve();
                  return;
                }

                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              }),
          ),
        );
      }

      function renderAttachmentNode(node) {
        const resolved = getResource(node.dataset.src || "");
        const name = node.dataset.name || resolved.name || "附件";
        const missingClass = resolved.exists ? "" : " is-missing";
        node.innerHTML = \`
          <div class="attachment-export-card\${missingClass}">
            <div class="attachment-export-icon">\${buildAttachmentIconMarkup(name)}</div>
            <div class="attachment-export-copy">
              <strong>\${escapeHtml(name)}</strong>
              <span>\${resolved.exists ? "附件已导出为图标卡片" : "附件资源缺失"}</span>
            </div>
          </div>
        \`;
      }

      function renderVideoNode(node) {
        const provider = node.dataset.provider || "视频";
        const sourceUrl = node.dataset.sourceUrl || node.dataset.src || "";
        node.innerHTML = \`
          <div class="video-export-card">
            <div class="video-export-icon">VIDEO</div>
            <div class="video-export-copy">
              <strong>\${escapeHtml(provider)} 视频</strong>
              <span>\${escapeHtml(sourceUrl || "嵌入视频在 PDF 中导出为占位卡片")}</span>
            </div>
          </div>
        \`;
      }

      function renderCodeBlock(block) {
        const codeElement = block.querySelector(".code-block-editor");
        const rawText = normalizeCodeText(codeElement?.innerText || codeElement?.textContent || "");
        const language =
          block.dataset.language ||
          block.querySelector(".code-language-select")?.value ||
          "auto";
        const highlighted =
          window.flowDocPdfExport?.highlightCode?.({ code: rawText, language }) || {
            html: escapeHtml(rawText),
            detectedLanguage: language === "auto" ? "plaintext" : language,
          };
        const displayLanguage =
          highlighted.detectedLanguage && highlighted.detectedLanguage !== "plaintext"
            ? highlighted.detectedLanguage
            : language && language !== "auto"
              ? language
              : "code";

        block.innerHTML = \`
          <div class="code-block-head">
            <span>\${escapeHtml(displayLanguage)}</span>
          </div>
          <pre class="code-block-frame"><code class="code-block-editor hljs">\${highlighted.html}</code></pre>
        \`;
      }

      async function prepareExportDocument() {
        const root = document.getElementById("exportDocument");
        const template = document.createElement("template");
        template.innerHTML = payload.html || "";
        sanitizeExportFragment(template.content);
        root.replaceChildren(template.content);
        document.title = payload.title || "FlowDoc Export";

        root.querySelectorAll(".editor-gap").forEach((gap) => gap.remove());
        root.querySelectorAll(".resource-placeholder").forEach((node) => node.remove());
        root.querySelectorAll(".is-selected-block").forEach((node) => node.classList.remove("is-selected-block"));
        root.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));

        root.querySelectorAll(".image-node").forEach((node) => {
          const image = node.querySelector("img");
          const resolved = getResource(node.dataset.src || "");

          if (!image || !resolved.exists) {
            node.innerHTML = \`<div class="export-missing-note">图片资源缺失：\${escapeHtml(
              node.dataset.name || node.dataset.src || "未命名图片",
            )}</div>\`;
            return;
          }

          image.src = resolved.fileUrl;
          image.alt = node.dataset.name || image.alt || "";
        });

        root.querySelectorAll(".attachment-node").forEach((node) => {
          renderAttachmentNode(node);
        });

        root.querySelectorAll(".video-embed-node").forEach((node) => {
          renderVideoNode(node);
        });

        root.querySelectorAll(".code-block-node").forEach((block) => {
          renderCodeBlock(block);
        });

        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        await waitForImages(root);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        return true;
      }

      window.__waitForExportReady = () => prepareExportDocument();
    </script>
  </body>
</html>`;
}

module.exports = {
  buildPdfExportHtml,
  buildPdfExportStyles,
};
