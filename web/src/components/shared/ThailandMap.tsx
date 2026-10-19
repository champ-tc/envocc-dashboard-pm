'use client';
import { MapContainer, GeoJSON, useMap, Pane } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useMemo } from 'react';
import L from 'leaflet';
import { PROVINCE_MAPPING } from '@/lib/constants';
import { PM25Text } from '@/components/PM25Mark';
import { loadTambonBoundaries, needsTambonBoundaries } from '@/lib/dashboard-map-data';

import {
    fixThaiMojibake,
    cleanThaiName,
    normalizeProvinceName,
    getProvinceFeatureStyle
} from './thailand-map-utils';

interface ThailandMapProps {
    data: Record<string, any>;
    stations?: any[];
    filters: any;
    getColor: (val: number) => string;
    legendConfig: {
        title: string;
        unit: string;
        items: { range: string, color: string }[];
    };
    popupUnit?: string;
    renderPopup?: (province: string, value: any, popupUnit: string) => string;
    interactive?: boolean;
    focusSelectedSubdistricts?: boolean;
    requireDistrictForTambons?: boolean;
    visibleProvinces?: string[];
    /** Opt-in exact geographic lookup: undefined indicates no data; area remains visible with boundary lines. */
    resolveAreaData?: (area: { province: string; district?: string; subdistrict?: string }, level: 'province' | 'district' | 'subdistrict') => { value: number; [key: string]: any } | undefined;
}

