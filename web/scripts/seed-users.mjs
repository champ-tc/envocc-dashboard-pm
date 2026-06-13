import bcrypt from "bcrypt";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

let runtimeEnv = process.env;
const isProduction = process.env.NODE_ENV === "production";

if (
  isProduction &&
  !(
    process.env.WEB_SUPERADMIN_USERNAME ||
    process.env._AIRFLOW_WWW_USER_USERNAME
  )
) {
  const serverConfig = await import("./server-db-env.mjs");
  runtimeEnv = serverConfig.serverDatabaseEnv;
}

function buildDatabaseUrl(env) {
  if (
    env.DB_HOST &&
    env.DB_USER &&
    env.DB_PASSWORD &&
    env.DB_NAME
  ) {
    const dbPort = env.DB_PORT || "5432";
    return [
      "postgresql://",
      encodeURIComponent(env.DB_USER),
      ":",
      encodeURIComponent(env.DB_PASSWORD),
      "@",
      env.DB_HOST,
      ":",
      dbPort,
      "/",
      encodeURIComponent(env.DB_NAME),
    ].join("");
  }

  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  throw new Error("DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME is required.");
}

const seedUsers = isProduction
  ? [
      {
        name:
          runtimeEnv.WEB_SUPERADMIN_NAME ||
          [
            runtimeEnv._AIRFLOW_WWW_USER_FIRSTNAME,
            runtimeEnv._AIRFLOW_WWW_USER_LASTNAME,
          ]
            .filter(Boolean)
            .join(" ") ||
          "System Administrator",
        email:
          runtimeEnv.WEB_SUPERADMIN_EMAIL ||
          runtimeEnv._AIRFLOW_WWW_USER_EMAIL,
        username:
          runtimeEnv.WEB_SUPERADMIN_USERNAME ||
          runtimeEnv._AIRFLOW_WWW_USER_USERNAME,
        password:
          runtimeEnv.WEB_SUPERADMIN_PASSWORD ||
          runtimeEnv._AIRFLOW_WWW_USER_PASSWORD,
        role: "superadmin",
      },
      ...(runtimeEnv.WEB_USER_USERNAME ||
      runtimeEnv.WEB_USER_EMAIL ||
      runtimeEnv.WEB_USER_PASSWORD
        ? [
            {
              name: runtimeEnv.WEB_USER_NAME || "Seed User",
              email: runtimeEnv.WEB_USER_EMAIL,
              username: runtimeEnv.WEB_USER_USERNAME,
              password: runtimeEnv.WEB_USER_PASSWORD,
              role: "user",
            },
          ]
        : []),
    ]
  : [
      {
        name: "Seed Admin",
        email: "admin@example.local",
        username: "admin",
        password: "1234",
        role: "superadmin",
      },
      {
        name: "Seed User",
        email: "user@example.local",
        username: "user",
        password: "1234",
        role: "user",
      },
    ];

for (const seedUser of seedUsers) {
  if (!seedUser.email || !seedUser.username || !seedUser.password) {
    throw new Error(
      `Seed account "${seedUser.role}" requires email, username, and password.`,
    );
  }
  if (
    isProduction &&
    seedUser.password.length < 12 &&
    runtimeEnv.WEB_ALLOW_INSECURE_SEED_PASSWORDS !== "true"
  ) {
    throw new Error(
      `${seedUser.username} password must be at least 12 characters. ` +
        "Set WEB_ALLOW_INSECURE_SEED_PASSWORDS=true only for a controlled environment.",
    );
  }
}

const sql = postgres(buildDatabaseUrl(runtimeEnv), { connect_timeout: 5 });

try {
  await sql.begin(async (transaction) => {
    for (const seedUser of seedUsers) {
      const matches = await transaction`
        select id
        from users
        where email = ${seedUser.email} or username = ${seedUser.username}
      `;

      if (matches.length > 1) {
        throw new Error(`Multiple users conflict with seed account "${seedUser.username}".`);
      }

      const passwordHash = await bcrypt.hash(seedUser.password, 12);
      if (matches.length === 1) {
        await transaction`
          update users
          set
            name = ${seedUser.name},
            email = ${seedUser.email},
            username = ${seedUser.username},
            password = ${passwordHash},
            role = ${seedUser.role},
            status = 'approved'
          where id = ${matches[0].id}
        `;
      } else {
        await transaction`
          insert into users (name, email, username, password, role, status)
          values (
            ${seedUser.name},
            ${seedUser.email},
            ${seedUser.username},
            ${passwordHash},
            ${seedUser.role},
            'approved'
          )
        `;
      }
    }
  });

  console.log(`Seeded users: ${seedUsers.map(({ username }) => username).join(", ")}`);
} finally {
  await sql.end({ timeout: 1 });
}
