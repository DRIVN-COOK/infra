import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv[2]; // "dev" ou "prod"
const target = process.argv[3]; // "front-office" ou "back-office"

if (!mode || !target) {
  console.error("Usage: node use-shared.js dev|prod front-office|back-office");
  process.exit(1);
}

const projectPath = path.resolve(__dirname, "../../" + target);
try {
  process.chdir(projectPath);
} catch (e) {
  console.warn(`⚠️  Skipping chdir to ${projectPath} – probably running in Docker`);
}

console.log(`Target project: ${target}`);
console.log(`Mode: ${mode}`);

try {
  if (mode === "dev") {
    console.log("Linking local shared...");
    execSync("npm unlink @drivn-cook/shared || true", { stdio: "inherit" });
    execSync("npm link @drivn-cook/shared", { stdio: "inherit" });
  } else if (mode === "prod") {
    console.log("Installing shared from GitHub Packages...");
    execSync("npm unlink @drivn-cook/shared || true", { stdio: "inherit" });
    execSync("npm install @drivn-cook/shared", { stdio: "inherit" });
  } else {
    console.error("Unknown mode. Use 'dev' or 'prod'.");
    process.exit(1);
  }
} catch (err) {
  console.error("Error while switching shared:", err.message);
  process.exit(1);
}