function Legend({ config }: { config: ThailandMapProps['legendConfig'] }) {
    return (
        <div className="map-export-legend shrink-0 w-full pt-4 pointer-events-none sm:pointer-events-auto" data-export-legend="true" data-legend-title={config.title}>
            <div className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-slate-100 w-full flex flex-col gap-2">
                <div className="flex flex-col items-center text-center mb-1">
                    <h4 className="typo-section text-slate-800 uppercase"><PM25Text>{config.title}</PM25Text></h4>
                    {config.unit && <div className="typo-chart uppercase text-slate-400">({config.unit})</div>}
                </div>
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                    {config.items.map((item) => (
                        <div key={item.range} className="map-export-legend-item flex items-center gap-2 px-1" data-range={item.range} data-color={item.color}>
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: item.color }}></div>
                            <span className="typo-chart text-slate-600 whitespace-nowrap">{item.range}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MapResizer({ geoData, tambonGeoData, filters }: { geoData: any, tambonGeoData: any, filters: any }) {
    const map = useMap();
    const lastBoundsRef = useRef<string>('');

    useEffect(() => {
        if (!geoData || !map) return;
        const selectedProvinces = filters.provinces || [];
        const selectedDistricts = filters.districts || [];
        const selectedSubdistricts = filters.subdistricts || [];
        let targetBounds: L.LatLngBounds | null = null;

        if ((selectedDistricts.length > 0 || selectedSubdistricts.length > 0) && tambonGeoData && tambonGeoData.features.length > 0) {
            const bounds = L.geoJSON(tambonGeoData).getBounds();
            if (bounds.isValid()) targetBounds = bounds;
        } 
        
        if (!targetBounds && selectedProvinces.length > 0) {
            const targetFeatures = geoData.features.filter((f: any) => {
                const provinceEn = f.properties.name;
                const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
                const cleanP = cleanThaiName(provinceTh);
                return selectedProvinces.some((p: string) => cleanThaiName(p) === cleanP);
            });
            if (targetFeatures.length > 0) {
                targetBounds = L.geoJSON({ type: 'FeatureCollection', features: targetFeatures } as any).getBounds();
            }
        }

        if (!targetBounds || !targetBounds.isValid()) {
            targetBounds = L.latLngBounds([[5.5, 97.0], [20.5, 106.0]]);
        }

        const boundsKey = targetBounds.toBBoxString();
        if (boundsKey !== lastBoundsRef.current) {
            map.fitBounds(targetBounds, { padding: [40, 40], maxZoom: 13, duration: 1.2 });
            lastBoundsRef.current = boundsKey;
        }
    }, [filters.provinces, filters.districts, filters.subdistricts, geoData, tambonGeoData, map]);
    return null;
}

export default function ThailandMap({ data, stations = [], filters, getColor, legendConfig, popupUnit = 'หน่วย', renderPopup, interactive = true, focusSelectedSubdistricts = false, requireDistrictForTambons = false, visibleProvinces, resolveAreaData }: ThailandMapProps) {
    const [geoData, setGeoData] = useState<any>(null);
    const [allTambonData, setAllTambonData] = useState<any>(null);
    const [allDistrictData, setAllDistrictData] = useState<any>(null);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const showDistrictBoundaries = focusSelectedSubdistricts && filters.provinces?.length > 0 && !filters.districts?.length;
    const [loadingTambon, setLoadingTambon] = useState(false);
    const geoJsonRef = useRef<any>(null);
    const tambonGeoJsonRef = useRef<any>(null);
    const center: [number, number] = [13.736717, 100.523186];
    const bounds: L.LatLngBoundsExpression = [[5.0, 97.0], [21.0, 106.0]];

    const normalizedData = useMemo(() => {
        const m: Record<string, any> = {};
        Object.entries(data || {}).forEach(([k, v]) => {
            m[cleanThaiName(k)] = v;
            const parts = k.split('-');
            if (parts.length === 3) {
                m[`${cleanThaiName(parts[0])}-${cleanThaiName(parts[1])}-${cleanThaiName(parts[2])}`] = v;
            } else if (parts.length === 2) {
                m[`${cleanThaiName(parts[0])}-${cleanThaiName(parts[1])}`] = v;
            }
        });
        return m;
    }, [data]);

    const dataRef = useRef(normalizedData);
    dataRef.current = normalizedData;
    useEffect(() => {
        dataRef.current = normalizedData;
    }, [normalizedData]);

    const dataSignature = useMemo(() => {
        if (!data) return '';
        const entries = Object.entries(data);
        if (entries.length === 0) return 'empty';
        return entries
            .map(([k, v]) => `${k}:${typeof v === 'object' ? (v?.value ?? 0) : v}`)
            .join(';');
    }, [data]);

    const stationMap = useMemo(() => {
        const m = new Map();
        if (!stations) return m;
        stations.forEach(s => {
            const province = (s.province || '').trim();
            const district = (s.district || '').trim();
            const subdistrict = (s.subdistrict || '').trim();
            const key = `${province}-${district}-${subdistrict}`;
            m.set(key, s);
        });
        return m;
    }, [stations]);

    useEffect(() => {
        fetch('/data/thailand-provinces.json')
            .then(res => res.json())
            .then(data => setGeoData(data))
            .catch(err => console.error('Error loading provinces:', err));
    }, []);

    const needsTambons = needsTambonBoundaries(filters, focusSelectedSubdistricts ? 0 : stations.length, requireDistrictForTambons);
    // The province selector contains Thailand's full province list. Treat a
    // full selection as the national overview, just like an empty selection.
    const isAllProvincesSelected = (filters.provinces?.length || 0) >= 70 && !(filters.districts?.length);
    const effectiveShowDistrictBoundaries = showDistrictBoundaries && !isAllProvincesSelected;

    useEffect(() => {
        if (!showDistrictBoundaries || allDistrictData) {
            setLoadingDistricts(false);
            return;
        }
        let active = true;
        setLoadingDistricts(true);
        fetch('/data/dds-district-boundaries.geojson')
            .then(response => {
                if (!response.ok) throw new Error('Unable to load district boundaries');
                return response.json();
            })
            .then(data => { if (active) setAllDistrictData(data); })
            .catch(error => console.error('Error loading districts:', error))
            .finally(() => { if (active) setLoadingDistricts(false); });
        return () => { active = false; };
    }, [showDistrictBoundaries, allDistrictData]);

    useEffect(() => {
        if (!needsTambons || showDistrictBoundaries || allTambonData) {
            setLoadingTambon(false);
            return;
        }
        let active = true;
        setLoadingTambon(true);
        loadTambonBoundaries()
            .then(data => {
                if (!active) return;
                setAllTambonData(data);
                setLoadingTambon(false);
            })
            .catch(err => {
                if (!active) return;
                console.error('Error loading tambons:', err);
                setLoadingTambon(false);
            });
        return () => { active = false; };
    }, [needsTambons, showDistrictBoundaries, allTambonData]);

    const displayGeoData = useMemo(() => {
        if (!geoData) return null;
        const selectedProvinces = (visibleProvinces ?? filters.provinces ?? []).map((p: string) => cleanThaiName(p));
        const selectedDistricts = (filters.districts || []).map((d: string) => cleanThaiName(d));

        if (selectedDistricts.length > 0 || effectiveShowDistrictBoundaries) return { ...geoData, features: [] };
        if (selectedProvinces.length === 0 && visibleProvinces === undefined) return geoData;

        return {
            ...geoData,
            features: geoData.features.filter((f: any) => {
                const provinceEn = f.properties.name;
                const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
                return selectedProvinces.length === 0 && visibleProvinces === undefined || selectedProvinces.includes(cleanThaiName(provinceTh));
            })
        };
    }, [geoData, filters.provinces, filters.districts, effectiveShowDistrictBoundaries, visibleProvinces]);

    const displayTambonData = useMemo(() => {
        const boundaryData = effectiveShowDistrictBoundaries ? allDistrictData : allTambonData;
        if (!needsTambons || isAllProvincesSelected || !boundaryData) return null;
        const selectedProvinces = (filters.provinces || []).map((p: string) => cleanThaiName(p));
        const selectedDistricts = (filters.districts || []).map((d: string) => cleanThaiName(d));
        const selectedSubdistricts = (filters.subdistricts || []).map((s: string) => cleanThaiName(s));
        const filteredFeatures = boundaryData.features.filter((f: any) => {
            const pNameRaw = f.properties.ADM1_TH || '';
            const dNameRaw = f.properties.ADM2_TH || '';
            const tNameRaw = f.properties.ADM3_TH || '';
            
            const provinceTh = normalizeProvinceName(pNameRaw);
            const districtTh = fixThaiMojibake(dNameRaw);
            const subdistrictTh = fixThaiMojibake(tNameRaw).trim();

            // Keep boundary features even when there is no metric, so users can
            // identify every district/tambon by hovering the map.
            
            const cleanP = cleanThaiName(provinceTh);
            const cleanD = cleanThaiName(districtTh);
            const cleanT = cleanThaiName(subdistrictTh);

            if (!effectiveShowDistrictBoundaries && selectedSubdistricts.length > 0) {
                const matchSubdistrict = selectedSubdistricts.includes(cleanT);
                if (selectedDistricts.length > 0) {
                    const matchDistrict = selectedDistricts.includes(cleanD);
                    if (selectedProvinces.length > 0) {
                        return matchSubdistrict && matchDistrict && selectedProvinces.includes(cleanP);
                    }
                    return matchSubdistrict && matchDistrict;
                }
                return matchSubdistrict;
            }

            if (selectedDistricts.length > 0) {
                const matchDistrict = selectedDistricts.includes(cleanD);
                if (selectedProvinces.length > 0) {
                    return matchDistrict && selectedProvinces.includes(cleanP);
                }
                return matchDistrict;
            }

            if (selectedProvinces.length > 0) {
                return selectedProvinces.includes(cleanP);
            }

            const key = `${provinceTh}-${districtTh.trim()}-${subdistrictTh}`;
            return stationMap.has(key);
        });

        return { ...boundaryData, features: filteredFeatures };
    }, [needsTambons, isAllProvincesSelected, effectiveShowDistrictBoundaries, allTambonData, allDistrictData, filters.provinces, filters.districts, filters.subdistricts, focusSelectedSubdistricts, stationMap, resolveAreaData]);

    const style = (feature: any) => {
        const provinceEn = feature.properties.name;
        const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
        const cleanP = cleanThaiName(provinceTh);
        const selectedProvinces = (filters.provinces || []).map((p: string) => cleanThaiName(p));
        const isSelected = selectedProvinces.length > 0 ? selectedProvinces.includes(cleanP) : true;

        const currentData = dataRef.current || normalizedData;
        const rawValue = resolveAreaData ? (resolveAreaData({ province: provinceTh }, 'province') ?? currentData[cleanP]) : currentData[cleanP];

        return getProvinceFeatureStyle({
            isSelected,
            focusSelectedSubdistricts,
            rawValue,
            getColor
        });
    };

    const styleRef = useRef(style);
    styleRef.current = style;

    const pm25ColorScale = (val: number) => {
        if (val === 0) return 'transparent';
        if (val <= 15) return '#0ea5e9';
        if (val <= 25) return '#10b981';
        if (val <= 37.5) return '#eab308';
        if (val <= 75) return '#f97316';
        return '#f43f5e';
    };

    const getAdaptiveTooltipOptions = (e: any) => {
        const map = e.target?._map;
        const size = map?.getSize?.();
        const point = e.containerPoint || (map && e.latlng ? map.latLngToContainerPoint(e.latlng) : null);
        const baseOptions = {
            sticky: true,
            className: 'custom-map-tooltip-container',
        };

        if (!size || !point) {
            return { ...baseOptions, direction: 'auto' as const, offset: [0, 0] as [number, number] };
        }

        if (point.y < 190) {
            return { ...baseOptions, direction: 'bottom' as const, offset: [0, 24] as [number, number] };
        }
        if (point.y > size.y - 190) {
            return { ...baseOptions, direction: 'top' as const, offset: [0, -24] as [number, number] };
        }
        if (point.x < 220) {
            return { ...baseOptions, direction: 'right' as const, offset: [24, 0] as [number, number] };
        }
        if (point.x > size.x - 220) {
            return { ...baseOptions, direction: 'left' as const, offset: [-24, 0] as [number, number] };
        }

        return { ...baseOptions, direction: 'top' as const, offset: [0, -24] as [number, number] };
    };

    const tambonStyle = (feature: any) => {
        const pNameRaw = feature?.properties?.ADM1_TH || '';
        const dNameRaw = feature?.properties?.ADM2_TH || '';
        const tNameRaw = feature?.properties?.ADM3_TH || '';

        const provinceTh = normalizeProvinceName(pNameRaw);
        const districtTh = fixThaiMojibake(dNameRaw);
        const subdistrictTh = fixThaiMojibake(tNameRaw).trim();

        const cleanP = cleanThaiName(provinceTh);
        const cleanD = cleanThaiName(districtTh);
        const selectedProvinces = (filters.provinces || []).map((p: string) => cleanThaiName(p));
        const selectedDistricts = (filters.districts || []).map((d: string) => cleanThaiName(d));

        const isProvinceSelected = selectedProvinces.includes(cleanP);
        const isDistrictSelected = selectedDistricts.includes(cleanD);

        const key = `${provinceTh}-${districtTh.trim()}-${subdistrictTh}`;
        const subdistrictKey = `${provinceTh}-${districtTh.trim()}-${subdistrictTh}`;
        const districtKey = `${provinceTh}-${districtTh.trim()}`;
        const cleanT = cleanThaiName(subdistrictTh);
        const normalizedSubdistrictKey = `${cleanP}-${cleanD}-${cleanT}`;
        const normalizedDistrictKey = `${cleanP}-${cleanD}`;
        const station = stationMap.get(key);
        const currentData = dataRef.current || normalizedData;
        const rawAreaValue = resolveAreaData
            ? resolveAreaData({ province: provinceTh, district: districtTh.trim(), subdistrict: subdistrictTh }, showDistrictBoundaries ? 'district' : 'subdistrict')
            : currentData[normalizedSubdistrictKey] || currentData[cleanThaiName(subdistrictKey)] || currentData[normalizedDistrictKey] || currentData[cleanThaiName(districtKey)] || currentData[cleanD] || currentData[cleanP];

        let fillColor = 'transparent';
        let fillOpacity = 0;

        if (station) {
            fillColor = pm25ColorScale(station.pm25);
            fillOpacity = 0.8;
        } else if (rawAreaValue || isDistrictSelected) {
            const value = typeof rawAreaValue === 'object' ? (rawAreaValue.value || 0) : (rawAreaValue || 0);
            fillColor = getColor(value);
            fillOpacity = value > 0 ? 0.7 : 0.25;
        }

        return {
            fillColor,
            weight: focusSelectedSubdistricts ? (showDistrictBoundaries ? 2 : 1.5) : (isProvinceSelected ? 0.3 : 0.1),
            opacity: focusSelectedSubdistricts ? 1 : 0.8,
            color: focusSelectedSubdistricts ? '#1e293b' : '#475569',
            fillOpacity,
            interactive: showDistrictBoundaries || !!station || !!rawAreaValue || isDistrictSelected || !!resolveAreaData
        };
    };

    const tambonStyleRef = useRef(tambonStyle);
    tambonStyleRef.current = tambonStyle;

    const onEachFeature = (feature: any, layer: any) => {
        const provinceEn = feature.properties.name;
        const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
        
        layer.on({
            mouseover: (e: any) => {
                const l = e.target;
                l.setStyle({ weight: 2.5, color: '#1e293b', fillOpacity: 0.8 });
                if (typeof l.bringToFront === 'function') {
                    l.bringToFront();
                }
                
                const cleanP = cleanThaiName(provinceTh);
                const currentData = dataRef.current || normalizedData;
                const latestRawValue = resolveAreaData ? (resolveAreaData({ province: provinceTh }, 'province') ?? currentData[cleanP]) : currentData[cleanP];
                const popupContent = renderPopup ? renderPopup(provinceTh, latestRawValue, popupUnit) : `<div class="typo-body p-2 min-w-map-popup"><div class="typo-label text-slate-800">${provinceTh}</div></div>`;

                l.bindTooltip(popupContent, getAdaptiveTooltipOptions(e)).openTooltip(e.latlng);
            },
            mouseout: (e: any) => {
                const l = e.target;
                const currentStyle = (styleRef.current || style)(l.feature || feature);
                l.setStyle(currentStyle);
                l.unbindTooltip();
            }
        });
    };

    const onEachTambon = (feature: any, layer: any) => {
        const pNameRaw = feature.properties.ADM1_TH || '';
        const dNameRaw = feature.properties.ADM2_TH || '';
        const tNameRaw = feature.properties.ADM3_TH || '';

        const provinceTh = normalizeProvinceName(pNameRaw);
        const districtTh = fixThaiMojibake(dNameRaw);
        const subdistrictTh = fixThaiMojibake(tNameRaw).trim();

        const key = `${provinceTh}-${districtTh.trim()}-${subdistrictTh}`;
        const subdistrictKey = `${provinceTh}-${districtTh.trim()}-${subdistrictTh}`;
        const districtKey = `${provinceTh}-${districtTh.trim()}`;
        const station = stationMap.get(key);

        if (station) {
            const tooltipContent = `
                <div class="flex flex-col gap-0.5">
                    <div class="typo-chart text-slate-400 uppercase">พื้นที่</div>
                    <div class="typo-caption text-white mb-1">ต.${subdistrictTh}, อ.${districtTh}</div>
                    <div class="h-divider bg-slate-700 my-1"></div>
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full" style="background-color: ${pm25ColorScale(station.pm25)}"></div>
                        <span class="typo-caption text-blue-300">PM<span class="pm25-subscript">2.5</span>: ${station.pm25.toFixed(1)} มคก./ลบ.ม.</span>
                    </div>
                </div>
            `;
            layer.bindTooltip(tooltipContent, { sticky: true, className: 'typo-chart custom-tooltip' });
        }
        
        layer.on({
            mouseover: (e: any) => {
                const l = e.target;
                if (station) {
                    l.setStyle({ weight: 1, color: '#000', fillOpacity: 0.9 });
                } else {
                    l.setStyle({ weight: 2.5, color: '#1e293b' });
                    if (typeof l.bringToFront === 'function') {
                        l.bringToFront();
                    }
                }
                
                const cleanP = cleanThaiName(provinceTh);
                const cleanD = cleanThaiName(districtTh);
                const cleanT = cleanThaiName(subdistrictTh);
                const normalizedSubdistrictKey = `${cleanP}-${cleanD}-${cleanT}`;
                const normalizedDistrictKey = `${cleanP}-${cleanD}`;
                const currentData = dataRef.current || normalizedData;
                const latestRawValue = resolveAreaData
                    ? resolveAreaData({ province: provinceTh, district: districtTh.trim(), subdistrict: subdistrictTh }, showDistrictBoundaries ? 'district' : 'subdistrict')
                    : currentData[normalizedSubdistrictKey] || currentData[cleanThaiName(subdistrictKey)] || currentData[normalizedDistrictKey] || currentData[cleanThaiName(districtKey)] || currentData[cleanD] || currentData[cleanP];
                const areaName = resolveAreaData
                    ? (showDistrictBoundaries ? `${districtTh.trim()}, ${provinceTh}` : `${subdistrictTh}, ${districtTh.trim()}, ${provinceTh}`)
                    : showDistrictBoundaries ? `${districtTh.trim()}, ${provinceTh}` : (latestRawValue === currentData[normalizedSubdistrictKey] || latestRawValue === currentData[cleanThaiName(subdistrictKey)])
                    ? `${subdistrictTh}, ${districtTh.trim()}, ${provinceTh}`
                    : latestRawValue === currentData[cleanP] ? provinceTh : `${districtTh.trim()}, ${provinceTh}`;

                const popupContent = renderPopup ? renderPopup(areaName, latestRawValue, popupUnit) : `<div class="typo-body p-2 min-w-map-popup"><div class="typo-label text-slate-800">${areaName}</div></div>`;
                
                // Only bind province tooltip if we don't already have a station tooltip
                if (!station) {
                    l.bindTooltip(popupContent, getAdaptiveTooltipOptions(e)).openTooltip(e.latlng);
                }
            },
            mouseout: (e: any) => {
                const l = e.target;
                const currentStyle = (tambonStyleRef.current || tambonStyle)(l.feature || feature);
                l.setStyle(currentStyle);
                if (!station) l.unbindTooltip();
            }
        });
    };

    const hasAnyProvinceData = useMemo(() => {
        if (!resolveAreaData || !displayGeoData?.features?.length) return true;
        return displayGeoData.features.some((f: any) => {
            const provinceEn = f.properties.name;
            const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
            const cleanP = cleanThaiName(provinceTh);
            const currentData = dataRef.current || normalizedData;
            const rawVal = resolveAreaData ? (resolveAreaData({ province: provinceTh }, 'province') ?? currentData[cleanP]) : currentData[cleanP];
            return rawVal !== undefined && rawVal !== null && (typeof rawVal === 'object' ? rawVal.value !== undefined && rawVal.value !== null : true);
        });
    }, [resolveAreaData, displayGeoData, normalizedData]);

    return (
        <div className="w-full h-full min-h-0 relative group flex flex-col">
            {resolveAreaData && geoData && !(showDistrictBoundaries ? loadingDistricts : loadingTambon)
                && popupUnit !== 'ราย'
                && (showDistrictBoundaries || filters.districts?.length ? displayTambonData?.features.length === 0 : !hasAnyProvinceData) && (
                <div role="status" className="typo-body-sm absolute top-6 inset-x-6 z-map-loading rounded-xl bg-white/95 p-3 text-center text-slate-700">
                    ไม่พบข้อมูลฝุ่นในพื้นที่และช่วงวันที่ที่เลือก
                </div>
            )}
            {(showDistrictBoundaries ? loadingDistricts : loadingTambon) && (
                <div className="absolute top-6 right-6 z-map-loading bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="loading loading-spinner loading-md text-primary"></div>
                    <span className="typo-chart text-slate-700 uppercase">Loading Map Data...</span>
                </div>
            )}
            <div className="flex-1 min-h-0 relative">
                <MapContainer
                    center={center} zoom={4.5} minZoom={4} maxBounds={bounds}
                    zoomSnap={0.1} zoomDelta={0.5}
                    style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0, backgroundColor: '#dbeafe' }}
                    zoomControl={interactive} dragging={interactive} scrollWheelZoom={interactive} doubleClickZoom={interactive}
                    maxBoundsViscosity={1.0}
                    attributionControl={false}
                >
                {/* Local geography backdrop: no external basemap tiles or API key dependency. */}
                <Pane name="geography" style={{ zIndex: 300 }}>
                    {geoData && <GeoJSON data={geoData} interactive={false} style={() => ({ fillColor: '#cbd5e1', fillOpacity: 0.7, color: focusSelectedSubdistricts ? '#1e293b' : '#475569', weight: 1.2 })} />}
                </Pane>
                <Pane name="provinces" style={{ zIndex: 400 }}>
                    {displayGeoData && (
                        <GeoJSON 
                            ref={geoJsonRef} 
                            key={`provinces-${visibleProvinces?.join('-')}-${filters.provinces?.join('-')}-${filters.districts?.length}-${dataSignature}-${showDistrictBoundaries}`}
                            data={displayGeoData} 
                            style={style} 
                            onEachFeature={onEachFeature} 
                        />
                    )}
                </Pane>
                <Pane name="tambons" style={{ zIndex: 450 }}>
                    {displayTambonData && (
                        <GeoJSON 
                            ref={tambonGeoJsonRef}
                            key={`${showDistrictBoundaries ? 'district' : 'tambon'}-${filters.provinces?.join('-')}-${filters.districts?.join('-')}-${focusSelectedSubdistricts ? filters.subdistricts?.join('-') : ''}-${stations.length}-${dataSignature}`}
                            data={displayTambonData} 
                            style={tambonStyle} 
                            onEachFeature={onEachTambon} 
                        />
                    )}
                </Pane>
                <MapResizer geoData={geoData} tambonGeoData={displayTambonData} filters={isAllProvincesSelected ? { ...filters, provinces: [], districts: [] } : (visibleProvinces ? { ...filters, provinces: visibleProvinces } : filters)} />
                </MapContainer>
            </div>
            <Legend config={legendConfig} />
            <style jsx global>{`
                .custom-tooltip {
                    background-color: rgba(15, 23, 42, 0.9);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-family: var(--app-font-family);
                    padding: 4px 8px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
                .custom-map-tooltip-container {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                    max-width: min(340px, calc(100vw - 32px));
                    max-height: min(360px, calc(100vh - 120px));
                    overflow: auto;
                    white-space: normal;
                    pointer-events: none;
                }
                .custom-map-tooltip-container > div {
                    max-width: min(340px, calc(100vw - 32px));
                    max-height: min(360px, calc(100vh - 120px));
                    overflow: auto;
                }
                .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before, .leaflet-tooltip-left:before, .leaflet-tooltip-right:before {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
