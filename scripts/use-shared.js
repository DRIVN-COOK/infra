// scripts/use-shared.js
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv[2];              // "dev" | "prod"
const target = process.argv[3];            // "front-office" | "back-office"
const shouldStart = process.argv.includes("--start");

if (!mode || !target) {
  console.error("Usage: node use-shared.js dev|prod front-office|back-office [--start]");
  process.exit(1);
}

const rootPath   = path.resolve(__dirname, "../..");
const sharedPath = path.resolve(rootPath, "shared");
const targetPath = path.resolve(rootPath, target);

const sh = (cmd, cwd = process.cwd()) => {
  console.log(`\n$ (${cwd}) ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
};

console.log(`Target: ${target} | Mode: ${mode}`);

try {
  if (mode === "dev") {
    // 1) Build + link global depuis shared
    sh("npm run build", sharedPath);          // tsc build frais
    sh("npm link", sharedPath);               // (re)publie le lien global

    // 2) (re)link dans le target
    sh("npm unlink @drivn-cook/shared || true", targetPath);
    sh("npm link @drivn-cook/shared", targetPath);

    // 3) Purge cache Vite du target
    sh("rimraf node_modules/.vite", targetPath);

  } else if (mode === "prod") {
    sh("npm unlink @drivn-cook/shared || true", targetPath);
    sh("npm install @drivn-cook/shared", targetPath);
    console.log("\n✅ Shared installé depuis le registry.");
  } else {
    console.error("Unknown mode. Use 'dev' or 'prod'.");
    process.exit(1);
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
