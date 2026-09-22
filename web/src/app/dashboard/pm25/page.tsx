'use client';
import { useEffect, useState, memo, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions } from './actions';
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';
import DashboardBusyAlert from '@/components/dashboard/DashboardBusyAlert';
import DashboardLoading from '@/components/dashboard/DashboardLoading';
import DashboardDatePicker from '@/components/shared/DashboardDatePicker';
import { PM25Text } from '@/components/PM25Mark';
import CloudLoader from '@/components/CloudLoader';
import DeferredChart from '@/components/dashboard/DeferredChart';
import { nearestChartPoint, prepareChartSeries } from '@/lib/dashboard-chart';
import { areaKey, type MapAreas } from './map-area-data';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';

const DASHBOARD_ERROR_MESSAGE = 'ระบบประมวลผลข้อมูลไม่สำเร็จ กรุณากดลองใหม่ หากยังพบปัญหาโปรดแจ้งผู้ดูแลระบบ';

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
    mapAreas: MapAreas;
    avgPM25: string;
    maxPM25: string;
    totalMeasurements: number;
    exceedCount: number;
    reportDate: string | null;
    regionTrend: Record<string, TrendPoint[]>;
    provinceTrend: Record<string, TrendPoint[]>;
    districtTrend: Record<string, TrendPoint[]>;
    top10Exceed: { area: string; exceed_days: number }[];
    top10Level: 'province' | 'district' | 'subdistrict';
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
        return `${formatDateShort(r.start.toISOString())} - ${formatDateShort(r.end.toISOString())}`;
    }).join(', ');
};

// --- Dynamic Components ---
const ThailandMap = dynamic(() => import('@/components/shared/ThailandMap'), {
    ssr: false,
    loading: () => <CloudLoader fullscreen={false} label="กำลังโหลดแผนที่สุขภาพ..." className="rounded-xl border border-white/30" />
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
    const [searchText, setSearchText] = useState('');
    const safeOptions = options || [];
    const safeSelected = selected || [];
    const searchable = label === 'จังหวัด';
    const normalizedSearch = searchText.trim().toLocaleLowerCase('th');
    const filteredOptions = normalizedSearch
        ? safeOptions.filter((option: string) => option.toLocaleLowerCase('th').includes(normalizedSearch))
        : safeOptions;
    return (
        <div className="relative col-span-1">
            <label className="typo-caption block uppercase text-white/70 mb-2 ml-2">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="typo-caption w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-filter-label">
                    {safeSelected.length === 0 ? placeholder : (safeSelected.length === safeOptions.length ? 'ทั้งหมด' : safeSelected.join(', '))}
                </div>
                <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} strokeWidth={2.5} />
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-dropdown mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
                        {searchable && (
                            <div className="relative mb-1">
                                <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} onClick={(event) => event.stopPropagation()} placeholder="ค้นหาจังหวัด" aria-label="ค้นหาจังหวัด" className="typo-caption input input-sm w-full rounded-2xl border-white/15 bg-white/10 pr-9 text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none" />
                                {searchText && <button type="button" aria-label="ล้างคำค้นหาจังหวัด" onClick={(event) => { event.stopPropagation(); setSearchText(''); }} className="typo-label btn btn-ghost btn-xs btn-circle absolute right-1.5 top-1/2 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white">×</button>}
                            </div>
                        )}
                        <div onClick={() => { if (safeSelected.length === safeOptions.length) onChange([]); else onChange([...safeOptions]); setIsOpen(false); }} className="flex items-center gap-3 p-3.5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all border-b border-white/5 mb-1 group">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.length === safeOptions.length ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50' : 'border-white/20 group-hover:border-white/40'}`}>
                                {safeSelected.length === safeOptions.length && <Check aria-hidden="true" className="size-4 text-white" strokeWidth={4} />}
                            </div>
                            <span className="typo-caption text-white">เลือกทั้งหมด</span>
                        </div>
                        {filteredOptions.map((opt: string) => (
                            <div key={opt} onClick={() => { if (safeSelected.includes(opt)) onChange(safeSelected.filter((s: string) => s !== opt)); else onChange([...safeSelected, opt]); setIsOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-all group">
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.includes(opt) ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/30' : 'border-white/10 group-hover:border-white/30'}`}>
                                    {safeSelected.includes(opt) && <Check aria-hidden="true" className="size-3.5 text-white" strokeWidth={4} />}
                                </div>
                                <span className={`typo-caption transition-colors ${safeSelected.includes(opt) ? 'text-blue-400' : 'text-white/70'}`}>{opt}</span>
                            </div>
                        ))}
                        {searchable && filteredOptions.length === 0 && <div className="typo-caption px-3 py-4 text-center text-white/50">ไม่พบจังหวัดที่ค้นหา</div>}
                    </div>
                </>
            )}
        </div>
    );
}

