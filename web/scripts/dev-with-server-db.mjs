import { spawn } from "node:child_process";
import postgres from "postgres";

import { databaseTarget, serverDatabaseEnv, webDir } from "./server-db-env.mjs";

const sql = postgres(serverDatabaseEnv.DATABASE_URL, { connect_timeout: 5 });

try {
  const [{ usersTable }] = await sql`
    select to_regclass('public.users')::text as "usersTable"
  `;

  if (!usersTable) {
    throw new Error(
      "Missing public.users on the server database. Run `npm run db:push:server` first.",
    );
  }
} finally {
  await sql.end({ timeout: 1 });
}

console.log(`[dev] DATABASE_URL -> ${databaseTarget}`);

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
