export const DEFAULT_DOCUMENT_FONT_STYLE = "atkinson";
export const DEFAULT_CODE_FONT_STYLE = "google-sans-code";

const UI_SANS_FALLBACK = '"Segoe UI", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei UI", sans-serif';
const UI_SERIF_FALLBACK = '"Georgia", "Songti SC", "STSong", serif';
const CODE_FALLBACK = '"Cascadia Code", "Consolas", monospace';

export const DOCUMENT_FONT_STYLES = [
  {
    id: "atkinson",
    label: "Atkinson Hyperlegible Next",
    note: "清晰耐看，1 / I / l 区分很稳。",
    bodyFamily: `"Atkinson Hyperlegible Next", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Atkinson Hyperlegible Next", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "plex",
    label: "IBM Plex Sans",
    note: "科技感和可读性比较平衡。",
    bodyFamily: `"IBM Plex Sans", ${UI_SANS_FALLBACK}`,
    displayFamily: `"IBM Plex Sans", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "source",
    label: "Source Sans 3",
    note: "中性、干净，长文很舒服。",
    bodyFamily: `"Source Sans 3", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Source Sans 3", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    note: "更圆润一点，界面文档很顺眼。",
    bodyFamily: `"Plus Jakarta Sans", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Plus Jakarta Sans", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "inter",
    label: "Inter",
    note: "现代感很强，数字字形也比较利落。",
    bodyFamily: `"Inter", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Inter", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "outfit",
    label: "Outfit",
    note: "更轻快，标题会显得更活。",
    bodyFamily: `"Outfit", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Outfit", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    note: "更有设计感，适合做醒目标题。",
    bodyFamily: `"Space Grotesk", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Space Grotesk", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "manrope",
    label: "Manrope",
    note: "简洁克制，正文会很干净。",
    bodyFamily: `"Manrope", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Manrope", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "public-sans",
    label: "Public Sans",
    note: "稳重朴素，文档气质偏正式。",
    bodyFamily: `"Public Sans", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Public Sans", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "work-sans",
    label: "Work Sans",
    note: "稍有棱角，适合技术说明。",
    bodyFamily: `"Work Sans", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Work Sans", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "lexend",
    label: "Lexend",
    note: "字腔更开，扫读体验很好。",
    bodyFamily: `"Lexend", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Lexend", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "noto-sans",
    label: "Noto Sans",
    note: "非常通用，混排时比较稳。",
    bodyFamily: `"Noto Sans", ${UI_SANS_FALLBACK}`,
    displayFamily: `"Noto Sans", ${UI_SANS_FALLBACK}`,
  },
  {
    id: "newsreader",
    label: "Newsreader",
    note: "偏出版物风格，适合长篇记录。",
    bodyFamily: `"Newsreader", ${UI_SERIF_FALLBACK}`,
    displayFamily: `"Newsreader", ${UI_SERIF_FALLBACK}`,
  },
  {
    id: "editorial",
    label: "Literata + Fraunces",
    note: "正文稳，标题更有杂志感。",
    bodyFamily: `"Literata", ${UI_SERIF_FALLBACK}`,
    displayFamily: `"Fraunces", ${UI_SERIF_FALLBACK}`,
  },
  {
    id: "google-sans-code",
    label: "Google Sans Code",
    note: "整篇都是代码文档感。",
    bodyFamily: `"Google Sans Code", ${CODE_FALLBACK}`,
    displayFamily: `"Google Sans Code", ${CODE_FALLBACK}`,
  },
];

export const CODE_FONT_STYLES = [
  {
    id: "google-sans-code",
    label: "Google Sans Code",
    note: "默认连字表现很舒服。",
    family: `"Google Sans Code", ${CODE_FALLBACK}`,
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    note: "程序员常用，识别度很高。",
    family: `"JetBrains Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "fira-code",
    label: "Fira Code",
    note: "经典连字字体，箭头和比较符很好看。",
    family: `"Fira Code", "JetBrains Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    note: "更硬朗，适合命令和日志。",
    family: `"IBM Plex Mono", "JetBrains Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "inconsolata",
    label: "Inconsolata",
    note: "经典等宽，阅读压力小。",
    family: `"Inconsolata", ${CODE_FALLBACK}`,
  },
  {
    id: "martian-mono",
    label: "Martian Mono",
    note: "更有未来感，字形也很利落。",
    family: `"Martian Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "recursive-mono",
    label: "Recursive Mono",
    note: "代码味很强，风格很鲜明。",
    family: `"Recursive Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "source-code-pro",
    label: "Source Code Pro",
    note: "稳定耐看，长代码块很舒服。",
    family: `"Source Code Pro", ${CODE_FALLBACK}`,
  },
  {
    id: "red-hat-mono",
    label: "Red Hat Mono",
    note: "现代、清爽，数字形态不错。",
    family: `"Red Hat Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "azeret-mono",
    label: "Azeret Mono",
    note: "边角更鲜明，看起来很精神。",
    family: `"Azeret Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "dm-mono",
    label: "DM Mono",
    note: "轻松一点，适合短代码和片段。",
    family: `"DM Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "space-mono",
    label: "Space Mono",
    note: "更有复古终端味道。",
    family: `"Space Mono", ${CODE_FALLBACK}`,
  },
  {
    id: "anonymous-pro",
    label: "Anonymous Pro",
    note: "传统等宽风格，字符关系清楚。",
    family: `"Anonymous Pro", ${CODE_FALLBACK}`,
  },
  {
    id: "courier-prime",
    label: "Courier Prime",
    note: "更像打字机稿纸风格。",
    family: `"Courier Prime", ${CODE_FALLBACK}`,
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
