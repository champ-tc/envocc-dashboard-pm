import type { FeatureCollection } from 'geojson';

let tambonRequest: Promise<FeatureCollection> | undefined;

export function needsTambonBoundaries(
    filters: { provinces?: string[]; districts?: string[] },
    _stationCount: number,
    requireDistrictSelection = false,
) {
    if (requireDistrictSelection && !filters.districts?.length) return false;
    // Keep the national view at province level. Detailed boundaries are only
    // useful after an area filter is selected; otherwise a loaded station
    // overlay can leave dense tambon lines behind when filters are cleared.
    return Boolean(filters.provinces?.length || filters.districts?.length);
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
