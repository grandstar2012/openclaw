import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HASH_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/.bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor/a2ui/renderers/lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps/shared/OpenClawKit/Tools/CanvasA2UI");

async function walk(entryPath: string, files: string[] = []) {
  const st = await fs.stat(entryPath);
  if (st.isDirectory()) {
    const entries = await fs.readdir(entryPath);
    for (const entry of entries) {
      await walk(path.join(entryPath, entry), files);
    }
    return files;
  }
  files.push(entryPath);
  return files;
}

const INPUT_PATHS = [
  path.join(ROOT_DIR, "package.json"),
  path.join(ROOT_DIR, "pnpm-lock.yaml"),
  A2UI_RENDERER_DIR,
  A2UI_APP_DIR,
];

async function computeHash() {
  const files: string[] = [];
  for (const input of INPUT_PATHS) {
    if (existsSync(input)) {
      await walk(input, files);
    }
  }
  const normalize = (p: string) => p.split(path.sep).join("/");
  files.sort((a, b) => normalize(a).localeCompare(normalize(b)));

  const hash = createHash("sha256");
  for (const filePath of files) {
    const rel = normalize(path.relative(ROOT_DIR, filePath));
    hash.update(rel);
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function main() {
  // Docker builds exclude vendor/apps via .dockerignore.
  // In that environment we can keep a prebuilt bundle only if it exists.
  if (!existsSync(A2UI_RENDERER_DIR) || !existsSync(A2UI_APP_DIR)) {
    if (existsSync(OUTPUT_FILE)) {
      console.log("A2UI sources missing; keeping prebuilt bundle.");
      process.exit(0);
    }
    console.error(`A2UI sources missing and no prebuilt bundle found at: ${OUTPUT_FILE}`);
    process.exit(1);
  }

  const currentHash = await computeHash();
  if (existsSync(HASH_FILE)) {
    const previousHash = (await fs.readFile(HASH_FILE, "utf8")).trim();
    if (previousHash === currentHash && existsSync(OUTPUT_FILE)) {
      console.log("A2UI bundle up to date; skipping.");
      return;
    }
  }

  console.log("Bundling A2UI...");

  const run = (cmd: string, args: string[]) => {
    const res = spawnSync(cmd, args, { cwd: ROOT_DIR, stdio: "inherit", shell: true });
    if (res.status !== 0) {
      console.error(`Command failed: ${cmd} ${args.join(" ")}`);
      process.exit(res.status ?? 1);
    }
  };

  run("pnpm", ["-s", "exec", "tsc", "-p", path.join(A2UI_RENDERER_DIR, "tsconfig.json")]);
  run("pnpm", ["-s", "exec", "rolldown", "-c", path.join(A2UI_APP_DIR, "rolldown.config.mjs")]);

  await fs.writeFile(HASH_FILE, currentHash);
  console.log("A2UI bundle updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
