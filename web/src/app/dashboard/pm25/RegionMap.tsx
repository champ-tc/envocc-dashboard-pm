'use client';

import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { PROVINCE_MAPPING } from '@/lib/constants';
import { buildRegionMap } from './region-map-data';

let boundaryRequest: Promise<FeatureCollection> | undefined;
function loadBoundaries() {
    if (!boundaryRequest) {
        boundaryRequest = fetch('/data/thailand-provinces.json').then(response => {
            if (!response.ok) throw new Error('โหลดขอบเขตพื้นที่ไม่สำเร็จ');
            return response.json() as Promise<FeatureCollection>;
        }).catch(error => { boundaryRequest = undefined; throw error; });
    }
    return boundaryRequest;
}

function FitRegions({ areas }: { areas: FeatureCollection }) {
    const map = useMap();
    useEffect(() => {
        const bounds = L.geoJSON(areas).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], animate: false });
    }, [map, areas]);
    return null;
}

interface Props {
    regions: string[];
    hierarchy: { region: string; province: string }[];
    values: Record<string, number>;
    metric: string;
    unit: string;
    getColor: (value: number) => string;
}

export default function RegionMap({ regions, hierarchy, values, metric, unit, getColor }: Props) {
    const [source, setSource] = useState<FeatureCollection | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        setError(false);
        loadBoundaries().then(data => { if (active) setSource(data); })
            .catch(() => { if (active) setError(true); });
        return () => { active = false; };
    }, [attempt]);
    const areas = useMemo(() => source ? buildRegionMap(source, hierarchy, regions, values, PROVINCE_MAPPING) : null,
        [source, hierarchy, regions, values]);
    const displayName = (region: string) => region === 'กรุงเทพมหานคร' ? 'เขตสุขภาพที่ 13 (กรุงเทพมหานคร)' : region;

    if (error) return <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-white">
        โหลดขอบเขตพื้นที่ไม่สำเร็จ
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAttempt(value => value + 1)}>ลองอีกครั้ง</button>
    </div>;
    if (!areas) return <div role="status" className="flex h-full items-center justify-center text-white/70">กำลังโหลดแผนที่เขตสุขภาพ…</div>;
    if (!areas.features.length) return <div role="status" className="flex h-full items-center justify-center text-white/70">ไม่พบขอบเขตของเขตสุขภาพที่เลือก</div>;

    return <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
            <MapContainer center={[13.7, 100.5]} zoom={5} zoomSnap={0.1} zoomControl={false}
                dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false}
                attributionControl={false} style={{ height: '100%', width: '100%', background: '#f8fafc' }}>
                <GeoJSON key={JSON.stringify([areas.features.map(feature => feature.properties), metric])} data={areas}
                    style={feature => ({ stroke: false, fillColor: getColor(feature?.properties?.value || 0), fillOpacity: 0.85 })}
                    onEachFeature={(feature, layer) => {
                        const content = document.createElement('div');
                        const title = document.createElement('strong');
                        title.textContent = displayName(feature.properties.region);
                        const summary = document.createElement('div');
                        summary.textContent = `${metric}: ${feature.properties.value.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ${unit}`;
                        content.append(title, summary);
                        layer.bindTooltip(content, { sticky: true });
                        layer.bindPopup(content.cloneNode(true) as HTMLElement);
                    }} />
                <FitRegions areas={areas} />
            </MapContainer>
        </div>
        <div className="max-h-32 shrink-0 space-y-1 overflow-y-auto p-3 text-xs text-white/80">
            <p>{metric} — เลือกค่าสูงสุดจากจังหวัดในเขต ไม่รวมค่าเข้าด้วยกัน</p>
            {areas.features.map(feature => <div key={feature.properties.region} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getColor(feature.properties.value) }} />
                <span>{displayName(feature.properties.region)}: {feature.properties.value.toLocaleString('th-TH', { maximumFractionDigits: 2 })} {unit}</span>
            </div>)}
        </div>
    </div>;
}
