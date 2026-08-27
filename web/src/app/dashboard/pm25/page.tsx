'use client';
import { useEffect, useState, memo, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions } from './actions';
import DashboardNavbar from '../_components/DashboardNavbar';
import DashboardBusyAlert from '../_components/DashboardBusyAlert';
import DashboardLoading from '../_components/DashboardLoading';
import DashboardDatePicker from '@/components/shared/DashboardDatePicker';
import { PM25Text } from '@/components/PM25Mark';
import CloudLoader from '@/components/CloudLoader';
import DeferredChart from '../_components/DeferredChart';
import { nearestChartPoint, prepareChartSeries } from '@/lib/dashboard-chart';

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
    const safeOptions = options || [];
    const safeSelected = selected || [];
    return (
        <div className="relative col-span-1">
            <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-filter-label">
                    {safeSelected.length === 0 ? placeholder : (safeSelected.length === safeOptions.length ? 'ทั้งหมด' : safeSelected.join(', '))}
                </div>
                <svg className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-dropdown mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
                        <div onClick={() => { if (safeSelected.length === safeOptions.length) onChange([]); else onChange([...safeOptions]); setIsOpen(false); }} className="flex items-center gap-3 p-3.5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all border-b border-white/5 mb-1 group">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.length === safeOptions.length ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50' : 'border-white/20 group-hover:border-white/40'}`}>
                                {safeSelected.length === safeOptions.length && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-white">เลือกทั้งหมด</span>
                        </div>
                        {safeOptions.map((opt: string) => (
                            <div key={opt} onClick={() => { if (safeSelected.includes(opt)) onChange(safeSelected.filter((s: string) => s !== opt)); else onChange([...safeSelected, opt]); setIsOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-all group">
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
            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase mb-8 shrink-0">
                <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                <PM25Text>{title}</PM25Text>
                {!loading && labels.length > 0 && (
                    <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20 shadow-inner">
                        {labels.length}
                    </span>
                )}
            </h4>
            <div className="flex-1 flex gap-4 min-h-0 relative">
                <div className="flex-1 relative border-r border-white/5 pr-4 flex min-w-0">
                    <div className="w-5 shrink-0 flex items-center justify-center">
                        <span className="text-2xs-plus font-bold text-white/80 whitespace-nowrap writing-mode-vertical rotate-180">
                            <PM25Text>ค่าเฉลี่ยฝุ่น PM2.5 (มคก./ลบ.ม.)</PM25Text>
                        </span>
                    </div>
                    {loading ? <div className="w-full h-full bg-white/5 animate-pulse rounded-2xl"></div> : (
                        <div className="flex-1 min-w-0 h-full flex flex-col">
                            <div className="flex-1 min-h-0 flex">
                                <div className="w-9 shrink-0 flex flex-col justify-between items-end pr-2 text-2xs font-bold text-white/80 tabular-nums">
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
                                                    className="absolute z-40 min-w-48 rounded-xl border border-white/15 bg-slate-950/95 p-3 text-compact-plus text-white shadow-2xl backdrop-blur-xl pointer-events-none"
                                                    role="status"
                                                    style={{
                                                        left: `${hoveredPoint.x}%`,
                                                        top: `${hoveredPoint.y}%`,
                                                        transform: `translate(${hoveredPoint.x > 70 ? '-100%' : hoveredPoint.x < 30 ? '0' : '-50%'}, ${hoveredPoint.y < 35 ? '12px' : 'calc(-100% - 12px)'})`
                                                    }}
                                                >
                                                    <div className="mb-2 flex items-center gap-2 font-extrabold text-white">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoveredPoint.color }} />
                                                        {hoveredPoint.label}
                                                    </div>
                                                    <div className="grid grid-cols-metric gap-x-3 gap-y-1 text-white/70">
                                                        <span>วันที่</span>
                                                        <span className="text-right font-bold text-white">{formatDateShort(hoveredPoint.date)}</span>
                                                        <span>พื้นที่</span>
                                                        <span className="text-right font-bold text-white">{hoveredPoint.label}</span>
                                                        <span><PM25Text>ค่าฝุ่น PM2.5</PM25Text></span>
                                                        <span className="text-right font-bold text-blue-300">{hoveredPoint.value.toLocaleString('th-TH', { maximumFractionDigits: 2 })} มคก./ลบ.ม.</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div
                                className="ml-9 mt-1 grid text-2xs font-bold text-white/80 tabular-nums"
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
                            <div className="ml-9 text-center text-2xs-plus font-bold text-white/80">วันที่</div>
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
                                <span className={`text-compact font-bold truncate transition-colors ${isHidden ? 'text-white/30' : 'text-white/80'}`} title={label}>{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

function TopExceedRanking({ data, loading }: { data?: { province: string; exceed_days: number }[]; loading: boolean }) {
    const rows = data || [];
    const maxDays = Math.max(...rows.map(row => Number(row.exceed_days) || 0), 1);

    return (
        <div className="bg-slate-700 p-4 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full relative ring-1 ring-white/10 overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-2 shrink-0">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-3 tracking-tight uppercase leading-tight">
                    <div className="w-2 h-6 bg-linear-to-b from-orange-500 to-amber-400 rounded-full shadow-lg shadow-orange-500/40 shrink-0"></div>
                    10 อันดับจังหวัดที่มีจำนวนวันเกินมาตรฐานมากที่สุด
                </h4>
                <span className="text-compact font-black text-orange-200 bg-orange-500/15 px-2.5 py-1 rounded-xl border border-orange-500/20 whitespace-nowrap">
                    &gt; 37.5 มคก./ลบ.ม.
                </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col gap-0.5">
                        {[...Array(10)].map((_, idx) => (
                            <div key={idx} className="h-7 rounded-xl bg-white/5 animate-pulse"></div>
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="h-full min-h-40 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white/80">
                        ไม่พบจังหวัดที่เกินค่ามาตรฐานในช่วงวันที่เลือก
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        {rows.map((row, idx) => {
                            const days = Number(row.exceed_days) || 0;
                            const percent = Math.max((days / maxDays) * 100, 6);
                            const isTopThree = idx < 3;

                            return (
                                <div key={`${row.province}-${idx}`} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 px-2.5 py-0.5 min-h-7">
                                    <div className={`absolute inset-y-0 left-0 rounded-xl ${isTopThree ? 'bg-orange-500/25' : 'bg-blue-500/15'}`} style={{ width: `${percent}%` }}></div>
                                    <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-compact font-black tabular-nums shrink-0 ${isTopThree ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white/10 text-white/70'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-extrabold text-white truncate">{row.province}</div>
                                        </div>
                                        <div className="text-right shrink-0 flex items-baseline gap-1">
                                            <div className="text-sm font-black text-white tabular-nums leading-none">{days.toLocaleString()}</div>
                                            <div className="text-compact font-bold text-white/80">วัน</div>
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
                if (regionName.includes('เขต') && !regionName.includes('เขตสุขภาพที่') && !regionName.includes('กรุงเทพ')) {
                    regionName = regionName.replace('เขต', 'เขตสุขภาพที่').replace(/\s+/g, ' ').trim();
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
                if (regionName.includes('เขต') && !regionName.includes('เขตสุขภาพที่') && !regionName.includes('กรุงเทพ')) {
                    regionName = regionName.replace('เขต', 'เขตสุขภาพที่').replace(/\s+/g, ' ').trim();
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
    const [activeMap, setActiveMap] = useState<'avg' | 'streak37' | 'streak75'>('avg');

    return (
        <div className="min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden font-sans"
            style={{ backgroundImage: "url('/img/background-optimized.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
            {loading && <DashboardLoading />}

            <main aria-busy={loading} inert={loading} className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-screen flex flex-col gap-4">
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
                    <MultiSelect label="เขตสุขภาพ" options={options.regions} selected={filters.regions} onChange={(val: string[]) => setFilters({ ...filters, regions: val, provinces: [] })} />
                    <MultiSelect label="จังหวัด" options={baseProvinces} selected={filters.provinces} onChange={(val: string[]) => setFilters({ ...filters, provinces: val, districts: [] })} />
                    <MultiSelect label="อำเภอ/เขต" options={baseDistricts} selected={filters.districts} onChange={(val: string[]) => setFilters({ ...filters, districts: val })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 relative z-summary">
                    {[
                        { label: 'ค่าเฉลี่ย 24 ชั่วโมงฝุ่น PM2.5', value: data?.avgPM25, unit: 'มคก./ลบ.ม.', color: '#3b82f6', isPrimary: true },
                        { label: 'ค่าเฉลี่ย 24 ชั่วโมงฝุ่น PM2.5 สูงสุด', value: data?.maxPM25, unit: 'มคก./ลบ.ม.', color: '#f43f5e', isPrimary: false },
                        { label: 'จำนวนจังหวัดที่ค่าฝุ่น PM2.5 เกินค่ามาตรฐาน (37.5 มคก./ลบ.ม.)', value: exceedData37.count, unit: 'จังหวัด', color: '#f97316', isPrimary: false, tooltip: exceedData37.tooltip },
                        { label: 'จำนวนจังหวัดที่ค่าฝุ่น PM2.5 มากกว่า 75 มคก./ลบ.ม.', value: exceedData75.count, unit: 'จังหวัด', color: '#e11d48', isPrimary: false, tooltip: exceedData75.tooltip }
                    ].map((stat, i) => (
                        <div key={i} className={`relative ${stat.isPrimary
                            ? "bg-linear-to-br from-blue-600/90 to-sky-500/90 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/30 transition-all group min-h-32 flex flex-col justify-between"
                            : `bg-white/10 backdrop-blur-xl p-5 rounded-3xl shadow-xl border border-white/20 transition-all group ring-1 ring-white/5 min-h-32 flex flex-col justify-between ${stat.tooltip ? 'cursor-default hover:bg-white/20' : ''}`}`}>
                            <div className={`text-xs font-bold tracking-tight mb-2 leading-snug ${stat.isPrimary ? 'text-blue-100/90' : 'text-white/70'}`}><PM25Text>{stat.label}</PM25Text></div>
                            <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums flex items-end gap-2 drop-shadow-md">
                                {loading ? <div className={`h-9 w-24 animate-pulse rounded-lg ${stat.isPrimary ? 'bg-white/20' : 'bg-white/10'}`}></div> : stat.value?.toLocaleString()}
                                {!stat.isPrimary && <div className="w-1.5 h-6 rounded-full mb-1" style={{ backgroundColor: stat.color }}></div>}
                            </div>
                            <div className={`text-compact font-bold uppercase mt-1 ${stat.isPrimary ? 'text-white/50' : 'text-white/30'}`}>{stat.unit}</div>
                            
                            {stat.tooltip && Array.isArray(stat.tooltip) && stat.tooltip.length > 0 && (
                                <div className={`absolute top-full mt-3 w-tooltip-sm sm:w-tooltip-md lg:w-tooltip-lg max-h-dashboard-tooltip overflow-y-auto custom-scrollbar p-5 bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-overlay opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none ${i >= 2 ? 'right-0' : 'left-0'}`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        {stat.tooltip.map((item: any, idx: number) => (
                                            <div key={idx} className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-extrabold text-blue-400 drop-shadow-sm">{item.region}</span>
                                                    <span className="text-compact font-extrabold text-blue-100 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30 whitespace-nowrap">{item.count} จังหวัด</span>
                                                </div>
                                                <div className="text-compact-plus text-white/80 leading-relaxed font-medium">
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

                <div className="grid grid-cols-1 lg:grid-cols-dashboard gap-4 flex-1 min-h-0 relative z-content">
                    <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar scrollbar-hide">
                            <div className="h-ranking-chart shrink-0"><TopExceedRanking data={data?.top10Exceed || []} loading={loading} /></div>
                            <DeferredChart><MultiLineChart title="ค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 รายเขตสุขภาพ" dataGroup={data?.regionTrend || {}} loading={loading} /></DeferredChart>
                            <DeferredChart><MultiLineChart title="ค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 รายจังหวัด" dataGroup={data?.provinceTrend || {}} loading={loading} /></DeferredChart>
                            <DeferredChart><MultiLineChart title="ค่าเฉลี่ย 24 ชั่วโมงของฝุ่น PM2.5 รายอำเภอ/เขต" dataGroup={data?.districtTrend || {}} loading={loading} /></DeferredChart>
                        </div>
                    </div>

                    <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex flex-col gap-4 mb-6 shrink-0">
                            <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
                                <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                                    <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40 shrink-0"></div>
                                    <PM25Text>แผนที่รายงานระดับค่าฝุ่น PM2.5</PM25Text>
                                </h4>
                                {filters.startDate && filters.endDate && (
                                    <div className="text-compact-plus font-bold text-blue-200/70 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 shrink-0 flex items-center gap-2 w-fit">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        ข้อมูล: {filters.startDate === filters.endDate
                                            ? formatDateShort(filters.startDate)
                                            : `${formatDateShort(filters.startDate)} - ${formatDateShort(filters.endDate)}`}
                                    </div>
                                )}
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                <button onClick={() => setActiveMap('avg')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeMap === 'avg' ? 'bg-blue-500 text-white shadow-md' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}><PM25Text>ค่าฝุ่น PM2.5</PM25Text></button>
                                <button onClick={() => setActiveMap('streak37')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeMap === 'streak37' ? 'bg-orange-500 text-white shadow-md' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}><PM25Text>ค่าฝุ่น PM2.5 &gt; 37.5 มคก./ลบ.ม.</PM25Text></button>
                                <button onClick={() => setActiveMap('streak75')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeMap === 'streak75' ? 'bg-rose-500 text-white shadow-md' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}><PM25Text>ค่าฝุ่น PM2.5 &gt; 75 มคก./ลบ.ม.</PM25Text></button>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-map relative rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 shadow-inner bg-slate-800/50">
                            <ThailandMap
                                data={activeMap === 'avg' ? provinceMaxes : (activeMap === 'streak37' ? (data?.provinceStreak37 || {}) : (data?.provinceStreak75 || {}))}
                                filters={filters}
                                getColor={(v: number) => getColor(v, activeMap === 'avg' ? LEGENDS.pm25.items : (activeMap === 'streak37' ? LEGENDS.streak37.items : LEGENDS.streak75.items))}
                                legendConfig={activeMap === 'avg' ? LEGENDS.pm25 : (activeMap === 'streak37' ? LEGENDS.streak37 : LEGENDS.streak75)}
                                popupUnit={activeMap === 'avg' ? "มคก./ลบ.ม." : "วัน"}
                                interactive={false}
                                renderPopup={(province, rawValue, popupUnit) => {
                                    const value = typeof rawValue === 'object' ? rawValue.value : (rawValue || 0);
                                    const title = activeMap === 'avg'
                                        ? 'ค่าฝุ่น PM<span class="pm25-subscript">2.5</span> สูงสุด'
                                        : `จำนวนวันที่ PM<span class="pm25-subscript">2.5</span> > ${activeMap === 'streak37' ? '37.5' : '75'} มคก./ลบ.ม. ต่อเนื่อง`;
                                    
                                    let extraDateText = '';
                                    if (activeMap === 'streak37' && value > 0) {
                                        const trend = data?.provinceTrend?.[province] || data?.provinceTrend?.[province.replace('จังหวัด', '').trim()];
                                        if (trend && trend.length > 0) {
                                            const sorted = [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                            let currentStreak: Date[] = [];
                                            let latestStreak: Date[] = [];

                                            sorted.forEach((point) => {
                                                if (point.value > 37.5) {
                                                    const date = new Date(point.date);
                                                    const previousDate = currentStreak[currentStreak.length - 1];
                                                    const diffDays = previousDate
                                                        ? Math.round((date.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
                                                        : 1;
                                                    if (diffDays !== 1) {
                                                        if (currentStreak.length > 0) latestStreak = currentStreak;
                                                        currentStreak = [];
                                                    }
                                                    currentStreak.push(date);
                                                } else {
                                                    if (currentStreak.length > 0) latestStreak = currentStreak;
                                                    currentStreak = [];
                                                }
                                            });
                                            if (currentStreak.length > 0) latestStreak = currentStreak;

                                            if (latestStreak.length > 0) {
                                                const dateStr = summarizeDateRanges(latestStreak.map(d => d.toISOString()));
                                                extraDateText = `
                                                    <div class="flex flex-col gap-1 bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 mt-3">
                                                        <span class="text-compact font-bold text-orange-400/80 uppercase tracking-widest">วันที่ PM<span class="pm25-subscript">2.5</span> &gt; 37.5 มคก./ลบ.ม. ติดต่อกันล่าสุด</span>
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
                                                        <span class="text-compact font-bold text-rose-400/80 uppercase tracking-widest">วันที่ PM<span class="pm25-subscript">2.5</span> &gt; 75 มคก./ลบ.ม. ติดต่อกันล่าสุด</span>
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
