import { spawn } from "node:child_process";

import { databaseTarget, serverDatabaseEnv, webDir } from "./server-db-env.mjs";

console.log(`[dev] Starting Next.js; database will be contacted on demand: ${databaseTarget}`);

const child = spawn("next", ["dev", "-H", "127.0.0.1"], {
  cwd: webDir,
  env: serverDatabaseEnv,
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
