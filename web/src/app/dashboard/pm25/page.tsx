'use client';
import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getDashboardData, getFilterOptions } from './actions';

// --- Types ---
interface FilterOptions {
    dates: string[];
    regions: string[];
    provinces: string[];
    hierarchy: { region: string; province: string; district: string }[];
}

interface TrendPoint {
    date: string;
    value: number;
}

interface DashboardData {
    avgPM25: string;
    maxPM25: string;
    totalMeasurements: number;
    exceedCount: number;
    reportDate: string | null;
    regionTrend: Record<string, TrendPoint[]>;
    provinceTrend: Record<string, TrendPoint[]>;
    districtTrend: Record<string, TrendPoint[]>;
    top10Exceed: { province: string; exceed_days: number }[];
    provinceAverages: Record<string, number>;
    provinceMaxes: Record<string, number>;
    provinceStreak37: Record<string, number>;
    provinceStreak75: Record<string, number>;
}

interface Filters {
    startDate: string;
    endDate: string;
    regions: string[];
    provinces: string[];
    districts: string[];
}

const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const yearStr = (d.getFullYear() + 543).toString().slice(-2);
    return `${d.getDate()} ${months[d.getMonth()]} ${yearStr}`;
};

const summarizeDateRanges = (dates: string[]) => {
    if (!dates || dates.length === 0) return '';
    const sorted = dates
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
    
    if (sorted.length === 0) return dates.join(', ');

    const ranges: { start: Date, end: Date }[] = [];
    let currentStart = sorted[0];
    let currentEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const d = sorted[i];
        const diffDays = Math.round((d.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            currentEnd = d;
        } else {
            ranges.push({ start: currentStart, end: currentEnd });
            currentStart = d;
            currentEnd = d;
        }
    }
    ranges.push({ start: currentStart, end: currentEnd });

    return ranges.map(r => {
        if (r.start.getTime() === r.end.getTime()) {
            return formatDateShort(r.start.toISOString());
        }
        return `${formatDateShort(r.start.toISOString())}-${formatDateShort(r.end.toISOString())}`;
    }).join(', ');
};

// --- Dynamic Components ---
const ThailandMap = dynamic(() => import('@/components/shared/ThailandMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center animate-pulse border border-white/30">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-white/80 font-extrabold uppercase tracking-widest text-xs">Loading Health Map...</span>
            </div>
        </div>
    )
});

// --- Constants ---
const PM25_LEVELS = [
    { range: '0-15', color: '#0ea5e9', limit: 15, label: 'ดีมาก' },
    { range: '15-25', color: '#10b981', limit: 25, label: 'ดี' },
    { range: '25-37.5', color: '#eab308', limit: 37.5, label: 'ปานกลาง' },
    { range: '37.5-75', color: '#f97316', limit: 75, label: 'เริ่มมีผลกระทบ' },
    { range: '75+', color: '#f43f5e', limit: Infinity, label: 'มีผลกระทบ' }
];

const STREAK37_LEVELS = [
    { range: '1-3', color: '#fdba74', limit: 3 },
    { range: '4-7', color: '#fb923c', limit: 7 },
    { range: '8-14', color: '#f97316', limit: 14 },
    { range: '15+', color: '#ea580c', limit: Infinity }
];

const STREAK75_LEVELS = [
    { range: 'น้อยกว่า 2 วัน', color: 'rgba(255, 255, 255, 0.05)', limit: 1 },
    { range: '2 วันขึ้นไป', color: '#ef4444', limit: Infinity }
];

const getColor = (val: number, levels: { limit: number, color: string }[]) => {
    if (val === 0) return 'rgba(255, 255, 255, 0.05)';
    return levels.find(l => val <= l.limit)?.color || levels[levels.length - 1].color;
};

const LEGENDS = {
    pm25: { title: 'ระดับค่าฝุ่น PM2.5 (สูงสุด)', unit: 'มคก./ลบ.ม.', items: PM25_LEVELS },
    streak37: { title: 'จำนวนวันต่อเนื่อง (>37.5)', unit: 'วัน', items: STREAK37_LEVELS },
    streak75: { title: 'จำนวนวันต่อเนื่อง (>75)', unit: 'วัน', items: STREAK75_LEVELS }
};

