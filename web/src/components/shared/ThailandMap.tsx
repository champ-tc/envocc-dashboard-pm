'use client';
import { MapContainer, TileLayer, GeoJSON, useMap, Pane } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useMemo } from 'react';
import L from 'leaflet';
import { PROVINCE_MAPPING } from '@/lib/constants';

// Helper to fix broken Thai characters (Mojibake)
const fixThaiMojibake = (str: string) => {
    if (!str) return '';
    
    // ตรวจสอบว่ามีภาษาไทยอยู่แล้วหรือไม่ (\u0E00-\u0E7F) 
    // ถ้ามีอยู่แล้วไม่ต้อง Decode ซ้ำ (ช่วยป้องกันกรณีมีอักขระพิเศษปนแต่เป็นไทยที่อ่านออกแล้ว)
    const hasThai = /[ก-ฮะ-์]/.test(str);
    if (hasThai && !str.includes('à')) return str;

    try {
        const win1252Map: Record<number, number> = {
            8364: 0x80, 8218: 0x82, 402: 0x83, 8222: 0x84, 8230: 0x85, 8224: 0x86, 8225: 0x87,
            710: 0x88, 8240: 0x89, 352: 0x8A, 8249: 0x8B, 338: 0x8C, 381: 0x8E, 8216: 0x91,
            8217: 0x92, 8220: 0x93, 8221: 0x94, 8226: 0x95, 8211: 0x96, 8212: 0x97, 732: 0x98,
            8482: 0x99, 353: 0x9A, 8250: 0x9B, 339: 0x9C, 382: 0x9E, 376: 0x9F,
            // Add missing common characters that might appear in Thai Mojibake
            129: 0x81, 141: 0x8D, 143: 0x8F, 144: 0x90, 157: 0x9D
        };

        const bytes = new Uint8Array(str.split('').map(c => {
            const code = c.charCodeAt(0);
            return win1252Map[code] || (code < 256 ? code : 63);
        }));
        
        const decoded = new TextDecoder('utf-8').decode(bytes);
        // ถ้าผลลัพธ์มีภาษาไทย ให้ใช้ผลลัพธ์นั้น
        if (/[ก-ฮะ-์]/.test(decoded)) return decoded;
        return str;
    } catch (e) {
        return str;
    }
};

// Helper สำหรับทำความสะอาดชื่อเพื่อการจับคู่
const cleanThaiName = (name: string) => {
    if (!name) return '';
    return name
        .toString()
        .trim()
        .replace(/^(อำเภอเมือง|อำเภอ|เขต|จังหวัด|ต\.|อ\.|จ\.|เมือง)/, '')
        .replace(/\s+/g, '')
        .replace(/เเ/g, 'แ')
        .trim();
};

const normalizeProvinceName = (pName: string) => {
    if (!pName) return '';
    const fixed = fixThaiMojibake(pName).trim();
    if (fixed === 'กรุงเทพมหานคร' || fixed === 'Bangkok' || fixed === 'Bangkok Metropolis') {
        return 'กรุงเทพมหานคร';
    }
    for (const [en, th] of Object.entries(PROVINCE_MAPPING)) {
        if (fixed.toLowerCase() === en.toLowerCase()) return th;
    }
    return fixed;
};

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
}

function Legend({ config }: { config: ThailandMapProps['legendConfig'] }) {
    return (
        <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3 pointer-events-none sm:pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-slate-100 min-w-[100px] sm:min-w-[120px] flex flex-col gap-1.5 scale-90 sm:scale-100 origin-bottom-left transition-transform">
                <div className="flex flex-col items-center text-center mb-1">
                    <h4 className="text-[8px] sm:text-[9px] font-extrabold text-slate-800 leading-tight uppercase tracking-tight">{config.title}</h4>
                    <div className="text-[8px] uppercase font-bold text-slate-400">({config.unit})</div>
                </div>
                <div className="flex flex-col gap-1.5">
                    {config.items.map((item) => (
                        <div key={item.range} className="flex items-center gap-2 px-1">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: item.color }}></div>
                            <span className="text-[8px] font-extrabold text-slate-600 leading-none whitespace-nowrap">{item.range}</span>
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
        let targetBounds: L.LatLngBounds | null = null;

        if (selectedDistricts.length > 0 && tambonGeoData && tambonGeoData.features.length > 0) {
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
            map.fitBounds(targetBounds, { padding: [40, 40], duration: 1.2 });
            lastBoundsRef.current = boundsKey;
        }
    }, [filters.provinces, filters.districts, geoData, tambonGeoData, map]);
    return null;
}

