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

    .attachment-export-art {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 10px;
      border-radius: 16px;
      background: linear-gradient(160deg, #f7efe6, #efe4d6);
    }

    .attachment-export-art img {
      display: block;
      width: 100%;
      height: 100%;
      max-width: 30px;
      max-height: 30px;
      object-fit: contain;
    }

    .attachment-export-art--pdf { background: linear-gradient(160deg, rgba(229, 83, 75, 0.16), rgba(160, 44, 37, 0.1)); }
    .attachment-export-art--document { background: linear-gradient(160deg, rgba(63, 121, 211, 0.16), rgba(40, 82, 160, 0.1)); }
    .attachment-export-art--docx { background: linear-gradient(160deg, rgba(63, 121, 211, 0.16), rgba(40, 82, 160, 0.1)); }
    .attachment-export-art--sheet { background: linear-gradient(160deg, rgba(47, 165, 101, 0.16), rgba(31, 111, 69, 0.1)); }
    .attachment-export-art--xlsx,
    .attachment-export-art--csv { background: linear-gradient(160deg, rgba(47, 165, 101, 0.16), rgba(31, 111, 69, 0.1)); }
    .attachment-export-art--slides { background: linear-gradient(160deg, rgba(240, 138, 52, 0.16), rgba(200, 99, 25, 0.1)); }
    .attachment-export-art--pptx { background: linear-gradient(160deg, rgba(240, 138, 52, 0.16), rgba(200, 99, 25, 0.1)); }
    .attachment-export-art--archive { background: linear-gradient(160deg, rgba(138, 104, 216, 0.16), rgba(93, 60, 169, 0.1)); }
    .attachment-export-art--python { background: linear-gradient(160deg, rgba(75, 125, 184, 0.16), rgba(208, 169, 64, 0.12)); }
    .attachment-export-art--javascript,
    .attachment-export-art--typescript,
    .attachment-export-art--java,
    .attachment-export-art--go,
    .attachment-export-art--rust,
    .attachment-export-art--php,
    .attachment-export-art--ruby,
    .attachment-export-art--kotlin,
    .attachment-export-art--swift,
    .attachment-export-art--scala,
    .attachment-export-art--dart,
    .attachment-export-art--lua,
    .attachment-export-art--perl,
    .attachment-export-art--powershell,
    .attachment-export-art--shell,
    .attachment-export-art--sql,
    .attachment-export-art--html,
    .attachment-export-art--css,
    .attachment-export-art--json,
    .attachment-export-art--xml,
    .attachment-export-art--yaml,
    .attachment-export-art--asm,
    .attachment-export-art--markdown,
    .attachment-export-art--text,
    .attachment-export-art--data,
    .attachment-export-art--code,
    .attachment-export-art--generic { background: linear-gradient(160deg, rgba(93, 118, 200, 0.14), rgba(57, 79, 148, 0.08)); }
    .attachment-export-art--image { background: linear-gradient(160deg, rgba(50, 166, 166, 0.16), rgba(31, 110, 116, 0.1)); }
    .attachment-export-art--png,
    .attachment-export-art--jpg { background: linear-gradient(160deg, rgba(50, 166, 166, 0.16), rgba(31, 110, 116, 0.1)); }
    .attachment-export-art--video { background: linear-gradient(160deg, rgba(201, 90, 178, 0.16), rgba(138, 59, 122, 0.1)); }
    .attachment-export-art--mp4 { background: linear-gradient(160deg, rgba(201, 90, 178, 0.16), rgba(138, 59, 122, 0.1)); }
    .attachment-export-art--audio { background: linear-gradient(160deg, rgba(239, 124, 88, 0.16), rgba(189, 81, 48, 0.1)); }
    .attachment-export-art--mp3 { background: linear-gradient(160deg, rgba(239, 124, 88, 0.16), rgba(189, 81, 48, 0.1)); }
    .attachment-export-art--executable { background: linear-gradient(160deg, rgba(112, 92, 77, 0.16), rgba(55, 44, 37, 0.1)); }
    .attachment-export-art--c,
    .attachment-export-art--cpp,
    .attachment-export-art--elf,
    .attachment-export-art--sharedlib,
    .attachment-export-art--ida,
    .attachment-export-art--object { background: linear-gradient(160deg, rgba(96, 113, 201, 0.16), rgba(57, 79, 148, 0.1)); }

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

function buildPdfExportHtml({ title, html, resources, iconAssets = {}, highlightThemeCss, fontFaceCss = "", fontFamilies = {} }) {
  const exportPayload = JSON.stringify({
    title: normalizeDocumentTitle(title),
    html: String(html || ""),
    resources: resources || {},
    iconAssets: iconAssets || {},
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
        const cExtensions = new Set([".c"]);
        const cppExtensions = new Set([".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp"]);
        const javascriptExtensions = new Set([".js", ".jsx", ".cjs", ".mjs"]);
        const typescriptExtensions = new Set([".ts", ".tsx"]);
        const htmlExtensions = new Set([".html", ".htm"]);
        const cssExtensions = new Set([".css"]);
        const jsonExtensions = new Set([".json"]);
        const xmlExtensions = new Set([".xml"]);
        const yamlExtensions = new Set([".yaml", ".yml"]);
        const javaExtensions = new Set([".java"]);
        const shellExtensions = new Set([".sh"]);
        const sqlExtensions = new Set([".sql"]);
        const goExtensions = new Set([".go"]);
        const rustExtensions = new Set([".rs"]);
        const phpExtensions = new Set([".php"]);
        const rubyExtensions = new Set([".rb"]);
        const kotlinExtensions = new Set([".kt"]);
        const swiftExtensions = new Set([".swift"]);
        const scalaExtensions = new Set([".scala"]);
        const dartExtensions = new Set([".dart"]);
        const luaExtensions = new Set([".lua"]);
        const perlExtensions = new Set([".pl"]);
        const powershellExtensions = new Set([".ps1"]);
        const csvExtensions = new Set([".csv", ".tsv"]);
        const pngExtensions = new Set([".png", ".webp", ".gif", ".bmp"]);
        const jpgExtensions = new Set([".jpg", ".jpeg", ".svg"]);
        const mp3Extensions = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac"]);
        const mp4Extensions = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
        const elfExtensions = new Set([".elf", ".out", ".bin"]);
        const sharedLibraryExtensions = new Set([".so", ".dll", ".dylib"]);
        const idaExtensions = new Set([".i64", ".idb"]);
        const objectExtensions = new Set([".o", ".a", ".lib"]);
        const asmExtensions = new Set([".asm", ".s"]);
        const codeExtensions = new Set([
          ".toml",
          ".ini",
          ".cfg",
        ]);

        if (pdfExtensions.has(extension)) {
          return { category: "pdf", label: "PDF", iconKey: "pdf" };
        }

        if (pythonExtensions.has(extension)) {
          return { category: "python", label: "PY", iconKey: "python" };
        }

        if (javascriptExtensions.has(extension)) {
          return { category: "javascript", label: upperExtension.slice(0, 4), iconKey: "javascript" };
        }

        if (typescriptExtensions.has(extension)) {
          return { category: "typescript", label: upperExtension.slice(0, 4), iconKey: "typescript" };
        }

        if (cExtensions.has(extension)) {
          return { category: "c", label: "C", iconKey: "c" };
        }

        if (cppExtensions.has(extension)) {
          return { category: "cpp", label: "C++", iconKey: "cpp" };
        }

        if (javaExtensions.has(extension)) {
          return { category: "java", label: "JAVA", iconKey: "java" };
        }

        if (goExtensions.has(extension)) {
          return { category: "go", label: "GO", iconKey: "go" };
        }

        if (rustExtensions.has(extension)) {
          return { category: "rust", label: "RS", iconKey: "rust" };
        }

        if (phpExtensions.has(extension)) {
          return { category: "php", label: "PHP", iconKey: "php" };
        }

        if (rubyExtensions.has(extension)) {
          return { category: "ruby", label: "RB", iconKey: "ruby" };
        }

        if (kotlinExtensions.has(extension)) {
          return { category: "kotlin", label: "KT", iconKey: "kotlin" };
        }

        if (swiftExtensions.has(extension)) {
          return { category: "swift", label: "SWFT", iconKey: "swift" };
        }

        if (scalaExtensions.has(extension)) {
          return { category: "scala", label: "SCA", iconKey: "scala" };
        }

        if (dartExtensions.has(extension)) {
          return { category: "dart", label: "DART", iconKey: "dart" };
        }

        if (luaExtensions.has(extension)) {
          return { category: "lua", label: "LUA", iconKey: "lua" };
        }

        if (perlExtensions.has(extension)) {
          return { category: "perl", label: "PL", iconKey: "perl" };
        }

        if (powershellExtensions.has(extension)) {
          return { category: "powershell", label: "PS1", iconKey: "powershell" };
        }

        if (markdownExtensions.has(extension)) {
          return { category: "markdown", label: "MD", iconKey: "markdown" };
        }

        if (htmlExtensions.has(extension)) {
          return { category: "html", label: "HTML", iconKey: "html" };
        }

        if (cssExtensions.has(extension)) {
          return { category: "css", label: "CSS", iconKey: "css" };
        }

        if (jsonExtensions.has(extension)) {
          return { category: "json", label: "JSON", iconKey: "json" };
        }

        if (xmlExtensions.has(extension)) {
          return { category: "xml", label: "XML", iconKey: "xml" };
        }

        if (yamlExtensions.has(extension)) {
          return { category: "yaml", label: "YAML", iconKey: "yaml" };
        }

        if (csvExtensions.has(extension)) {
          return { category: "csv", label: "CSV", iconKey: "csv" };
        }

        if (shellExtensions.has(extension)) {
          return { category: "shell", label: "SH", iconKey: "shell" };
        }

        if (sqlExtensions.has(extension)) {
          return { category: "sql", label: "SQL", iconKey: "sql" };
        }

        if (asmExtensions.has(extension)) {
          return { category: "asm", label: upperExtension.slice(0, 4), iconKey: "asm" };
        }

        if (dataExtensions.has(extension)) {
          return { category: "data", label: upperExtension.slice(0, 4), iconKey: "data" };
        }

        if (codeExtensions.has(extension)) {
          return { category: "code", label: upperExtension.slice(0, 4), iconKey: "code" };
        }

        if (documentExtensions.has(extension)) {
          return { category: "docx", label: upperExtension.slice(0, 4), iconKey: "docx" };
        }

        if (sheetExtensions.has(extension)) {
          return { category: "xlsx", label: upperExtension.slice(0, 4), iconKey: "xlsx" };
        }

        if (slidesExtensions.has(extension)) {
          return { category: "pptx", label: upperExtension.slice(0, 4), iconKey: "pptx" };
        }

        if (textExtensions.has(extension)) {
          return { category: "text", label: "TXT", iconKey: "text" };
        }

        if (archiveExtensions.has(extension)) {
          return { category: "archive", label: "ZIP", iconKey: "archive" };
        }

        if (executableExtensions.has(extension)) {
          return { category: "executable", label: "EXE", iconKey: "executable" };
        }

        if (elfExtensions.has(extension)) {
          return { category: "elf", label: upperExtension.slice(0, 4), iconKey: "binary" };
        }

        if (sharedLibraryExtensions.has(extension)) {
          return { category: "sharedlib", label: upperExtension.slice(0, 4), iconKey: "binary" };
        }

        if (idaExtensions.has(extension)) {
          return { category: "ida", label: upperExtension.slice(0, 4), iconKey: "binary" };
        }

        if (objectExtensions.has(extension)) {
          return { category: "object", label: upperExtension.slice(0, 4), iconKey: "binary" };
        }

        if (pngExtensions.has(extension)) {
          return { category: "png", label: upperExtension.slice(0, 4), iconKey: "png" };
        }

        if (jpgExtensions.has(extension)) {
          return { category: "jpg", label: upperExtension.slice(0, 4), iconKey: "jpg" };
        }

        if (imageExtensions.has(extension)) {
          return { category: "image", label: "IMG", iconKey: "image" };
        }

        if (mp4Extensions.has(extension)) {
          return { category: "mp4", label: upperExtension.slice(0, 4), iconKey: "mp4" };
        }

        if (videoExtensions.has(extension)) {
          return { category: "video", label: "VID", iconKey: "video" };
        }

        if (mp3Extensions.has(extension)) {
          return { category: "mp3", label: upperExtension.slice(0, 4), iconKey: "mp3" };
        }

        if (audioExtensions.has(extension)) {
          return { category: "audio", label: "AUD", iconKey: "audio" };
        }

        return { category: "generic", glyph: "F", label: getAttachmentIconLabel(fileName) };
      }

      function buildAttachmentIconMarkup(fileName) {
        const meta = getAttachmentIconMeta(fileName);

        if (meta.iconKey && payload.iconAssets?.[meta.iconKey]) {
          return \`
            <div class="attachment-export-art attachment-export-art--\${escapeHtml(meta.category)}">
              <img src="\${escapeHtml(payload.iconAssets[meta.iconKey])}" alt="" />
            </div>
          \`;
        }

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
