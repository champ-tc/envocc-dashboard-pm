import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const webDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(webDir, "..");
const rootEnvPath = path.join(repoDir, ".env");

if (!fs.existsSync(rootEnvPath)) {
  throw new Error(`Root .env not found: ${rootEnvPath}`);
}

const rootEnv = dotenv.parse(fs.readFileSync(rootEnvPath));
const serverHost =
  process.env.DEV_DATABASE_HOST || rootEnv.DEV_DATABASE_HOST || "127.0.0.1";
const serverPort =
  process.env.DEV_DATABASE_PORT || rootEnv.ETL_POSTGRES_PORT || "15432";
const dbUser = rootEnv.ETL_POSTGRES_USER;
const dbPassword = rootEnv.ETL_POSTGRES_PASSWORD;
const dbName = rootEnv.ETL_POSTGRES_DB;

for (const [key, value] of Object.entries({
  ETL_POSTGRES_USER: dbUser,
  ETL_POSTGRES_PASSWORD: dbPassword,
  ETL_POSTGRES_DB: dbName,
})) {
  if (!value) {
    throw new Error(`Missing ${key} in root .env`);
  }
}

const databaseUrl = [
  "postgresql://",
  encodeURIComponent(dbUser),
  ":",
  encodeURIComponent(dbPassword),
  "@",
  serverHost,
  ":",
  serverPort,
  "/",
  encodeURIComponent(dbName),
].join("");

export const databaseTarget = `${serverHost}:${serverPort}/${dbName} (user=${dbUser})`;
export const serverDatabaseEnv = {
  ...process.env,
  ...rootEnv,
  DATABASE_URL: databaseUrl,
  NEXT_PUBLIC_API_URL: rootEnv.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL,
  JWT_SECRET: rootEnv.JWT_SECRET || process.env.JWT_SECRET,
};
