import { copyFileSync, rmSync, mkdirSync } from "fs";
import { resolve } from "path";

const projectRoot = process.cwd();
const distPath = resolve(projectRoot, "dist");

const targets = [
  { entry: "src/background/index.ts", outDir: "dist/background" },
  { entry: "src/content/index.ts", outDir: "dist/content" },
  { entry: "src/ui/options/index.tsx", outDir: "dist/ui/options" },
  { entry: "src/ui/popup/index.tsx", outDir: "dist/ui/popup" }
];

const htmlFiles = [
  { src: "src/ui/options/options.html", dest: "options.html" },
  { src: "src/ui/popup/popup.html", dest: "popup.html" }
];

const staticFiles = [
  { src: "manifest.json", dest: "manifest.json" },
  { src: "src/ui/options/options.css", dest: "options.css" },
  { src: "src/ui/popup/popup.css", dest: "popup.css" }
];

async function run() {
  rmSync(distPath, { recursive: true, force: true });
  mkdirSync(distPath, { recursive: true });

  const buildFlags = [
    "--target=browser",
    "--minify",
    "--sourcemap",
    "--define:process.env.NODE_ENV='\"production\"'"
  ];

  for (const { entry, outDir } of targets) {
    console.log(`Bundling ${entry}`);
    const build = Bun.spawn({
      cmd: ["bun", "build", entry, "--outdir", outDir, ...buildFlags],
      cwd: projectRoot,
      stdout: "inherit",
      stderr: "inherit"
    });

    const status = await build.exited;
    if ((status.exitCode ?? 0) !== 0) {
      throw new Error(`Failed to bundle ${entry}`);
    }
  }

  for (const { src, dest } of htmlFiles) {
    const sourcePath = resolve(projectRoot, src);
    const destPath = resolve(distPath, dest);
    copyFileSync(sourcePath, destPath);
  }

  for (const { src, dest } of staticFiles) {
    const sourcePath = resolve(projectRoot, src);
    const destPath = resolve(distPath, dest);
    copyFileSync(sourcePath, destPath);
  }

  console.log("Dist ready at", distPath);
}

await run();
