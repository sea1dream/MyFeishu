const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const projectRoot = path.resolve(__dirname, "..");
const sourceSvgPath = path.join(projectRoot, "assets", "branding", "flowdoc-mark.svg");
const buildDirectory = path.join(projectRoot, "build");
const brandingDirectory = path.join(projectRoot, "assets", "branding");
const temporaryDirectory = path.join(projectRoot, "tmp-icon-build");

const iconSizes = [16, 24, 32, 48, 64, 128, 256];

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function removeDirectory(directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
}

async function renderPngVariants() {
  const svgBuffer = await fs.readFile(sourceSvgPath);
  const pngPaths = [];

  for (const size of iconSizes) {
    const filePath = path.join(temporaryDirectory, `flowdoc-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(filePath);
    pngPaths.push(filePath);
  }

  return pngPaths;
}

async function writeIco(targetPath, pngPaths) {
  const icoBuffer = await pngToIco(pngPaths);
  await fs.writeFile(targetPath, icoBuffer);
}

async function main() {
  await ensureDirectory(buildDirectory);
  await ensureDirectory(brandingDirectory);
  await ensureDirectory(temporaryDirectory);

  try {
    const pngPaths = await renderPngVariants();

    await Promise.all([
      writeIco(path.join(buildDirectory, "icon.ico"), pngPaths),
      writeIco(path.join(buildDirectory, "flowdoc-file.ico"), pngPaths),
      writeIco(path.join(brandingDirectory, "flowdoc-window.ico"), pngPaths),
      fs.copyFile(path.join(temporaryDirectory, "flowdoc-256.png"), path.join(brandingDirectory, "flowdoc-mark-256.png")),
    ]);

    console.log("FlowDoc icons generated.");
  } finally {
    await removeDirectory(temporaryDirectory);
  }
}

main().catch((error) => {
  console.error("Failed to generate FlowDoc icons.");
  console.error(error);
  process.exitCode = 1;
});
