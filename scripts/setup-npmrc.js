import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config(); // charge .env.local

const token = process.env.NPM_TOKEN;

if (!token) {
  console.error("NPM_TOKEN manquant dans .env !");
  process.exit(1);
}

const npmrcContent = `
@drivn-cook:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${token}
`.trim();

const npmrcPath = path.resolve(process.env.HOME || process.env.USERPROFILE, ".npmrc");

fs.writeFileSync(npmrcPath, npmrcContent, "utf8");
console.log(`Fichier ~/.npmrc mis à jour avec token GitHub`);