const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// --- Sub-Components ---
function MultiSelect({ label, options, selected, onChange, placeholder = "ทั้งหมด" }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];
    const safeSelected = selected || [];
    return (
        <div className="relative col-span-1">
            <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-[150px]">
                    {safeSelected.length === 0 ? placeholder : (safeSelected.length === safeOptions.length ? 'ทั้งหมด' : safeSelected.join(', '))}
                </div>
                <svg className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-[200] mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
                        <div onClick={() => { if (safeSelected.length === safeOptions.length) onChange([]); else onChange([...safeOptions]); }} className="flex items-center gap-3 p-3.5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all border-b border-white/5 mb-1 group">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.length === safeOptions.length ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50' : 'border-white/20 group-hover:border-white/40'}`}>
                                {safeSelected.length === safeOptions.length && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-white">เลือกทั้งหมด</span>
                        </div>
                        {safeOptions.map((opt: string) => (
                            <div key={opt} onClick={() => { if (safeSelected.includes(opt)) onChange(safeSelected.filter((s: string) => s !== opt)); else onChange([...safeSelected, opt]); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-all group">
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.includes(opt) ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/30' : 'border-white/10 group-hover:border-white/30'}`}>
                                    {safeSelected.includes(opt) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={`text-xs transition-colors ${safeSelected.includes(opt) ? 'font-extrabold text-blue-400' : 'font-bold text-white/70'}`}>{opt}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function DDatePicker({ label, options, value, onChange, thaiMonths }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];

    const formatDate = (dateStr: string) => {
        if (!dateStr || !dateStr.includes('-')) return dateStr;
        const [y, m, d] = dateStr.split('-');
        return `${parseInt(d)} ${thaiMonths[parseInt(m) - 1]} ${(parseInt(y) + 543).toString().slice(-2)}`;
    };

    const grouped = useMemo(() => {
        return safeOptions.reduce((acc: any, date: string) => {
            const [y, m, d] = date.split('-');
            if (!acc[y]) acc[y] = {};
            if (!acc[y][m]) acc[y][m] = [];
            acc[y][m].push(d);
            return acc;
        }, {});
    }, [safeOptions]);

    const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div className="relative col-span-1">
            <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-[150px]">
                    {formatDate(value)}
                </div>
                <svg className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-[200] mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-96 overflow-y-auto p-5 flex flex-col gap-6 ring-1 ring-white/20 scrollbar-hide">
                        {years.map(year => (
                            <div key={year} className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 px-2">
                                    <span className="text-sm font-extrabold text-blue-400 tabular-nums">พ.ศ. {parseInt(year) + 543}</span>
                                    <div className="h-px flex-1 bg-white/10"></div>
                                </div>
                                {Object.keys(grouped[year]).sort((a, b) => b.localeCompare(a)).map(month => (
                                    <div key={month} className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-white/30 uppercase px-2">{thaiMonths[parseInt(month) - 1]}</span>
                                        <div className="grid grid-cols-7 gap-1">
                                            {grouped[year][month].sort((a: string, b: string) => a.localeCompare(b)).map((day: string) => {
                                                const dateStr = `${year}-${month}-${day}`;
                                                const isActive = value === dateStr;
                                                return (
                                                    <div key={day} onClick={() => { onChange(dateStr); setIsOpen(false); }}
                                                        className={`flex items-center justify-center h-8 rounded-lg cursor-pointer transition-all border text-[10px] font-bold
                                                        ${isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}>
                                                        {parseInt(day)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

const MultiLineChart = memo(function MultiLineChart({ title, dataGroup, loading }: any) {
    const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());
    const labels = useMemo(() => {
        const keys = Object.keys(dataGroup || {});
        if (title.includes('เขต')) {
            return keys.sort((a, b) => {
                const isBkkA = a.includes('กรุงเทพ');
                const isBkkB = b.includes('กรุงเทพ');
                if (isBkkA && !isBkkB) return 1;
                if (!isBkkA && isBkkB) return -1;
                const numA = (a.match(/\d+/) || ["0"])[0] ? parseInt((a.match(/\d+/) || ["0"])[0], 10) : 0;
                const numB = (b.match(/\d+/) || ["0"])[0] ? parseInt((b.match(/\d+/) || ["0"])[0], 10) : 0;
                return numA - numB;
            });
        }
        return keys.sort((a, b) => a.localeCompare(b, 'th'));
    }, [dataGroup, title]);
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#6366f1'];

    const maxValue = useMemo(() => {
        let max = 0;
        Object.values(dataGroup || {}).forEach((points: any) => {
            points.forEach((p: any) => { if (p.value > max) max = p.value; });
        });
        return max > 0 ? max * 1.1 : 100;
    }, [dataGroup]);

    return (
        <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full relative group ring-1 ring-white/10 overflow-hidden">
            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase mb-8 shrink-0">
                <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                {title}
                {!loading && labels.length > 0 && (
                    <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20 shadow-inner">
                        {labels.length}
                    </span>
                )}
            </h4>
            <div className="flex-1 flex gap-4 min-h-0 relative">
                <div className="flex-1 relative border-r border-white/5 pr-4">
                    {loading ? <div className="w-full h-full bg-white/5 animate-pulse rounded-2xl"></div> : (
                        <div className="w-full h-full relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                                {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white"></div>)}
                            </div>
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-hidden relative z-10">
                                {labels.map((label, idx) => {
                                    if (hiddenLabels.has(label)) return null;
                                    const points = [...(dataGroup[label] || [])].sort((a, b) => a.date.localeCompare(b.date));
                                    if (points.length === 0) return null;
                                    const color = colors[idx % colors.length];
                                    if (points.length === 1) {
                                        const y = 100 - (points[0].value / maxValue) * 100;
                                        return <circle key={label} cx="50" cy={y} r="2" fill={color} />;
                                    }
                                    const polyPoints = points.map((d, i) => `${(i / (points.length - 1)) * 100},${100 - (d.value / maxValue) * 100}`).join(' ');
                                    return <polyline key={label} points={polyPoints} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />;
                                })}
                            </svg>
                        </div>
                    )}
                </div>
                <div className="w-32 shrink-0 overflow-y-auto custom-scrollbar flex flex-col gap-2 scrollbar-hide pr-1">
                    {labels.map((label, idx) => {
                        const isHidden = hiddenLabels.has(label);
                        return (
                            <div key={label}
                                onClick={() => {
                                    setHiddenLabels(prev => {
                                        const next = new Set(prev);
                                        if (next.has(label)) next.delete(label);
                                        else next.add(label);
                                        return next;
                                    });
                                }}
                                className={`flex items-center gap-2 min-w-0 cursor-pointer transition-all ${isHidden ? 'opacity-40 grayscale' : 'hover:opacity-80'}`}>
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isHidden ? '#475569' : colors[idx % colors.length] }}></div>
                                <span className={`text-[10px] font-bold truncate transition-colors ${isHidden ? 'text-white/30' : 'text-white/60'}`} title={label}>{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            {!loading && <div className="absolute top-8 right-8 text-[9px] font-black text-white/20 uppercase tracking-widest text-right">Scale: {Math.round(maxValue)}<br />(µg/m³)</div>}
        </div>
    );
});

// --- Main Hook ---
function useDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [options, setOptions] = useState<FilterOptions>({ dates: [], regions: [], provinces: [], hierarchy: [] });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({ startDate: '', endDate: '', regions: [], provinces: [], districts: [] });

    const now = new Date();
    const limitFullDate = now.toISOString().split('T')[0];

    useEffect(() => {
        getFilterOptions().then((opts: any) => {
            if (!opts) return;
            const allDates = opts.dates || [];
            const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a));
            const filteredOptsDates = sortedDates.filter((d: string) => d <= limitFullDate);
            setOptions({ ...opts, dates: filteredOptsDates });

            if (filteredOptsDates.length) {
                const latestDateStr = filteredOptsDates[0];
                
                const d = new Date(latestDateStr);
                d.setDate(d.getDate() - 6);
                let startDate = d.toISOString().split('T')[0];
                
                if (!filteredOptsDates.includes(startDate)) {
                    startDate = filteredOptsDates[filteredOptsDates.length - 1];
                }

                setFilters(f => ({ ...f, startDate: startDate, endDate: latestDateStr }));
            }
        });
    }, []);

    useEffect(() => {
        if (!filters.startDate || !filters.endDate) return;
        setLoading(true);
        const apiFilters = {
            ...filters,
            regions: filters.regions?.length ? filters.regions : undefined,
            provinces: filters.provinces?.length ? filters.provinces : undefined,
            districts: filters.districts?.length ? filters.districts : undefined,
        };
        getDashboardData(apiFilters).then((res: any) => { setData(res); setLoading(false); });
    }, [filters]);

    const baseProvinces = useMemo(() => (filters.regions.length === 0 ? options.provinces : Array.from(new Set(options.hierarchy?.filter(h => filters.regions.includes(h.region)).map(h => h.province)))).sort((a: string, b: string) => a.localeCompare(b, 'th')), [filters.regions, options.provinces, options.hierarchy]);
    const baseDistricts = useMemo(() => (filters.provinces.length === 0 ? [] : Array.from(new Set(options.hierarchy?.filter(h => filters.provinces.includes(h.province)).map(h => h.district)))).sort((a: string, b: string) => a.localeCompare(b, 'th')), [filters.provinces, options.hierarchy]);

    const provinceMaxes = useMemo(() => {
        return data?.provinceMaxes || {};
    }, [data?.provinceMaxes]);

    const provinceToRegion = useMemo(() => {
        const map = new Map<string, string>();
        options.hierarchy?.forEach(h => {
            map.set(h.province, h.region);
            map.set(h.province.replace('จังหวัด', '').trim(), h.region);
        });
        return map;
    }, [options.hierarchy]);

    const exceedData37 = useMemo(() => {
        if (!data?.provinceTrend) return { count: 0, tooltip: undefined };
        
        const exceedingProvinces: { prov: string, dateText: string }[] = [];

        Object.entries(data.provinceTrend).forEach(([prov, trend]) => {
            if (!trend || trend.length === 0) return;
            const sorted = [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const lastPoint = sorted[sorted.length - 1]; // เช็คจากวันที่ปัจจุบัน (วันล่าสุดของข้อมูลที่กรอง)
            
            if (lastPoint && lastPoint.value > 37.5) {
                exceedingProvinces.push({ prov, dateText: formatDateShort(lastPoint.date) });
            }
        });

        if (exceedingProvinces.length === 0) return { count: 0, tooltip: undefined };

        const byRegion: Record<string, { prov: string, dateText: string }[]> = {};
        exceedingProvinces.forEach(item => {
            const region = provinceToRegion.get(item.prov) || provinceToRegion.get(`จังหวัด${item.prov}`) || 'ไม่ระบุเขต';
            if (!byRegion[region]) byRegion[region] = [];
            byRegion[region].push(item);
        });

        const tooltip = Object.entries(byRegion)
            .sort((a, b) => {
                const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
                const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
                if (numA === numB) return a[0].localeCompare(b[0], 'th');
                return numA - numB;
            })
            .map(([region, items]) => {
                let regionName = region;
                if (regionName.includes('เขต') && !regionName.includes('เขตสุขภาพที่') && !regionName.includes('กรุงเทพ')) {
                    regionName = regionName.replace('เขต', 'เขตสุขภาพที่').replace(/\s+/g, ' ').trim();
                }
                const provListStr = items.map(i => `${i.prov} (${i.dateText})`).join(', ');
                return { region: regionName, count: items.length, provinces: provListStr };
            });

        return { count: exceedingProvinces.length, tooltip };
    }, [data?.provinceTrend, provinceToRegion]);

    const exceedData75 = useMemo(() => {
        if (!data?.provinceStreak75) return { count: 0, tooltip: undefined };
        
        const exceedingProvinces: { prov: string }[] = [];

        Object.entries(data.provinceStreak75).forEach(([prov, streakCount]) => {
            if (streakCount >= 2) {
                exceedingProvinces.push({ prov });
            }
        });

        if (exceedingProvinces.length === 0) return { count: 0, tooltip: undefined };

        const byRegion: Record<string, { prov: string }[]> = {};
        exceedingProvinces.forEach(item => {
            const region = provinceToRegion.get(item.prov) || provinceToRegion.get(`จังหวัด${item.prov}`) || 'ไม่ระบุเขต';
            if (!byRegion[region]) byRegion[region] = [];
            byRegion[region].push(item);
        });

        const tooltip = Object.entries(byRegion)
            .sort((a, b) => {
                const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
                const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
                if (numA === numB) return a[0].localeCompare(b[0], 'th');
                return numA - numB;
            })
            .map(([region, items]) => {
                let regionName = region;
                if (regionName.includes('เขต') && !regionName.includes('เขตสุขภาพที่') && !regionName.includes('กรุงเทพ')) {
                    regionName = regionName.replace('เขต', 'เขตสุขภาพที่').replace(/\s+/g, ' ').trim();
                }
                const provListStr = items.map(i => i.prov).join(', ');
                return { region: regionName, count: items.length, provinces: provListStr };
            });

        return { count: exceedingProvinces.length, tooltip };
    }, [data?.provinceStreak75, provinceToRegion]);

    return { data, options, loading, filters, setFilters, baseProvinces, baseDistricts, provinceMaxes, exceedData37, exceedData75 };
}

// --- Main Page Component ---
export default function DashboardPM25() {
    const { data, options, loading, filters, setFilters, baseProvinces, baseDistricts, provinceMaxes, exceedData37, exceedData75 } = useDashboard();
    const [activeMap, setActiveMap] = useState<'avg' | 'streak37' | 'streak75'>('avg');

    return (
        <div className="min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden font-sans"
            style={{ backgroundImage: "url('/img/background.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>

            <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-screen flex flex-col gap-4">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 shrink-0 relative z-[60]">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            <div className="relative shrink-0 bg-white p-1.5 rounded-2xl shadow-2xl border border-white/50 ring-4 ring-white/10 w-12 h-12 sm:w-14 sm:h-14 z-20">
                                <Image src="/img/Logo_ddc.png" alt="DDC Logo" fill sizes="60px" className="rounded-xl object-contain p-1" priority />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h5 className="text-lg md:text-xl font-extrabold text-white leading-tight drop-shadow-md uppercase">
                                ระบบรายงานเฝ้าระวัง <span className="text-blue-400">สถานการณ์ฝุ่น PM2.5 ประเทศไทย</span>
                            </h5>
                            <p className="text-xs font-bold text-blue-200 uppercase tracking-widest opacity-80">กรมควบคุมโรค | กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/" className="bg-white/10 hover:bg-white/20 transition-all p-3.5 rounded-2xl border border-white/10 group shadow-lg">
                            <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        </Link>
                    </div>
                </header>

                {/* Filters Section - Exactly like HDC */}
                <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end shrink-0 ring-1 ring-white/10 relative z-[100]">
                    <DDatePicker label="จากวันที่" options={options.dates} value={filters.startDate} onChange={(v: string) => setFilters({ ...filters, startDate: v })} thaiMonths={thaiMonthsShort} />
                    <DDatePicker label="ถึงวันที่" options={options.dates} value={filters.endDate} onChange={(v: string) => setFilters({ ...filters, endDate: v })} thaiMonths={thaiMonthsShort} />
                    <MultiSelect label="เขตสุขภาพ" options={options.regions} selected={filters.regions} onChange={(val: string[]) => setFilters({ ...filters, regions: val, provinces: [] })} />
                    <MultiSelect label="จังหวัด" options={baseProvinces} selected={filters.provinces} onChange={(val: string[]) => setFilters({ ...filters, provinces: val, districts: [] })} />
                    <MultiSelect label="อำเภอ/เขต" options={baseDistricts} selected={filters.districts} onChange={(val: string[]) => setFilters({ ...filters, districts: val })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 relative z-[90]">
                    {[
                        { label: 'ค่าเฉลี่ย 24 ชั่วโมงฝุ่น PM2.5', value: data?.avgPM25, unit: 'µg/m³', color: '#3b82f6', isPrimary: true },
                        { label: 'ค่าเฉลี่ย 24 ชั่วโมงฝุ่น PM2.5 สูงสุด', value: data?.maxPM25, unit: 'µg/m³', color: '#f43f5e', isPrimary: false },
                        { label: 'จำนวนจังหวัดที่ค่าฝุ่น PM2.5 เกินค่ามาตรฐาน (37.5 มคก./ลบ.ม.)', value: exceedData37.count, unit: 'จังหวัด', color: '#f97316', isPrimary: false, tooltip: exceedData37.tooltip },
                        { label: 'จำนวนจังหวัดที่ค่าฝุ่น PM2.5 มากกว่า 75 มคก./ลบ.ม.', value: exceedData75.count, unit: 'จังหวัด', color: '#e11d48', isPrimary: false, tooltip: exceedData75.tooltip }
                    ].map((stat, i) => (
                        <div key={i} className={`relative ${stat.isPrimary
                            ? "bg-linear-to-br from-blue-600/90 to-sky-500/90 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/30 transition-all group min-h-32 flex flex-col justify-between"
                            : `bg-white/10 backdrop-blur-xl p-5 rounded-3xl shadow-xl border border-white/20 transition-all group ring-1 ring-white/5 min-h-32 flex flex-col justify-between ${stat.tooltip ? 'cursor-default hover:bg-white/20' : ''}`}`}>
                            <div className={`text-xs font-bold tracking-tight mb-2 leading-snug ${stat.isPrimary ? 'text-blue-100/90' : 'text-white/70'}`}>{stat.label}</div>
                            <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums flex items-end gap-2 drop-shadow-md">
                                {loading ? <div className={`h-9 w-24 animate-pulse rounded-lg ${stat.isPrimary ? 'bg-white/20' : 'bg-white/10'}`}></div> : stat.value?.toLocaleString()}
                                {!stat.isPrimary && <div className="w-1.5 h-6 rounded-full mb-1" style={{ backgroundColor: stat.color }}></div>}
                            </div>
                            <div className={`text-[10px] font-bold uppercase mt-1 ${stat.isPrimary ? 'text-white/50' : 'text-white/30'}`}>{stat.unit}</div>
                            
                            {stat.tooltip && Array.isArray(stat.tooltip) && stat.tooltip.length > 0 && (
                                <div className={`absolute top-full mt-3 w-[300px] sm:w-[450px] lg:w-[550px] max-h-[50vh] overflow-y-auto custom-scrollbar p-5 bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-[100] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-auto ${i >= 2 ? 'right-0' : 'left-0'}`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        {stat.tooltip.map((item: any, idx: number) => (
                                            <div key={idx} className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-extrabold text-blue-400 drop-shadow-sm">{item.region}</span>
                                                    <span className="text-[10px] font-extrabold text-blue-100 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30 whitespace-nowrap">{item.count} จังหวัด</span>
                                                </div>
                                                <div className="text-[11px] text-white/80 leading-relaxed font-medium">
                                                    {item.provinces}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.1fr] gap-4 flex-1 min-h-0 relative z-[10]">
                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                                <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                                แนวโน้มค่าฝุ่นรายพื้นที่
                            </h4>
                        </div>
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar scrollbar-hide">
                            <div className="h-[350px] shrink-0"><MultiLineChart title="เฉลี่ยรายเขตสุขภาพ" dataGroup={data?.regionTrend || {}} loading={loading} /></div>
                            <div className="h-[350px] shrink-0"><MultiLineChart title="สถิติรายจังหวัด" dataGroup={data?.provinceTrend || {}} loading={loading} /></div>
                            <div className="h-[350px] shrink-0"><MultiLineChart title="สถิติรายอำเภอ/เขต" dataGroup={data?.districtTrend || {}} loading={loading} /></div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex flex-col gap-4 mb-6 shrink-0">
                            <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
                                <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                                    <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40 shrink-0"></div>
                                    แผนที่รายงานระดับค่าฝุ่น
                                </h4>
                                {filters.startDate && filters.endDate && (
                                    <div className="text-[11px] font-bold text-blue-200/70 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 shrink-0 flex items-center gap-2 w-fit">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        ข้อมูล: {filters.startDate === filters.endDate 
                                            ? formatDateShort(filters.startDate) 
                                            : `${formatDateShort(filters.startDate)} - ${formatDateShort(filters.endDate)}`}
                                    </div>
                                )}
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                <button onClick={() => setActiveMap('avg')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeMap === 'avg' ? 'bg-blue-500 text-white shadow-md' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>ค่าฝุ่นPM2.5</button>
                                <button onClick={() => setActiveMap('streak37')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeMap === 'streak37' ? 'bg-orange-500 text-white shadow-md' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>เกิน 37.5</button>
                                <button onClick={() => setActiveMap('streak75')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeMap === 'streak75' ? 'bg-rose-500 text-white shadow-md' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>เกิน 75</button>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-[500px] relative rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 shadow-inner bg-slate-800/50">
                            <ThailandMap
                                data={activeMap === 'avg' ? provinceMaxes : (activeMap === 'streak37' ? (data?.provinceStreak37 || {}) : (data?.provinceStreak75 || {}))}
                                filters={filters}
                                getColor={(v: number) => getColor(v, activeMap === 'avg' ? LEGENDS.pm25.items : (activeMap === 'streak37' ? LEGENDS.streak37.items : LEGENDS.streak75.items))}
                                legendConfig={activeMap === 'avg' ? LEGENDS.pm25 : (activeMap === 'streak37' ? LEGENDS.streak37 : LEGENDS.streak75)}
                                popupUnit={activeMap === 'avg' ? "มคก./ลบ.ม." : "วัน"}
                                interactive={false}
                                renderPopup={(province, rawValue, popupUnit) => {
                                    const value = typeof rawValue === 'object' ? rawValue.value : (rawValue || 0);
                                    const title = activeMap === 'avg' ? 'ค่าฝุ่น PM2.5 สูงสุด' : (activeMap === 'streak37' ? 'วันต่อเนื่อง (>37.5)' : 'วันต่อเนื่อง (>75)');
                                    
                                    let extraDateText = '';
                                    if (activeMap === 'streak37' && value > 0) {
                                        const trend = data?.provinceTrend?.[province] || data?.provinceTrend?.[province.replace('จังหวัด', '').trim()];
                                        if (trend && trend.length > 0) {
                                            const trendMap = new Map(trend.map(p => [p.date.split('T')[0], p.value]));
                                            let endDateStr = filters.endDate;
                                            if (!endDateStr) {
                                                const dates = trend.map(p => p.date);
                                                endDateStr = dates.sort()[dates.length - 1].split('T')[0];
                                            }

                                            let currentDate = new Date(endDateStr);
                                            let streakDates: string[] = [];

                                            while (true) {
                                                const dateStr = currentDate.toISOString().split('T')[0];
                                                const val = trendMap.get(dateStr);
                                                if (val !== undefined && val > 37.5) {
                                                    streakDates.unshift(dateStr);
                                                    currentDate.setDate(currentDate.getDate() - 1);
                                                } else {
                                                    break;
                                                }
                                            }

                                            if (streakDates.length > 0) {
                                                const dateStr = summarizeDateRanges(streakDates.map(d => new Date(d).toISOString()));
                                                extraDateText = `
                                                    <div class="flex flex-col gap-1 bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 mt-3">
                                                        <span class="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">วันที่เกินติดต่อกันล่าสุด</span>
                                                        <span class="text-xs font-medium text-orange-200 leading-relaxed">${dateStr}</span>
                                                    </div>
                                                `;
                                            }
                                        }
                                    } else if (activeMap === 'streak75' && value >= 2) {
                                        const trend = data?.provinceTrend?.[province] || data?.provinceTrend?.[province.replace('จังหวัด', '').trim()];
                                        if (trend && trend.length > 0) {
                                            const sorted = [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                            
                                            let currentStreak: Date[] = [];
                                            let latestValidStreak: Date[] = [];

                                            for (let i = 0; i < sorted.length; i++) {
                                                const p = sorted[i];
                                                if (p.value > 75) {
                                                    const d = new Date(p.date);
                                                    if (currentStreak.length === 0) {
                                                        currentStreak.push(d);
                                                    } else {
                                                        const lastD = currentStreak[currentStreak.length - 1];
                                                        const diffDays = Math.round((d.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));
                                                        if (diffDays === 1) {
                                                            currentStreak.push(d);
                                                        } else {
                                                            if (currentStreak.length >= 2) latestValidStreak = currentStreak;
                                                            currentStreak = [d];
                                                        }
                                                    }
                                                } else {
                                                    if (currentStreak.length >= 2) latestValidStreak = currentStreak;
                                                    currentStreak = [];
                                                }
                                            }
                                            if (currentStreak.length >= 2) latestValidStreak = currentStreak;

                                            if (latestValidStreak.length >= 2) {
                                                const dateStr = summarizeDateRanges(latestValidStreak.map(d => d.toISOString()));
                                                extraDateText = `
                                                    <div class="flex flex-col gap-1 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 mt-3">
                                                        <span class="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest">วันที่เกินติดต่อกันล่าสุด</span>
                                                        <span class="text-xs font-medium text-rose-200 leading-relaxed">${dateStr}</span>
                                                    </div>
                                                `;
                                            }
                                        }
                                    }

                                    return `
                                        <div class="font-sans p-6 min-w-60 max-w-xs bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl">
                                            <div class="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">${province}</div>
                                            <div class="space-y-3">
                                                <div class="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                                                    <span class="text-xs font-bold text-white/50 uppercase tracking-widest">${title}</span>
                                                    <span class="text-lg font-black text-white tabular-nums shrink-0 ml-4">${value.toLocaleString()} <small class="text-xs opacity-40 font-bold">${popupUnit}</small></span>
                                                </div>
                                            </div>
                                            ${extraDateText}
                                        </div>
                                    `;
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                footer { display: none !important; }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}
