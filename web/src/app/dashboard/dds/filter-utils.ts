export type DiseaseGroupFilter = Record<string, string>;

export interface DDSAccessScope {
    isProvince?: boolean;
    isRegion?: boolean;
    province?: string | null;
    region?: string | null;
}

export function applyDDSAccessScope<T extends { regions: string[]; provinces: string[] }>(filters: T, scope?: DDSAccessScope | null): T {
    if (scope?.isProvince) {
        return {
            ...filters,
            regions: [],
            provinces: scope.province ? [scope.province] : ['__invalid_scope__'],
        };
    }

    if (scope?.isRegion) {
        const regionNumber = scope.region?.replace(/[^0-9]/g, '');
        return {
            ...filters,
            regions: regionNumber ? [`เขตสุขภาพที่ ${regionNumber}`] : ['เขตสุขภาพที่ 0'],
            provinces: [],
        };
    }

    return filters;
}

export function restrictDDSOptionsToScope<T extends {
    regions: string[];
    provinces: string[];
    hierarchy: Array<{ region: string; province: string }>;
}>(options: T, scope?: DDSAccessScope | null): T {
    if (!scope?.isProvince && !scope?.isRegion) return options;

    const regionNumber = scope.region?.replace(/[^0-9]/g, '');
    const regionLabel = regionNumber ? `เขตสุขภาพที่ ${regionNumber}` : '';
    const hierarchy = options.hierarchy.filter((item) =>
        scope.isProvince
            ? Boolean(scope.province) && item.province === scope.province
            : Boolean(regionLabel) && item.region === regionLabel,
    );

    return {
        ...options,
        regions: Array.from(new Set(hierarchy.map((item) => item.region))),
        provinces: Array.from(new Set(hierarchy.map((item) => item.province))),
        hierarchy,
    };
}

/**
 * Keeps the row-level selection consistent with the disease cards.
 * A row may be counted by a disease card only when it matches one of the
 * selected predicates. This prevents an unchecked code from being counted as
 * another group's "other" value.
 */
export function buildDDSFilteredDiseasePredicate(
    diseaseIds: string[],
    icdFilters: DiseaseGroupFilter,
): string {
    const predicates = diseaseIds
        .map((id) => icdFilters[id])
        .filter(Boolean)
        .map((filter) => `(1=1 ${filter})`);

    return predicates.length > 0 ? `(${predicates.join(' OR ')})` : 'FALSE';
}