const MultiLineChart = memo(function MultiLineChart({ title, dataGroup, loading }: any) {
    const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());
    const [hoveredPoint, setHoveredPoint] = useState<{
        label: string;
        date: string;
        value: number;
        x: number;
        y: number;
        color: string;
    } | null>(null);
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

    const axisDates = useMemo(() => (
        Array.from(new Set(
            Object.values(dataGroup || {}).flatMap((points: any) =>
                points.map((point: TrendPoint) => point.date)
            )
        )).sort((a, b) => String(a).localeCompare(String(b))) as string[]
    ), [dataGroup]);

    const xAxisLabels = useMemo(() => {
        const maxLabels = 7;
        if (axisDates.length <= maxLabels) return axisDates;

        return Array.from({ length: maxLabels }, (_, index) => {
            const dateIndex = Math.round((index / (maxLabels - 1)) * (axisDates.length - 1));
            return axisDates[dateIndex];
        });
    }, [axisDates]);

    const yAxisTicks = useMemo(
        () => [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0],
        [maxValue]
    );

    const chartSeries = useMemo(
        () => prepareChartSeries(dataGroup, labels, axisDates, maxValue),
        [dataGroup, labels, axisDates, maxValue]
    );

    useEffect(() => { setHoveredPoint(null); }, [dataGroup, hiddenLabels]);

    return (
        <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full relative group ring-1 ring-white/10 overflow-hidden">
            <h4 className="typo-section text-white flex items-center gap-4 uppercase mb-8 shrink-0">
                <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                <PM25Text>{title}</PM25Text>
                {!loading && labels.length > 0 && (
                    <span className="typo-label text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20 shadow-inner">
                        (N={labels.length})
                    </span>
                )}
            </h4>
            <div className="flex-1 flex gap-4 min-h-0 relative">
                <div className="flex-1 relative border-r border-white/5 pr-4 flex min-w-0">
                    <div className="w-5 shrink-0 flex items-center justify-center">
                        <span className="typo-chart text-white/80 whitespace-nowrap writing-mode-vertical rotate-180">
                            <PM25Text>ค่าเฉลี่ยฝุ่น PM2.5 (มคก./ลบ.ม.)</PM25Text>
                        </span>
                    </div>
                    {loading ? <div className="w-full h-full bg-white/5 animate-pulse rounded-2xl"></div> : (
                        <div className="flex-1 min-w-0 h-full flex flex-col">
                            <div className="flex-1 min-h-0 flex">
                                <div className="typo-chart w-9 shrink-0 flex flex-col justify-between items-end pr-2 text-white/80 tabular-nums">
                                    {yAxisTicks.map((tick, index) => (
                                        <span key={index}>{Math.round(tick)}</span>
                                    ))}
                                </div>
                                <div className="flex-1 min-w-0 relative border-l border-b border-white/30">
                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                                        {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white"></div>)}
                                    </div>
                                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-hidden relative z-10">
                                        {chartSeries.map(({ label, points, path }, idx) => {
                                            if (hiddenLabels.has(label)) return null;
                                            if (points.length === 0) return null;
                                            const color = colors[idx % colors.length];
                                            if (points.length === 1) {
                                                return <circle key={label} cx={points[0].x} cy={points[0].y} r="2" fill={color} />;
                                            }
                                            return <polyline key={label} points={path} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity="1" />;
                                        })}
                                    </svg>
                                    <div className="absolute inset-0 z-20">
                                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                            {chartSeries.map(({ label, points, path }, idx) => {
                                                if (hiddenLabels.has(label) || !points.length) return null;
                                                const color = colors[idx % colors.length];
                                                const showPoint = (point: typeof points[number]) => {
                                                    setHoveredPoint(previous => previous?.label === label && previous.date === point.date
                                                        ? previous : { ...point, label, color });
                                                };
                                                const interaction = {
                                                    tabIndex: 0,
                                                    role: 'img',
                                                    'aria-label': `${label} ใช้ลูกศรซ้ายขวาเพื่อดูค่ารายวัน`,
                                                    onPointerMove: (event: React.PointerEvent<SVGElement>) => {
                                                        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                                        if (!bounds?.width) return;
                                                        const point = nearestChartPoint(points, (event.clientX - bounds.left) / bounds.width * 100);
                                                        if (point) showPoint(point);
                                                    },
                                                    onPointerLeave: () => setHoveredPoint(null),
                                                    onFocus: () => showPoint(points[0]),
                                                    onBlur: () => setHoveredPoint(null),
                                                    onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
                                                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
                                                        event.preventDefault();
                                                        if (event.key === 'Escape') { setHoveredPoint(null); return; }
                                                        const current = hoveredPoint?.label === label
                                                            ? Math.max(0, points.findIndex(point => point.date === hoveredPoint.date)) : 0;
                                                        const index = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1
                                                            : Math.max(0, Math.min(points.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
                                                        showPoint(points[index]);
                                                    },
                                                };
                                                return points.length === 1
                                                    ? <circle key={label} cx={points[0].x} cy={points[0].y} r="2" fill="transparent" stroke="transparent" strokeWidth="20" vectorEffect="non-scaling-stroke" {...interaction} />
                                                    : <polyline key={label} points={path} fill="none" stroke="transparent" strokeWidth="20" vectorEffect="non-scaling-stroke" pointerEvents="stroke" {...interaction} />;
                                            })}
                                        </svg>
                                        {hoveredPoint && (
                                            <>
                                                <span
                                                    className="absolute z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg pointer-events-none"
                                                    style={{ left: `${hoveredPoint.x}%`, top: `${hoveredPoint.y}%`, backgroundColor: hoveredPoint.color }}
                                                />
                                                <div
                                                    className="typo-chart absolute z-40 min-w-48 rounded-xl border border-white/15 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur-xl pointer-events-none"
                                                    role="status"
                                                    style={{
                                                        left: `${hoveredPoint.x}%`,
                                                        top: `${hoveredPoint.y}%`,
                                                        transform: `translate(${hoveredPoint.x > 70 ? '-100%' : hoveredPoint.x < 30 ? '0' : '-50%'}, ${hoveredPoint.y < 35 ? '12px' : 'calc(-100% - 12px)'})`
                                                    }}
                                                >
                                                    <div className="typo-label mb-2 flex items-center gap-2 text-white">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoveredPoint.color }} />
                                                        {hoveredPoint.label}
                                                    </div>
                                                    <div className="grid grid-cols-metric gap-x-3 gap-y-1 text-white/70">
                                                        <span>วันที่</span>
                                                        <span className="typo-label text-right text-white">{formatDateShort(hoveredPoint.date)}</span>
                                                        <span>พื้นที่</span>
                                                        <span className="typo-label text-right text-white">{hoveredPoint.label}</span>
                                                        <span><PM25Text>ค่าฝุ่น PM2.5</PM25Text></span>
                                                        <span className="typo-label text-right text-blue-300">{hoveredPoint.value.toLocaleString('th-TH', { maximumFractionDigits: 2 })} มคก./ลบ.ม.</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div
                                className="typo-chart ml-9 mt-1 grid text-white/80 tabular-nums"
                                style={{ gridTemplateColumns: `repeat(${Math.max(xAxisLabels.length, 1)}, minmax(0, 1fr))` }}
                            >
                                {xAxisLabels.map((date, index) => (
                                    <span
                                        key={date}
                                        className={`whitespace-nowrap ${
                                            xAxisLabels.length === 1
                                                ? 'text-center'
                                                : index === 0
                                                    ? 'text-left'
                                                    : index === xAxisLabels.length - 1
                                                        ? 'text-right'
                                                        : 'text-center'
                                        }`}
                                    >
                                        {formatDateShort(date)}
                                    </span>
                                ))}
                            </div>
                            <div className="typo-chart ml-9 text-center text-white/80">วันที่</div>
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
                                <span className={`typo-chart truncate transition-colors ${isHidden ? 'text-white/30' : 'text-white/80'}`} title={label}>{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

function TopExceedRanking({ data, level = 'province', loading }: { data?: { area: string; exceed_days: number }[]; level?: 'province' | 'district' | 'subdistrict'; loading: boolean }) {
    const rows = data || [];
    const maxDays = Math.max(...rows.map(row => Number(row.exceed_days) || 0), 1);
    const areaLabel = level === 'subdistrict' ? 'ตำบล' : level === 'district' ? 'อำเภอ/เขต' : 'จังหวัด';

    return (
        <div className="bg-slate-700 p-4 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full relative ring-1 ring-white/10 overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-2 shrink-0">
                <h4 className="typo-section text-white flex items-center gap-3 uppercase">
                    <div className="w-2 h-6 bg-linear-to-b from-orange-500 to-amber-400 rounded-full shadow-lg shadow-orange-500/40 shrink-0"></div>
                    10 อันดับ{areaLabel}ที่มีจำนวนวันเกินมาตรฐานมากที่สุด
                </h4>
                <span className="typo-chart text-orange-200 bg-orange-500/15 px-2.5 py-1 rounded-xl border border-orange-500/20 whitespace-nowrap">
                    &gt; 37.5 มคก./ลบ.ม.
                </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                {loading ? (
                    <div className="grid h-full grid-rows-10 gap-1">
                        {[...Array(10)].map((_, idx) => (
                            <div key={idx} className="h-7 rounded-xl bg-white/5 animate-pulse"></div>
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="typo-label h-full min-h-40 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80">
                        ไม่พบ{areaLabel}ที่เกินค่ามาตรฐานในช่วงวันที่เลือก
                    </div>
                ) : (
                    <div
                        className="grid h-full gap-1"
                        style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}
                    >
                        {rows.map((row, idx) => {
                            const days = Number(row.exceed_days) || 0;
                            const percent = Math.max((days / maxDays) * 100, 6);

                            return (
                                <div key={`${row.area}-${idx}`} className="relative flex min-h-0 items-center overflow-hidden rounded-xl border border-orange-400/20 bg-white/5 px-2.5 py-0.5">
                                    <div className="absolute inset-y-0 left-0 rounded-xl bg-orange-500/25" style={{ width: `${percent}%` }}></div>
                                    <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                                        <div className="typo-chart w-5 h-5 rounded-md flex items-center justify-center tabular-nums shrink-0 bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="typo-caption text-white truncate" title={row.area}>{row.area}</div>
                                        </div>
                                        <div className="text-right shrink-0 flex items-baseline gap-1">
                                            <div className="typo-label text-white tabular-nums">{days.toLocaleString()}</div>
                                            <div className="typo-chart text-white/80">วัน</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Main Hook ---
function useDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [options, setOptions] = useState<FilterOptions>({ dates: [], regions: [], provinces: [], hierarchy: [] });
    const [loading, setLoading] = useState(true);
    const [busyMessage, setBusyMessage] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({ startDate: '', endDate: '', regions: [], provinces: [], districts: [] });
    const latestRequestId = useRef(0);

    const now = new Date();
    const limitFullDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');

    useEffect(() => {
        getFilterOptions().then((opts: any) => {
            setBusyMessage(null);
            if (!opts) {
                setBusyMessage(DASHBOARD_ERROR_MESSAGE);
                setLoading(false);
                return;
            }
            const allDates = opts.dates || [];
            const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a));
            const filteredOptsDates = sortedDates.filter((date: string) => date <= limitFullDate);
            setOptions({ ...opts, dates: filteredOptsDates });

            if (filteredOptsDates.length) {
                const latestDate = filteredOptsDates[0];
                const [latestYear, latestMonthNumber] = latestDate.split('-').map(Number);
                const fiscalYearStart = latestMonthNumber >= 10 ? latestYear : latestYear - 1;
                const fiscalStartDate = `${fiscalYearStart}-10-01`;
                const datesInFiscalYear = filteredOptsDates.filter(
                    (date: string) => date >= fiscalStartDate && date <= latestDate,
                );
                const startDate = datesInFiscalYear.at(-1) || latestDate;

                setFilters(f => ({ ...f, startDate, endDate: latestDate }));
            } else {
                setBusyMessage('ไม่พบช่วงวันที่ที่มีข้อมูลสำหรับแสดงผล');
                setLoading(false);
            }
        }).catch(() => {
            setBusyMessage(DASHBOARD_ERROR_MESSAGE);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!filters.startDate || !filters.endDate) return;
        const requestId = ++latestRequestId.current;
        setLoading(true);
        setBusyMessage(null);
        const timeout = window.setTimeout(async () => {
            const apiFilters = {
                ...filters,
                regions: filters.regions?.length ? filters.regions : undefined,
                provinces: filters.provinces?.length ? filters.provinces : undefined,
                districts: filters.districts?.length ? filters.districts : undefined,
            };
            try {
                const res: any = await getDashboardData(apiFilters);
                if (requestId === latestRequestId.current) {
                    setData(res);
                    setBusyMessage(null);
                }
            } catch {
                if (requestId === latestRequestId.current) setBusyMessage(DASHBOARD_ERROR_MESSAGE);
            } finally {
                if (requestId === latestRequestId.current) setLoading(false);
            }
        }, 350);

        return () => {
            window.clearTimeout(timeout);
            latestRequestId.current++;
        };
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
        if (!data?.provinceMaxes) return { count: 0, tooltip: undefined };

        const exceedingProvinces: { prov: string }[] = [];

        // นับจังหวัดเมื่อมีอย่างน้อย 1 สถานีเกิน 37.5 ในอย่างน้อย 1 วัน
        // ของช่วงวันที่และพื้นที่ที่เลือก (provinceMaxes มาจาก MAX(pm25) รายจังหวัด)
        Object.entries(data.provinceMaxes).forEach(([prov, maxPM25]) => {
            if (maxPM25 > 37.5) {
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
                if (/^\d+$/.test(regionName.trim())) {
                    regionName = `เขตสุขภาพ ${regionName.trim()}`;
                }
                if (regionName.includes('เขต') && !regionName.includes('เขตสุขภาพที่') && !regionName.includes('กรุงเทพ')) {
                    regionName = regionName.replace(/^เขต\s*(\d+)/, 'เขตสุขภาพ $1').replace(/\s+/g, ' ').trim();
                }
                const provListStr = items.map(i => i.prov).join(', ');
                return { region: regionName, count: items.length, provinces: provListStr };
            });

        return { count: exceedingProvinces.length, tooltip };
    }, [data?.provinceMaxes, provinceToRegion]);

    const exceedData75 = useMemo(() => {
        if (!data?.provinceMaxes) return { count: 0, tooltip: undefined };

        const exceedingProvinces: { prov: string }[] = [];

        Object.entries(data.provinceMaxes).forEach(([prov, maxPM25]) => {
            if (maxPM25 > 75) {
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
                if (/^\d+$/.test(regionName.trim())) {
                    regionName = `เขตสุขภาพ ${regionName.trim()}`;
                }
                if (regionName.includes('เขต') && !regionName.includes('เขตสุขภาพที่') && !regionName.includes('กรุงเทพ')) {
                    regionName = regionName.replace(/^เขต\s*(\d+)/, 'เขตสุขภาพ $1').replace(/\s+/g, ' ').trim();
                }
                const provListStr = items.map(i => i.prov).join(', ');
                return { region: regionName, count: items.length, provinces: provListStr };
            });

        return { count: exceedingProvinces.length, tooltip };
    }, [data?.provinceMaxes, provinceToRegion]);

    return { data, options, loading, busyMessage, filters, setFilters, baseProvinces, baseDistricts, provinceMaxes, exceedData37, exceedData75 };
}

// --- Main Page Component ---
export default function DashboardPM25() {
    const { data, options, loading, busyMessage, filters, setFilters, baseProvinces, baseDistricts, provinceMaxes, exceedData37, exceedData75 } = useDashboard();
    const exceedDialogRef = useRef<HTMLDialogElement>(null);
    const exceedTriggerRef = useRef<HTMLButtonElement>(null);
    const [activeExceedThreshold, setActiveExceedThreshold] = useState<37 | 75 | null>(null);
    const activeExceedData = activeExceedThreshold === 37 ? exceedData37 : exceedData75;
    const openExceedDetails = (threshold: 37 | 75, trigger: HTMLButtonElement) => {
        exceedTriggerRef.current = trigger;
        setActiveExceedThreshold(threshold);
        exceedDialogRef.current?.showModal();
    };
    const renderMap = (activeMap: 'avg' | 'streak37' | 'streak75') => {
    const isAllProvinces = filters.districts.length === 0 && filters.provinces.length > 0 && (
        filters.provinces.length === options.provinces.length || filters.provinces.length >= 70
    );
    const level = filters.districts.length ? 'subdistrict' : filters.provinces.length && !isAllProvinces ? 'district' : 'province';
    const summaries = isAllProvinces
        ? Object.fromEntries(Object.entries(activeMap === 'avg' ? (data?.provinceMaxes || {}) : activeMap === 'streak37' ? (data?.provinceStreak37 || {}) : (data?.provinceStreak75 || {})).map(([name, value]) => [name, { max: value, value, streak37: { days: value }, streak75: { days: value } }]))
        : (data?.mapAreas?.level === level ? data.mapAreas.values : {});
    const mapValues = Object.fromEntries(Object.entries(summaries).map(([key, summary]) => {
        const period = activeMap === 'avg' ? null : activeMap === 'streak37' ? summary.streak37 : summary.streak75;
        return [key, { value: period ? period.days : summary.max, name: summary.name, period }];
    }));
    return (
    <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
        <div className="flex flex-col gap-4 mb-6 shrink-0">
            <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
                <h4 className="typo-section text-white flex items-center gap-4 uppercase">
                    <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40 shrink-0"></div>
                    <PM25Text>{activeMap === 'avg' ? 'แผนที่ค่าฝุ่น PM2.5 เฉลี่ย 24 ชั่วโมง สูงสุด' : activeMap === 'streak37' ? 'ค่าฝุ่น PM2.5 มากกว่า 37.5 มคก./ลบ.ม.' : 'ค่าฝุ่น PM2.5 มากกว่า 75 มคก./ลบ.ม.'}</PM25Text>
                </h4>
                {filters.startDate && filters.endDate && (
                    <div className="typo-chart text-blue-200/70 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 shrink-0 flex items-center gap-2 w-fit">
                        <CalendarDays aria-hidden="true" className="size-3.5" strokeWidth={2} />
                        ข้อมูล: {filters.startDate === filters.endDate
                            ? formatDateShort(filters.startDate)
                            : `${formatDateShort(filters.startDate)} - ${formatDateShort(filters.endDate)}`}
                    </div>
                )}
            </div>

        </div>
        <div className="flex-1 w-full min-h-map relative rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 shadow-inner bg-slate-800/50">
            <ThailandMap
                data={mapValues}
                resolveAreaData={isAllProvinces ? undefined : ((area, areaLevel) => areaLevel === level ? mapValues[areaKey(area, level)] : undefined)}
                filters={filters}
                visibleProvinces={filters.provinces.length ? filters.provinces : filters.regions.length ? baseProvinces : undefined}
                getColor={(v: number) => getColor(v, activeMap === 'avg' ? LEGENDS.pm25.items : (activeMap === 'streak37' ? LEGENDS.streak37.items : LEGENDS.streak75.items))}
                legendConfig={activeMap === 'avg' ? LEGENDS.pm25 : (activeMap === 'streak37' ? LEGENDS.streak37 : LEGENDS.streak75)}
                popupUnit={activeMap === 'avg' ? "มคก./ลบ.ม." : "วัน"}
                interactive={false}
                focusSelectedSubdistricts
                requireDistrictForTambons={false}
                renderPopup={(areaName, rawValue, popupUnit) => {
                    const escape = (text: string) => text.replace(/[&<>"']/g, character => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
                    }[character]!));
                    const threshold = activeMap === 'streak37' ? '37.5' : '75';
                    const title = activeMap === 'avg' ? 'ค่าฝุ่น PM2.5 สูงสุด'
                        : `จำนวนวันที่ PM2.5 > ${threshold} มคก./ลบ.ม. ต่อเนื่อง`;
                    const period = rawValue && typeof rawValue === 'object' ? rawValue.period : undefined;
                    const dates = period?.start && period?.end
                        ? `<div class="typo-subtitle mt-3 text-purple-400">วันที่ PM2.5 &gt; ${threshold} มคก./ลบ.ม. ติดต่อกันล่าสุด<br /><span class="typo-section text-white">${formatDateShort(period.start)} - ${formatDateShort(period.end)}</span></div>`
                        : '';
                    const name = rawValue && typeof rawValue === 'object' ? rawValue.name : areaName;
                    const value = rawValue && typeof rawValue === 'object'
                        ? `<div class="typo-section text-white mt-2">${rawValue.value.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ${popupUnit}</div>`
                        : '';
                    return `<div class="typo-body p-4 min-w-60 max-w-xs bg-slate-900 text-white rounded-2xl border border-white/10">
                        <div class="typo-subtitle text-blue-400 mb-3">${escape(name)}</div>
                        <div class="typo-section text-purple-400">${escape(title)}</div>
                        ${value}
                        ${dates}
                    </div>`;
                }}
            />
        </div>
    </div>
    );
    };

    return (
        <div className="typo-body min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden">
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    backgroundImage: "url('/img/background-optimized.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0 bg-slate-900/40"
            />
            {loading && <DashboardLoading />}

            <main aria-busy={loading} inert={loading} className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-screen flex flex-col gap-4">
                <DashboardNavbar
                    logos={[
                        {
                            src: '/img/ddc-logo-optimized.png',
                            alt: 'DDC Logo',
                            fill: true,
                            sizes: '60px',
                            wrapperClassName: 'relative z-20 h-12 w-12 shrink-0 rounded-2xl border border-white/50 bg-white p-1.5 shadow-2xl ring-4 ring-white/10 sm:h-14 sm:w-14',
                            imageClassName: 'rounded-xl object-contain p-1',
                        },
                    ]}
                    title={<>การเฝ้าระวังสถานการณ์ฝุ่นละอองขนาดไม่เกิน 2.5 ไมครอน <span className="text-blue-400"><PM25Text>(PM2.5) ประเทศไทย</PM25Text></span></>}
                    subtitle="กรมควบคุมโรค | กลุ่มเฝ้าระวังและตอบโต้ภาวะฉุกเฉิน กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม"
                    className="relative z-header mb-2"
                    titleClassName="uppercase drop-shadow-md"
                    navClassName=""
                />
                <DashboardBusyAlert message={busyMessage} />

                {/* Filters Section - Exactly like HDC */}
                <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end shrink-0 ring-1 ring-white/10 relative z-overlay">
                    <DashboardDatePicker mode="day" label="จากวันที่" options={options.dates} value={filters.startDate} onChange={(v) => setFilters({ ...filters, startDate: v })} />
                    <DashboardDatePicker mode="day" label="ถึงวันที่" options={options.dates} value={filters.endDate} onChange={(v) => setFilters({ ...filters, endDate: v })} />
                    <MultiSelect label="เขตสุขภาพ" options={options.regions} selected={filters.regions} onChange={(val: string[]) => setFilters({ ...filters, regions: val, provinces: [], districts: [] })} />
                    <MultiSelect label="จังหวัด" options={baseProvinces} selected={filters.provinces} onChange={(val: string[]) => setFilters({ ...filters, provinces: val, districts: [] })} />
                    <MultiSelect label="อำเภอ/เขต" options={baseDistricts} selected={filters.districts} onChange={(val: string[]) => setFilters({ ...filters, districts: val })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 relative z-summary">
                    {[
                        { label: 'ค่าฝุ่น PM2.5 เฉลี่ย 24 ชั่วโมง', value: data?.avgPM25, unit: 'มคก./ลบ.ม.', color: '#3b82f6', isPrimary: true },
                        { label: 'ค่าฝุ่น PM2.5 เฉลี่ย 24 ชั่วโมงสูงสุด', value: data?.maxPM25, unit: 'มคก./ลบ.ม.', color: '#f43f5e', isPrimary: false },
                        { label: 'จำนวนจังหวัดที่ค่าฝุ่น PM2.5 เกินค่ามาตรฐาน (37.5 มคก./ลบ.ม.)', value: exceedData37.count, unit: 'จังหวัด', color: '#f97316', isPrimary: false, tooltip: exceedData37.tooltip },
                        { label: 'จำนวนจังหวัดที่ค่าฝุ่น PM2.5 มากกว่า 75 มคก./ลบ.ม.', value: exceedData75.count, unit: 'จังหวัด', color: '#e11d48', isPrimary: false, tooltip: exceedData75.tooltip }
                    ].map((stat, i) => (
                        <div key={i} className={`relative ${stat.isPrimary
                            ? "bg-linear-to-br from-blue-600/90 to-sky-500/90 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/30 transition-all group min-h-32 flex flex-col justify-between"
                            : 'bg-white/10 backdrop-blur-xl p-5 rounded-3xl shadow-xl border border-white/20 transition-all group ring-1 ring-white/5 min-h-32 flex flex-col justify-between'}`}>
                            <div className={`typo-caption mb-2 ${stat.isPrimary ? 'text-blue-100/90' : 'text-white/70'}`}>
                                {i === 2 ? <><PM25Text>จำนวนจังหวัดที่ค่าฝุ่น PM2.5 </PM25Text><span className="text-orange-300">เกินค่ามาตรฐาน (37.5 มคก./ลบ.ม.)</span></> : i === 3 ? <><PM25Text>จำนวนจังหวัดที่ค่าฝุ่น PM2.5 </PM25Text><span className="text-red-300">มากกว่า 75 มคก./ลบ.ม.</span></> : <PM25Text>{stat.label}</PM25Text>}
                            </div>
                            <div className="typo-metric text-white tabular-nums flex items-end gap-2 drop-shadow-md">
                                {loading ? <div className={`h-9 w-24 animate-pulse rounded-lg ${stat.isPrimary ? 'bg-white/20' : 'bg-white/10'}`}></div> : i === 2 ? (
                                    <span className="flex items-baseline gap-2"><span>{stat.value?.toLocaleString()}</span><span className="typo-label">จังหวัด</span></span>
                                ) : i === 3 ? (
                                    <span className="flex items-baseline gap-2"><span>{stat.value?.toLocaleString()}</span><span className="typo-label">จังหวัด</span></span>
                                ) : stat.value?.toLocaleString()}
                                {!stat.isPrimary && <div className="w-1.5 h-6 rounded-full mb-1" style={{ backgroundColor: stat.color }}></div>}
                            </div>
                            {i < 2 ? <div className={`typo-chart uppercase mt-1 ${stat.isPrimary ? 'text-white/50' : 'text-white/30'}`}>{stat.unit}</div> : (
                                <button type="button" disabled={loading} onClick={(event) => openExceedDetails(i === 2 ? 37 : 75, event.currentTarget)} className={`typo-label mt-2 min-h-9 self-start rounded-lg px-3 text-white cursor-pointer border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${i === 2 ? 'border-orange-400/40 bg-orange-500/25 hover:bg-orange-500/40 focus-visible:outline-orange-300' : 'border-red-400/40 bg-red-500/25 hover:bg-red-500/40 focus-visible:outline-red-300'}`}>
                                    ดูรายละเอียด
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4 relative z-content">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="h-[560px] lg:h-[640px] min-w-0">
                            <TopExceedRanking data={data?.top10Exceed || []} level={data?.top10Level} loading={loading} />
                        </div>
                        <div className="h-[560px] lg:h-[640px] min-w-0">{renderMap('avg')}</div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="h-[560px] lg:h-[640px] min-w-0">{renderMap('streak37')}</div>
                        <div className="h-[560px] lg:h-[640px] min-w-0">{renderMap('streak75')}</div>
                    </div>
                    <div className="flex flex-col gap-4 [&>div]:h-[29.375rem]">
                        <DeferredChart><MultiLineChart title="ค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 รายเขตสุขภาพ" dataGroup={data?.regionTrend || {}} loading={loading} /></DeferredChart>
                        <DeferredChart><MultiLineChart title="ค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 รายจังหวัด" dataGroup={data?.provinceTrend || {}} loading={loading} /></DeferredChart>
                        <DeferredChart><MultiLineChart title="ค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 รายอำเภอ/เขต" dataGroup={data?.districtTrend || {}} loading={loading} /></DeferredChart>
                    </div>
                </div>
            </main>

            <dialog ref={exceedDialogRef} className="modal p-3" aria-labelledby="pm25-exceed-dialog-title" onClose={() => { setActiveExceedThreshold(null); exceedTriggerRef.current?.focus(); }}>
                <div className="modal-box flex max-h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-0 text-left text-base-content shadow-2xl">
                    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300 px-4 py-2 sm:px-5">
                        <div>
                            <h2 id="pm25-exceed-dialog-title" className="typo-subtitle text-neutral">
                                จังหวัดที่ค่าฝุ่น PM2.5 {activeExceedThreshold === 37 ? 'เกินค่ามาตรฐาน (37.5 มคก./ลบ.ม.)' : 'มากกว่า 75 มคก./ลบ.ม.'}
                            </h2>
                            <p className="typo-body-sm text-base-content/70">รวม {activeExceedData.count.toLocaleString('th-TH')} จังหวัด ในช่วงวันที่และพื้นที่ที่เลือก</p>
                        </div>
                        <button type="button" className="typo-label btn btn-circle btn-ghost min-h-11 min-w-11 shrink-0 cursor-pointer bg-base-200 text-neutral hover:bg-base-300" aria-label="ปิดรายละเอียดจังหวัด" onClick={() => exceedDialogRef.current?.close()}>✕</button>
                    </header>
                    <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5" tabIndex={0}>
                        {activeExceedData.tooltip?.length ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {activeExceedData.tooltip.map((item) => (
                                    <section key={item.region} className="rounded-xl border border-base-300 bg-base-200/50 p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                            <h3 className="typo-section text-neutral">{item.region}</h3>
                                            <span className={`typo-caption badge border-0 ${activeExceedThreshold === 37 ? 'bg-orange-100 text-orange-900' : 'bg-red-100 text-red-900'}`}>{item.count} จังหวัด</span>
                                        </div>
                                        <p className="typo-body-sm mt-1 text-base-content">{item.provinces}</p>
                                    </section>
                                ))}
                            </div>
                        ) : <p className="typo-body-sm py-8 text-center text-base-content/70">ไม่พบจังหวัดที่ค่าฝุ่นเกินเกณฑ์ในช่วงวันที่และพื้นที่ที่เลือก</p>}
                    </div>
                </div>
                <form method="dialog" noValidate className="modal-backdrop"><button className="typo-label cursor-pointer" tabIndex={-1} aria-label="ปิดรายละเอียดจากพื้นหลัง">ปิด</button></form>
            </dialog>

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