export default function ThailandMap({ data, stations = [], filters, getColor, legendConfig, popupUnit = 'หน่วย', renderPopup, interactive = true }: ThailandMapProps) {
    const [geoData, setGeoData] = useState<any>(null);
    const [allTambonData, setAllTambonData] = useState<any>(null);
    const [loadingTambon, setLoadingTambon] = useState(false);
    const geoJsonRef = useRef<any>(null);
    const tambonGeoJsonRef = useRef<any>(null);
    const center: [number, number] = [13.736717, 100.523186];
    const bounds: L.LatLngBoundsExpression = [[5.0, 97.0], [21.0, 106.0]];

    const normalizedData = useMemo(() => {
        const m: Record<string, any> = {};
        Object.entries(data || {}).forEach(([k, v]) => {
            m[cleanThaiName(k)] = v;
        });
        return m;
    }, [data]);

    const dataRef = useRef(normalizedData);
    useEffect(() => {
        dataRef.current = normalizedData;
    }, [normalizedData]);

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

    useEffect(() => {
        setLoadingTambon(true);
        fetch('/data/tambon_boundaries.geojson')
            .then(res => res.json())
            .then(data => {
                setAllTambonData(data);
                setLoadingTambon(false);
            })
            .catch(err => {
                console.error('Error loading tambons:', err);
                setLoadingTambon(false);
            });
    }, []);

    const displayGeoData = useMemo(() => {
        if (!geoData) return null;
        const selectedProvinces = (filters.provinces || []).map((p: string) => cleanThaiName(p));
        const selectedDistricts = (filters.districts || []).map((d: string) => cleanThaiName(d));

        if (selectedDistricts.length > 0) return { ...geoData, features: [] };
        if (selectedProvinces.length === 0) return geoData;

        return {
            ...geoData,
            features: geoData.features.filter((f: any) => {
                const provinceEn = f.properties.name;
                const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
                return selectedProvinces.includes(cleanThaiName(provinceTh));
            })
        };
    }, [geoData, filters.provinces, filters.districts]);

    const displayTambonData = useMemo(() => {
        if (!allTambonData) return null;
        const selectedProvinces = (filters.provinces || []).map((p: string) => cleanThaiName(p));
        const selectedDistricts = (filters.districts || []).map((d: string) => cleanThaiName(d));

        const filteredFeatures = allTambonData.features.filter((f: any) => {
            const pNameRaw = f.properties.ADM1_TH || '';
            const dNameRaw = f.properties.ADM2_TH || '';
            const tNameRaw = f.properties.ADM3_TH || '';
            
            const provinceTh = normalizeProvinceName(pNameRaw);
            const districtTh = fixThaiMojibake(dNameRaw);
            const subdistrictTh = fixThaiMojibake(tNameRaw).trim();
            
            const cleanP = cleanThaiName(provinceTh);
            const cleanD = cleanThaiName(districtTh);

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

        return { ...allTambonData, features: filteredFeatures };
    }, [allTambonData, filters.provinces, filters.districts, stationMap]);

    const style = (feature: any) => {
        const provinceEn = feature.properties.name;
        const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
        const cleanP = cleanThaiName(provinceTh);
        const selectedProvinces = (filters.provinces || []).map((p: string) => cleanThaiName(p));
        const isSelected = selectedProvinces.length > 0 ? selectedProvinces.includes(cleanP) : true;

        const rawValue = normalizedData[cleanP] || { value: 0, rate: 0 };
        const value = typeof rawValue === 'object' ? (rawValue.value || 0) : (rawValue || 0);
        return {
            fillColor: getColor(value),
            weight: isSelected ? 1.5 : 0.8,
            opacity: 1,
            color: isSelected ? '#475569' : '#cbd5e1',
            fillOpacity: isSelected ? 0.7 : 0.2
        };
    };

    const pm25ColorScale = (val: number) => {
        if (val === 0) return 'transparent';
        if (val <= 15) return '#0ea5e9';
        if (val <= 25) return '#10b981';
        if (val <= 37.5) return '#eab308';
        if (val <= 75) return '#f97316';
        return '#f43f5e';
    };

    const tambonStyle = (feature: any) => {
        const pNameRaw = feature.properties.ADM1_TH || '';
        const dNameRaw = feature.properties.ADM2_TH || '';
        const tNameRaw = feature.properties.ADM3_TH || '';

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
        const station = stationMap.get(key);

        let fillColor = 'transparent';
        let fillOpacity = 0;

        if (station) {
            fillColor = pm25ColorScale(station.pm25);
            fillOpacity = 0.8;
        } else if (isDistrictSelected) {
            const rawValue = normalizedData[cleanP] || { value: 0, rate: 0 };
            const value = typeof rawValue === 'object' ? (rawValue.value || 0) : (rawValue || 0);
            fillColor = getColor(value);
            fillOpacity = 0.4;
        }

        return {
            fillColor,
            weight: isProvinceSelected ? 0.3 : 0.1,
            opacity: 0.8,
            color: '#475569',
            fillOpacity,
            interactive: !!station || isDistrictSelected
        };
    };

    const onEachFeature = (feature: any, layer: any) => {
        const provinceEn = feature.properties.name;
        const provinceTh = normalizeProvinceName(PROVINCE_MAPPING[provinceEn] || provinceEn);
        
        layer.on({
            mouseover: (e: any) => {
                const l = e.target;
                l.setStyle({ weight: 2.5, color: '#1e293b', fillOpacity: 0.8 });
                l.bringToFront();
                
                const cleanP = cleanThaiName(provinceTh);
                const latestRawValue = dataRef.current[cleanP];
                const displayValue = (latestRawValue && typeof latestRawValue === 'object') 
                    ? (latestRawValue.value ?? 0) 
                    : (latestRawValue ?? 0);

                const popupContent = renderPopup ? renderPopup(provinceTh, latestRawValue, popupUnit) : `
                    <div class="font-sans p-2 min-w-[120px]">
                        <div class="text-base font-extrabold text-slate-800 mb-2 leading-tight">${provinceTh}</div>
                        <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span class="text-2xl font-extrabold text-slate-900">${Number(displayValue).toLocaleString()}</span>
                            <span class="text-[10px] font-bold text-slate-400 ml-1">${popupUnit}</span>
                        </div>
                    </div>
                `;

                l.bindTooltip(popupContent, { 
                    sticky: true, 
                    className: 'custom-map-tooltip-container',
                    direction: 'top',
                    offset: [0, -20]
                }).openTooltip(e.latlng);
            },
            mouseout: (e: any) => {
                const l = e.target;
                l.setStyle(style(l.feature));
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
        const station = stationMap.get(key);

        if (station) {
            const tooltipContent = `
                <div class="flex flex-col gap-0.5">
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">พื้นที่</div>
                    <div class="text-xs font-extrabold text-white mb-1">ต.${subdistrictTh}, อ.${districtTh}</div>
                    <div class="h-[1px] bg-slate-700 my-1"></div>
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full" style="background-color: ${pm25ColorScale(station.pm25)}"></div>
                        <span class="text-xs font-extrabold text-blue-300">PM2.5: ${station.pm25.toFixed(1)}</span>
                    </div>
                </div>
            `;
            layer.bindTooltip(tooltipContent, { sticky: true, className: 'custom-tooltip' });
        }
        
        layer.on({
            mouseover: (e: any) => {
                if (station) {
                    const l = e.target;
                    l.setStyle({ weight: 1, color: '#000', fillOpacity: 0.9 });
                }
                
                const cleanP = cleanThaiName(provinceTh);
                const latestRawValue = dataRef.current[cleanP];
                const displayValue = (latestRawValue && typeof latestRawValue === 'object') 
                    ? (latestRawValue.value ?? 0) 
                    : (latestRawValue ?? 0);

                const popupContent = renderPopup ? renderPopup(provinceTh, latestRawValue, popupUnit) : `
                    <div class="font-sans p-2 min-w-[120px]">
                        <div class="text-base font-extrabold text-slate-800 mb-2 leading-tight">${provinceTh}</div>
                        <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span class="text-2xl font-extrabold text-slate-900">${Number(displayValue).toLocaleString()}</span>
                            <span class="text-[10px] font-bold text-slate-400 ml-1">${popupUnit}</span>
                        </div>
                    </div>
                `;
                
                const l = e.target;
                // Only bind province tooltip if we don't already have a station tooltip
                if (!station) {
                    l.bindTooltip(popupContent, { 
                        sticky: true, 
                        className: 'custom-map-tooltip-container',
                        direction: 'top',
                        offset: [0, -20]
                    }).openTooltip(e.latlng);
                }
            },
            mouseout: (e: any) => {
                const l = e.target;
                l.setStyle(tambonStyle(l.feature));
                if (!station) l.unbindTooltip();
            }
        });
    };

    return (
        <div className="w-full h-full relative group">
            {loadingTambon && (
                <div className="absolute top-6 right-6 z-[1001] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">Loading Map Data...</span>
                </div>
            )}
            <MapContainer
                center={center} zoom={4.5} minZoom={4} maxBounds={bounds}
                zoomSnap={0.1} zoomDelta={0.5}
                style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0, backgroundColor: '#f8fafc' }}
                zoomControl={interactive} dragging={interactive} scrollWheelZoom={interactive} doubleClickZoom={interactive}
                maxBoundsViscosity={1.0}
                attributionControl={false}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <Pane name="provinces" style={{ zIndex: 400 }}>
                    {displayGeoData && (
                        <GeoJSON 
                            ref={geoJsonRef} 
                            key={`provinces-${filters.provinces?.join('-')}-${filters.districts?.length}-${Object.keys(data).length}`} 
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
                            key={`tambon-${filters.provinces?.join('-')}-${filters.districts?.join('-')}-${stations.length}-${Object.keys(data).length}`} 
                            data={displayTambonData} 
                            style={tambonStyle} 
                            onEachFeature={onEachTambon} 
                        />
                    )}
                </Pane>
                <MapResizer geoData={geoData} tambonGeoData={displayTambonData} filters={filters} />
            </MapContainer>
            <Legend config={legendConfig} />
            <style jsx global>{`
                .custom-tooltip {
                    background-color: rgba(15, 23, 42, 0.9);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 4px 8px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
                .custom-map-tooltip-container {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }
                .leaflet-tooltip-top:before, .leaflet-tooltip-bottom:before, .leaflet-tooltip-left:before, .leaflet-tooltip-right:before {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
