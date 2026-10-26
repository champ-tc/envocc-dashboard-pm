import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export function buildRegionMap(
    source: FeatureCollection,
    hierarchy: { region: string; province: string }[],
    selectedRegions: string[],
    values: Record<string, number>,
    provinceNames: Record<string, string>,
): FeatureCollection<MultiPolygon, { region: string; value: number; provinceCount: number }> {
    const clean = (name: string) => name.replace(/^จังหวัด\s*/, '').trim();
    const normalizedValues = new Map(Object.entries(values).map(([name, value]) => [clean(name), value]));
    const features = [...new Set(selectedRegions)].map(region => {
        const provinces = new Set(hierarchy.filter(row => row.region === region).map(row => clean(row.province)));
        const coordinates: MultiPolygon['coordinates'] = [];
        for (const feature of source.features) {
            const name = String(feature.properties?.name || '');
            if (!provinces.has(clean(provinceNames[name] || name))) continue;
            if (feature.geometry.type === 'Polygon') coordinates.push((feature.geometry as Polygon).coordinates);
            if (feature.geometry.type === 'MultiPolygon') coordinates.push(...feature.geometry.coordinates);
        }
        const value = [...provinces].reduce((maximum, province) => {
            const amount = normalizedValues.get(province);
            return typeof amount === 'number' && Number.isFinite(amount) ? Math.max(maximum, amount) : maximum;
        }, 0);
        return {
            type: 'Feature' as const,
            geometry: { type: 'MultiPolygon' as const, coordinates },
            properties: { region, value, provinceCount: provinces.size },
        };
    });
    return { type: 'FeatureCollection', features: features.filter(feature => feature.geometry.coordinates.length > 0) };
}
