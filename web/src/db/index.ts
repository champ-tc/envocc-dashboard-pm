import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

function getDatabaseUrl(): string {
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
        const port = process.env.DB_PORT || '5432';
        return `postgresql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${port}/${encodeURIComponent(process.env.DB_NAME)}`;
    }

    if (
        process.env.ETL_POSTGRES_USER &&
        process.env.ETL_POSTGRES_PASSWORD &&
        process.env.ETL_POSTGRES_DB
    ) {
        const host = process.env.DEV_DATABASE_HOST || '127.0.0.1';
        const port = process.env.DEV_DATABASE_PORT || process.env.ETL_POSTGRES_PORT || '15432';
        return `postgresql://${encodeURIComponent(process.env.ETL_POSTGRES_USER)}:${encodeURIComponent(process.env.ETL_POSTGRES_PASSWORD)}@${host}:${port}/${encodeURIComponent(process.env.ETL_POSTGRES_DB)}`;
    }

    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    throw new Error('Database configuration is missing');
}

type Database = ReturnType<typeof drizzle>;

let database: Database | undefined;

function getDatabase(): Database {
    if (!database) {
        const client = postgres(getDatabaseUrl(), {
            connect_timeout: 5,
        });
        database = drizzle(client);
    }

    return database;
}

// Next.js imports route modules while collecting build-time page data. Resolve
// the database only when a route actually uses it so production credentials are
// required at container runtime, not baked into the Docker build.
export const db = new Proxy({} as Database, {
    get(_target, property) {
        const currentDatabase = getDatabase();
        const value = Reflect.get(currentDatabase, property, currentDatabase);

        return typeof value === 'function'
            ? value.bind(currentDatabase)
            : value;
    },
});
