import bcrypt from "bcrypt";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed weak development passwords in production.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const passwordHash = await bcrypt.hash("1234", 10);
const seedUsers = [
  {
    name: "Seed Admin",
    email: "admin@example.local",
    username: "admin",
    role: "superadmin",
  },
  {
    name: "Seed User",
    email: "user@example.local",
    username: "user",
    role: "user",
  },
];

const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 5 });

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

  console.log("Seeded development users: admin, user");
} finally {
  await sql.end({ timeout: 1 });
}
