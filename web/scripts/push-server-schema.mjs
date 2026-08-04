import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

let databaseUrl = process.env.DATABASE_URL;
let databaseTarget = databaseUrl ? "DATABASE_URL from environment" : null;

if (
  !databaseUrl &&
  process.env.DB_HOST &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
) {
  const dbPort = process.env.DB_PORT || "5432";
  databaseUrl = [
    "postgresql://",
    encodeURIComponent(process.env.DB_USER),
    ":",
    encodeURIComponent(process.env.DB_PASSWORD),
    "@",
    process.env.DB_HOST,
    ":",
    dbPort,
    "/",
    encodeURIComponent(process.env.DB_NAME),
  ].join("");
  databaseTarget = `${process.env.DB_HOST}:${dbPort}/${process.env.DB_NAME}`;
}

if (!databaseUrl) {
  const serverConfig = await import("./server-db-env.mjs");
  databaseUrl = serverConfig.serverDatabaseEnv.DATABASE_URL;
  databaseTarget = serverConfig.databaseTarget;
}

console.log(`[db:push:server] DATABASE_URL -> ${databaseTarget}`);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, "..");
const drizzleKit = path.join(
  webDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit",
);

const child = spawn(drizzleKit, ["push", "--config", "drizzle.config.ts"], {
  cwd: webDir,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
