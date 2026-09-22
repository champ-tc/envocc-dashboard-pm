import { PROVINCE_MAPPING } from '@/lib/constants';

/** Keep the selected Thai name and accept legacy English aliases in PM2.5 data. */
export function getPM25ProvinceAliases(province: string): string[] {
    const thaiName = province.trim();
    const aliases = Object.entries(PROVINCE_MAPPING)
        .filter(([, mappedThaiName]) => mappedThaiName === thaiName)
        .map(([englishName]) => englishName.trim());

    return Array.from(new Set([thaiName, ...aliases])).filter(Boolean);
}

/** Accept both legacy labels and the numeric health-region values in PM2.5 parquet. */
export function getPM25RegionAliases(region: string): string[] {
    const regionName = region.trim();
    const regionNumber = regionName.match(/\d+/)?.[0];

    return Array.from(new Set([regionName, regionNumber])).filter((value): value is string => Boolean(value));
}
