export const DEFAULT_DOCUMENT_FONT_STYLE = "atkinson";
export const DEFAULT_CODE_FONT_STYLE = "google-sans-code";

export const DOCUMENT_FONT_STYLES = [
  {
    id: "atkinson",
    label: "清晰易读 · Atkinson Hyperlegible Next",
    bodyFamily:
      '"Atkinson Hyperlegible Next", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    displayFamily:
      '"Atkinson Hyperlegible Next", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  },
  {
    id: "plex",
    label: "理性现代 · IBM Plex Sans",
    bodyFamily: '"IBM Plex Sans", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    displayFamily:
      '"IBM Plex Sans", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  },
  {
    id: "source",
    label: "编辑文稿 · Source Sans 3",
    bodyFamily: '"Source Sans 3", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    displayFamily:
      '"Source Sans 3", "Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif',
  },
  {
    id: "google-sans-code",
    label: "代码文档 · Google Sans Code",
    bodyFamily: '"Google Sans Code", "Cascadia Mono", "Consolas", monospace',
    displayFamily: '"Google Sans Code", "Cascadia Mono", "Consolas", monospace',
  },
];

export const CODE_FONT_STYLES = [
  {
    id: "google-sans-code",
    label: "Google Sans Code",
    family: '"Google Sans Code", "Cascadia Code", "Consolas", monospace',
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    family: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
  },
  {
    id: "fira-code",
    label: "Fira Code",
    family: '"Fira Code", "JetBrains Mono", "Cascadia Code", "Consolas", monospace',
  },
];

const documentStyleMap = new Map(DOCUMENT_FONT_STYLES.map((preset) => [preset.id, preset]));
const codeStyleMap = new Map(CODE_FONT_STYLES.map((preset) => [preset.id, preset]));

export function getDocumentFontStyle(id) {
  return documentStyleMap.get(id) || documentStyleMap.get(DEFAULT_DOCUMENT_FONT_STYLE);
}

export function getCodeFontStyle(id) {
  return codeStyleMap.get(id) || codeStyleMap.get(DEFAULT_CODE_FONT_STYLE);
}
