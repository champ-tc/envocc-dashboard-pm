import fs from 'fs';

type CacheEntry<T> = {
    expiresAt: number;
    promise: Promise<T>;
};

const DEFAULT_CACHE_TTL_MS = 180_000;
const DEFAULT_CACHE_MAX_ENTRIES = 200;
const DEFAULT_QUERY_CONCURRENCY = 2;
const DEFAULT_QUERY_MAX_QUEUE = 10;
const DEFAULT_QUERY_QUEUE_TIMEOUT_MS = 8_000;

const resultCache = new Map<string, CacheEntry<unknown>>();
let activeQueries = 0;
type QueryWaiter = {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
};
const queryWaiters: QueryWaiter[] = [];

export class DashboardOverloadError extends Error {
    readonly code = 'DASHBOARD_OVERLOADED';

    constructor() {
        super('ขณะนี้มีผู้ใช้งานระบบจำนวนมาก กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
        this.name = 'DashboardOverloadError';
    }
}

export function isDashboardOverloadError(error: unknown): error is DashboardOverloadError {
    return error instanceof DashboardOverloadError
        || (
            error instanceof Error
            && (
                error.name === 'DashboardOverloadError'
                || error.message.includes('DASHBOARD_OVERLOADED')
                || error.message.includes('มีผู้ใช้งานระบบจำนวนมาก')
            )
        );
}

function positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function queryConcurrency(): number {
    return positiveInteger(process.env.DASHBOARD_QUERY_CONCURRENCY, DEFAULT_QUERY_CONCURRENCY);
}

async function acquireQuerySlot(): Promise<void> {
    if (activeQueries < queryConcurrency()) {
        activeQueries += 1;
        return;
    }

    const maxQueue = positiveInteger(process.env.DASHBOARD_QUERY_MAX_QUEUE, DEFAULT_QUERY_MAX_QUEUE);
    if (queryWaiters.length >= maxQueue) throw new DashboardOverloadError();

    const timeoutMs = positiveInteger(
        process.env.DASHBOARD_QUERY_QUEUE_TIMEOUT_MS,
        DEFAULT_QUERY_QUEUE_TIMEOUT_MS,
    );

    await new Promise<void>((resolve, reject) => {
        const waiter: QueryWaiter = {
            resolve,
            reject,
            timeout: setTimeout(() => {
                const index = queryWaiters.indexOf(waiter);
                if (index >= 0) queryWaiters.splice(index, 1);
                reject(new DashboardOverloadError());
            }, timeoutMs),
        };
        queryWaiters.push(waiter);
    });
    activeQueries += 1;
}

function releaseQuerySlot(): void {
    activeQueries = Math.max(0, activeQueries - 1);
    const waiter = queryWaiters.shift();
    if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.resolve();
    }
}

export async function withDashboardQuerySlot<T>(query: () => Promise<T>): Promise<T> {
    await acquireQuerySlot();
    try {
        return await query();
    } finally {
        releaseQuerySlot();
    }
}

function pruneCache(now: number, maxEntries: number): void {
    for (const [key, entry] of resultCache) {
        if (entry.expiresAt <= now) resultCache.delete(key);
    }

    while (resultCache.size >= maxEntries) {
        const oldestKey = resultCache.keys().next().value as string | undefined;
        if (!oldestKey) break;
        resultCache.delete(oldestKey);
    }
}

export async function cachedDashboardQuery<T>(
    key: string,
    query: () => Promise<T>,
    ttlMs = positiveInteger(process.env.DASHBOARD_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS),
): Promise<T> {
    const now = Date.now();
    const existing = resultCache.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > now) {
        // Refresh insertion order so the bounded map behaves like a small LRU cache.
        resultCache.delete(key);
        resultCache.set(key, existing);
        return existing.promise;
    }

    const maxEntries = positiveInteger(
        process.env.DASHBOARD_CACHE_MAX_ENTRIES,
        DEFAULT_CACHE_MAX_ENTRIES,
    );
    pruneCache(now, maxEntries);

    const promise = withDashboardQuerySlot(query).catch((error) => {
        resultCache.delete(key);
        throw error;
    });

    resultCache.set(key, { expiresAt: now + ttlMs, promise });
    return promise;
}

export function stableCacheKey(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(stableCacheKey).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableCacheKey(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

export function getDataVersion(paths: string[]): string {
    return paths
        .map((filePath) => {
            const stat = fs.statSync(filePath);
            return `${filePath}:${stat.size}:${stat.mtimeMs}`;
        })
        .join('|');
}
