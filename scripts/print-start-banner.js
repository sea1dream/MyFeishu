const { readFileSync } = require("node:fs");
const path = require("node:path");

const FALLBACK_BANNER_LINES = [
  "███████╗██╗      ██████╗ ██╗    ██╗██████╗  ██████╗  ██████╗",
  "██╔════╝██║     ██╔═══██╗██║    ██║██╔══██╗██╔═══██╗██╔════╝",
  "█████╗  ██║     ██║   ██║██║ █╗ ██║██║  ██║██║   ██║██║     ",
  "██╔══╝  ██║     ██║   ██║██║███╗██║██║  ██║██║   ██║██║     ",
  "██║     ███████╗╚██████╔╝╚███╔███╔╝██████╔╝╚██████╔╝╚██████╗",
  "╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═════╝  ╚═════╝  ╚═════╝",
];

function readPackageVersion() {
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  return JSON.parse(raw).version || "0.0.0";
}

function supportsAnsi() {
  return process.stdout.isTTY && !process.env.NO_COLOR;
}

function interpolateColor(start, end, ratio) {
  return {
    r: Math.round(start.r + (end.r - start.r) * ratio),
    g: Math.round(start.g + (end.g - start.g) * ratio),
    b: Math.round(start.b + (end.b - start.b) * ratio),
  };
}

function paintAnsi(text, color, { bold = false } = {}) {
  if (!supportsAnsi()) {
    return text;
  }

  const weight = bold ? "\x1b[1m" : "";
  return `${weight}\x1b[38;2;${color.r};${color.g};${color.b}m${text}\x1b[0m`;
}

function colorizeFallbackBannerLine(line, lineIndex) {
  const start = { r: 255, g: 186, b: 120 };
  const end = { r: 123, g: 67, b: 151 };
  const visibleCount = [...line].filter((character) => character !== " ").length || 1;
  let paintedCount = 0;

  return [...line]
    .map((character) => {
      if (character === " ") {
        return character;
      }

      const ratio = Math.min(1, (paintedCount + lineIndex * 6) / Math.max(1, visibleCount + FALLBACK_BANNER_LINES.length * 6));
      paintedCount += 1;
      return paintAnsi(character, interpolateColor(start, end, ratio), { bold: true });
    })
    .join("");
}

function printMeta(version) {
  const metaColor = { r: 131, g: 103, b: 84 };
  const accentColor = { r: 212, g: 116, b: 72 };
  const subtitle = "local-first editor for notes, code, attachments, and polished PDF exports";
  const meta = `v${version}  ·  npm start`;
  process.stdout.write(`${paintAnsi(`  ${subtitle}`, metaColor)}\n`);
  process.stdout.write(`${paintAnsi(`  ${meta}`, accentColor, { bold: true })}\n\n`);
}

function printFallbackBanner(version) {
  process.stdout.write("\n");
  FALLBACK_BANNER_LINES.forEach((line, index) => {
    process.stdout.write(`${colorizeFallbackBannerLine(line, index)}\n`);
  });
  printMeta(version);
}

async function printBanner() {
  const version = readPackageVersion();

  try {
    if (supportsAnsi() && !process.env.FORCE_COLOR) {
      process.env.FORCE_COLOR = "1";
    }

    const { render } = await import("oh-my-logo");
    const logo = await render("FLOWDOC", {
      palette: "sunset",
      direction: "horizontal",
      font: "Small Slant",
    });

    process.stdout.write(`\n${logo}\n`);
    printMeta(version);
  } catch {
    printFallbackBanner(version);
  }
}

printBanner();
