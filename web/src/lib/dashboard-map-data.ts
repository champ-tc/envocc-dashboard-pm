import type { FeatureCollection } from 'geojson';

let tambonRequest: Promise<FeatureCollection> | undefined;

export function needsTambonBoundaries(
    filters: { provinces?: string[]; districts?: string[] },
    stationCount: number,
    requireDistrictSelection = false,
) {
    if (requireDistrictSelection && !filters.districts?.length) return false;
    // DDS station overlays also require tambons at national level.
    return Boolean(filters.provinces?.length || filters.districts?.length || stationCount);
}

/** Reuse both in-flight requests and parsed geometry across dashboard visits. */
export function loadTambonBoundaries(): Promise<FeatureCollection> {
    if (!tambonRequest) {
        tambonRequest = fetch('/data/tambon_boundaries.geojson')
            .then(response => {
                if (!response.ok) throw new Error(`Unable to load map boundaries: ${response.status}`);
                return response.json();
            })
            .catch(error => {
                tambonRequest = undefined;
                throw error;
            });
    }
    return tambonRequest;
}
