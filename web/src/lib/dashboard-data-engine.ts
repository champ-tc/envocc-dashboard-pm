import path from 'path';
import type * as duckdbTypes from 'duckdb';
import { getDataVersion } from '@/lib/dashboard-runtime';

const duckdb = typeof window === 'undefined' ? eval('require("duckdb")') : null;

type EngineSnapshot = {
    db: duckdbTypes.Database;
    version: string;
    references: number;
    retired: boolean;
};

export type DashboardDataFiles = {
    pm25: string;
    hdc: string;
    midYear: string;
};

let currentSnapshot: EngineSnapshot | null = null;
let buildPromise: Promise<EngineSnapshot> | null = null;
let buildingVersion: string | null = null;

export function getDashboardDataFiles(): DashboardDataFiles {
    const dataDir = process.env.DUCKDB_DATA_DIR || path.join(process.cwd(), 'public', 'duckdb');
    return {
        pm25: path.join(dataDir, process.env.PM25_DATA_FILE || 'pm25.csv'),
        hdc: path.join(dataDir, process.env.HDC_DATA_FILE || 'hdc.parquet'),
        midYear: path.join(dataDir, process.env.MID_YEAR_DATA_FILE || 'mid_year.csv'),
    };
}

export function getDashboardDataVersion(): string {
    return getDataVersion(Object.values(getDashboardDataFiles()));
}

function quotePath(filePath: string): string {
    return filePath.replace(/'/g, "''");
}

function reader(filePath: string): string {
    return filePath.toLowerCase().endsWith('.parquet')
        ? `read_parquet('${quotePath(filePath)}')`
        : `read_csv_auto('${quotePath(filePath)}', ignore_errors=true)`;
}

function run(db: duckdbTypes.Database, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(sql, (error: Error | null) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

function closeSnapshot(snapshot: EngineSnapshot): void {
    if (!snapshot.retired || snapshot.references > 0) return;
    snapshot.db.close((error?: Error | null) => {
        if (error) console.error('[dashboard-engine] Failed to close retired snapshot:', error);
    });
}

async function buildSnapshot(version: string): Promise<EngineSnapshot> {
    const files = getDashboardDataFiles();
    const db: duckdbTypes.Database = new duckdb.Database(':memory:');

    try {
        // Materialize test CSVs once. Dashboard requests query these shared analytical tables
        // instead of detecting schemas and scanning source files on every page refresh.
        await run(db, `CREATE TABLE pm25_raw AS SELECT * FROM ${reader(files.pm25)}`);
        await run(db, `CREATE TABLE hdc_raw AS SELECT * FROM ${reader(files.hdc)}`);
        await run(db, `CREATE TABLE mid_year AS SELECT * FROM ${reader(files.midYear)}`);

        return { db, version, references: 0, retired: false };
    } catch (error) {
        db.close(() => undefined);
        throw error;
    }
}

async function ensureSnapshot(version: string): Promise<EngineSnapshot> {
    if (currentSnapshot?.version === version) return currentSnapshot;

    if (!buildPromise || buildingVersion !== version) {
        buildingVersion = version;
        buildPromise = buildSnapshot(version).then((snapshot) => {
            const previous = currentSnapshot;
            currentSnapshot = snapshot;
            if (previous) {
                previous.retired = true;
                closeSnapshot(previous);
            }
            return snapshot;
        }).finally(() => {
            buildPromise = null;
            buildingVersion = null;
        });
    }

    return buildPromise;
}

export async function withDashboardDatabase<T>(
    query: (db: duckdbTypes.Database) => Promise<T>,
): Promise<T> {
    const snapshot = await ensureSnapshot(getDashboardDataVersion());
    snapshot.references += 1;
    try {
        return await query(snapshot.db);
    } finally {
        snapshot.references = Math.max(0, snapshot.references - 1);
        closeSnapshot(snapshot);
    }
}
