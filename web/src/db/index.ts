import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const client = postgres(process.env.DATABASE_URL as string, {
    connect_timeout: 5,
});
export const db = drizzle(client);
