'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions, getUserAction } from './actions';
import type { HDCFilters, HDCOptions, DashboardData, HierarchyItem, MonthlyTrendData } from './actions';
import { HDC_DISEASES } from '@/lib/constants';
import DashboardNavbar from '../_components/DashboardNavbar';
import DashboardBusyAlert from '../_components/DashboardBusyAlert';
import DashboardLoading from '../_components/DashboardLoading';
import DashboardDatePicker from '@/components/shared/DashboardDatePicker';
import { PM25Text } from '@/components/PM25Mark';
import CloudLoader from '@/components/CloudLoader';

const DASHBOARD_ERROR_MESSAGE = 'ระบบประมวลผลข้อมูลไม่สำเร็จ กรุณากดลองใหม่ หากยังพบปัญหาโปรดแจ้งผู้ดูแลระบบ';

// --- FilterSection Component ---
function SingleSelect({ label, options, selected, onChange }: { label: string, options: string[], selected: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];
    return (
        <div className="relative col-span-1">
            <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {selected || 'กรุณาเลือก'}
                </div>
                <svg className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-dropdown mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
                        {safeOptions.map((opt: string) => (
                            <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-all group">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selected === opt ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/30' : 'border-white/10 group-hover:border-white/30'}`}>
                                    {selected === opt && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                <span className={`text-xs transition-colors ${selected === opt ? 'font-extrabold text-blue-400' : 'font-bold text-white/70'}`}>{opt}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function MultiSelect({ label, options, selected, onChange, placeholder = "ทั้งหมด" }: { label: string, options: string[], selected: string[], onChange: (val: string[]) => void, placeholder?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];
    const safeSelected = selected || [];
    return (
        <div className="relative col-span-1">
            <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {safeSelected.length === 0 ? placeholder : (safeSelected.length === safeOptions.length ? 'ทั้งหมด' : safeSelected.join(', '))}
                </div>
                <svg className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-dropdown mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
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

function CustomDatePicker({ label, options, value, onChange, thaiMonths }: { label: string, options: string[], value: string, onChange: (val: string) => void, thaiMonths: string[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'ทั้งหมด' || dateStr === 'ล่าสุด') return dateStr;
        const parts = dateStr.split('-');
        if (parts.length < 2) return dateStr;
        const [y, m] = parts;
        return `${thaiMonths[parseInt(m) - 1]} ${(parseInt(y) + 543).toString().slice(-2)}`;
    };

    const groupedDates = safeOptions.reduce((acc: Record<string, string[]>, date: string) => {
        const year = date.split('-')[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push(date);
        return acc;
    }, {});

    const years = Object.keys(groupedDates).sort((a, b) => b.localeCompare(a));

    return (
        <div className="relative col-span-1">
            <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {formatDate(value)}
                </div>
                <svg className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-dropdown mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-96 overflow-y-auto p-5 flex flex-col gap-6 ring-1 ring-white/20 scrollbar-hide">
                        {years.map(year => (
                            <div key={year} className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 px-2">
                                    <span className="text-sm font-extrabold text-blue-400 tabular-nums">พ.ศ. {parseInt(year) + 543}</span>
                                    <div className="h-px flex-1 bg-white/10"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {groupedDates[year].sort((a: string, b: string) => b.localeCompare(a)).map((opt: string) => {
                                        const parts = opt.split('-');
                                        const mName = thaiMonths[parseInt(parts[1]) - 1];
                                        const isActive = value === opt;
                                        return (
                                            <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }}
                                                className={`flex items-center justify-center p-2.5 rounded-xl cursor-pointer transition-all border text-xs font-bold
                                                 ${isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}>
                                                {mName}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

interface FilterProps {
    filters: HDCFilters;
    options: HDCOptions;
    setFilters: (update: (f: HDCFilters) => HDCFilters) => void;
    handleRegionChange: (val: string[]) => void;
    handleProvinceChange: (val: string[]) => void;
    baseProvinces: string[];
    thaiMonthsShort: string[];
}

function FilterSection({ 
    filters, 
    options, 
    setFilters, 
    handleRegionChange,
    handleProvinceChange,
    baseProvinces,
    thaiMonthsShort 
}: FilterProps) {
    return (
        <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end shrink-0 ring-1 ring-white/10 relative z-40">
            <DashboardDatePicker
                label="จากเดือน" 
                options={options?.dates || []} 
                value={filters.startDate} 
                onChange={(v: string) => setFilters((f: HDCFilters) => ({ ...f, startDate: v }))} 
            />
            <DashboardDatePicker
                label="ถึงเดือน" 
                options={options?.dates || []} 
                value={filters.endDate} 
                onChange={(v: string) => setFilters((f: HDCFilters) => ({ ...f, endDate: v }))} 
            />
            <MultiSelect 
                label="เขตสุขภาพ" 
                options={options?.regions || []} 
                selected={filters.regions} 
                onChange={handleRegionChange} 
            />
            <MultiSelect 
                label="จังหวัด" 
                options={baseProvinces} 
                selected={filters.provinces} 
                onChange={handleProvinceChange} 
            />
            <MultiSelect 
                label="กลุ่มโรค" 
                options={options?.diseases || []} 
                selected={filters.diseases} 
                onChange={(val: string[]) => setFilters((f: HDCFilters) => ({ ...f, diseases: val }))} 
            />
            <SingleSelect 
                label="การวินิจฉัย" 
                options={options?.diagnosisTypes || []} 
                selected={filters.diagnosisTypes?.[0]} 
                onChange={(val: string) => setFilters((f: HDCFilters) => ({ ...f, diagnosisTypes: [val] }))} 
            />
        </div>
    );
}

// --- StatCards Component ---
interface StatCardsProps {
    data: DashboardData | null;
    loading: boolean;
}

function StatCards({ data, loading }: StatCardsProps) {
    const top5Sorted = [...(data?.top5DiseaseStats || [])]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const getHexColor = (colorName: string) => {
        switch (colorName) {
            case 'rose': return '#f43f5e';
            case 'orange': return '#f97316';
            case 'amber': return '#f59e0b';
            case 'emerald': return '#10b981';
            case 'blue': return '#3b82f6';
            case 'purple': return '#a855f7';
            default: return '#3b82f6';
        }
    };

    return (
        <div className="flex flex-col gap-4 shrink-0 relative z-30">
            {/* Top Row: Main Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-linear-to-br from-blue-600/90 to-sky-500/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/30 transition-all group flex flex-col justify-between">
                    <div className="text-xs font-bold text-blue-100/70 uppercase tracking-widest mb-1 flex justify-between items-center">
                        <span>จำนวนผู้ป่วยการวินิจฉัยโรคทั้งหมด</span>
                        <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
                        {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg"></div> : data?.totalPatients?.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-white/50 uppercase tracking-widest">ราย</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20 transition-all group flex flex-col justify-between ring-1 ring-white/10">
                    <div className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1 flex justify-between items-center">
                        <span>จำนวนการวินิจฉัยทั้งหมด (ครั้ง)</span>
                        <svg className="w-5 h-5 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
                        {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg"></div> : data?.totalDiagnoses?.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest italic">ตามเงื่อนไขตัวกรองการวินิจฉัยที่เลือก</div>
                </div>
            </div>

            {/* Bottom Row: Disease Group Stats */}
            <div className="flex items-center gap-3 mb-1 mt-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-compact font-black text-white/40 uppercase tracking-stat-label">จำนวนการวินิจฉัยแยกตามกลุ่มโรค</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {top5Sorted.map((stat, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-lg p-4 rounded-3xl shadow-xl border border-white/10 transition-all group ring-1 ring-white/5 min-h-24 flex flex-col justify-between hover:bg-white/10">
                        <div className="text-compact font-bold text-white/50 uppercase tracking-tight mb-1 leading-tight line-clamp-2" title={stat.label}>
                            {stat.label}
                        </div>
                        <div className="text-xl font-black text-white tracking-tight tabular-nums flex items-end gap-2">
                            {loading ? <div className="h-7 w-20 bg-white/10 animate-pulse rounded-lg"></div> : stat.value?.toLocaleString()}
                            <div className="w-1 h-5 rounded-full mb-0.5 shadow-sm" style={{ backgroundColor: getHexColor(stat.color) }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- MonthlyTrendChart Component ---
interface MonthlyTrendChartProps {
    data: MonthlyTrendData[];
    loading: boolean;
    thaiMonthsFull: string[];
    thaiMonthsShort: string[];
}

function MonthlyTrendChart({ data, loading, thaiMonthsFull, thaiMonthsShort }: MonthlyTrendChartProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const monthLabelStep = Math.max(1, Math.ceil(data.length / 8));

    return (
        <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative transition-all duration-300 overflow-visible min-h-chart lg:min-h-0">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                    <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                    <PM25Text>จำนวนผู้ป่วยโรคที่เกี่ยวข้องกับการรับสัมผัสฝุ่น PM2.5 และค่าเฉลี่ยฝุ่น PM2.5 รายเดือน</PM25Text>
                </h4>
            </div>

            <div className="flex-1 relative flex flex-col justify-end px-12 min-h-0 overflow-visible">
                <div className="absolute left-12 top-0 bottom-0 w-px bg-white/10 z-20">
                    <div className="absolute top-chart-caption left-0 text-compact font-black text-white/80 uppercase tracking-wider whitespace-nowrap">
                        จำนวนการวินิจฉัยแยกตามกลุ่มโรค
                    </div>
                </div>

                <div className="absolute right-12 top-0 bottom-0 w-px bg-white/10 z-20">
                    <div className="absolute top-chart-caption right-0 text-compact font-black text-rose-300 uppercase tracking-wider whitespace-nowrap text-right">
                        <PM25Text>ค่าเฉลี่ยฝุ่น PM2.5 (มคก./ลบ.ม.)</PM25Text>
                    </div>
                </div>

                {!loading && data?.length > 0 && (() => {
                    const maxVal = Math.max(...data.map(x => x.total || 0), 1) * 1.1;
                    const pm25Max = Math.max(...data.map(x => x.avg_pm25 || 0), 50) * 1.1;
                    return (
                        <>
                            <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-between items-end py-1 text-2xs-plus font-bold text-white/20 tabular-nums pointer-events-none z-30">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i}>{Math.round(maxVal * (1 - i / 4)).toLocaleString()}</span>
                                ))}
                            </div>
                            <div className="absolute right-4 top-0 bottom-0 flex flex-col justify-between items-start py-1 text-2xs-plus font-bold text-rose-500/30 tabular-nums pointer-events-none z-30">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i}>{Math.round(pm25Max * (1 - i / 4)).toLocaleString()}</span>
                                ))}
                            </div>
                        </>
                    );
                })()}

                <div className="absolute inset-x-12 inset-y-0 flex flex-col justify-between pointer-events-none opacity-10">
                    {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white/10"></div>)}
                </div>

                <div className="flex-1 overflow-visible relative">
                    {!loading && data?.length > 0 && (() => {
                        const pm25Max = Math.max(...data.map(x => x.avg_pm25 || 0), 50) * 1.1;
                        return (
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 bottom-0 w-full h-full z-30 pointer-events-none overflow-visible">
                                <polyline points={data.map((m, i) => {
                                    return `${(i + 0.5) * (100 / data.length)},${100 - (pm25Max > 0 ? (m.avg_pm25 / pm25Max) * 100 : 0)}`;
                                }).join(' ')} fill="none" stroke="#f43f5e" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                                {data.map((m, i) => {
                                    const y = 100 - (pm25Max > 0 ? (m.avg_pm25 / pm25Max) * 100 : 0);
                                    const x = (i + 0.5) * (100 / data.length);
                                    return (
                                        <circle key={i} cx={x} cy={y} r="1" fill="#f43f5e" vectorEffect="non-scaling-stroke" className={`transition-all duration-300 ${hoveredIdx === i ? 'chart-point-active fill-white' : ''}`} />
                                    );
                                })}
                            </svg>
                        );
                    })()}

                    <div className="flex items-end justify-between gap-0 absolute inset-0 group/all overflow-visible">
                        {data?.map((m, i) => {
                            const maxVal = Math.max(...data.map(x => x.total || 0), 1) * 1.1;
                            const activeDiseases = HDC_DISEASES;

                            const parts = m.month?.split('-');
                            const monthLabel = parts && parts.length >= 2 ? `${thaiMonthsFull[parseInt(parts[1]) - 1]} ${(parseInt(parts[0]) + 543).toString().slice(-2)}` : m.month;
                            const monthShortLabel = parts && parts.length >= 2 ? `${thaiMonthsShort[parseInt(parts[1]) - 1]} ${(parseInt(parts[0]) + 543).toString().slice(-2)}` : m.month;

                            const isHovered = hoveredIdx === i;

                            return (
                                <div key={i} className={`flex-1 flex flex-col items-center group h-full relative min-w-0 transition-all duration-300 ${isHovered ? 'z-overlay' : 'z-10'}`}
                                     onMouseEnter={() => setHoveredIdx(i)}
                                     onMouseLeave={() => setHoveredIdx(null)}>
                                    
                                    <div className={`absolute inset-0 bg-white/5 pointer-events-none transition-opacity rounded-xl ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

                                    <div className="flex-1 w-full flex items-end justify-center relative z-10 pb-1">
                                        <div className={`fixed-top-tooltip absolute top-chart-tooltip ${i < data.length / 2 ? 'left-0' : 'right-0'} bg-slate-900/98 backdrop-blur-3xl text-white p-4 rounded-3xl transition-all duration-300 pointer-events-none shadow-chart-tooltip min-w-chart-tooltip-wide border border-white/20 ring-1 ring-white/10 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                            <div className="font-black mb-3 border-b border-white/10 pb-2 flex justify-between items-center shrink-0">
                                                <div className="flex flex-col">
                                                    <span className="text-lg text-white leading-none font-black">{monthLabel}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xs-plus text-rose-400 uppercase tracking-widest mb-0.5 font-bold"><PM25Text>ค่าเฉลี่ย PM2.5</PM25Text></div>
                                                    <span className="text-2xl text-rose-500 font-black tabular-nums leading-none">{m.avg_pm25 || 0} <small className="text-compact opacity-40 font-bold">มคก./ลบ.ม.</small></span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                                {activeDiseases.map(d => (
                                                    <div key={d.id} className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5 transition-colors">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.hex }}></div>
                                                            <span className="text-compact text-white/80 font-bold leading-tight truncate">{d.label}</span>
                                                        </div>
                                                        <div className="flex items-baseline gap-1 shrink-0 ml-1">
                                                            <b className="font-black tabular-nums text-xs text-white">{(m[d.id] || 0).toLocaleString()}</b>
                                                            <span className="text-micro text-white/80 font-bold uppercase">ราย</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-compact text-white/80 font-black uppercase tracking-widest">ผู้ป่วยสะสมรวม</span>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl text-blue-400 font-black tabular-nums drop-shadow-stat-glow">{(m.total || 0).toLocaleString()}</span>
                                                    <span className="text-2xs-plus text-blue-400/50 font-bold uppercase">ราย</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`w-full flex flex-col justify-end h-full max-w-chart-bar transition-all duration-300 ${isHovered ? 'scale-x-125 brightness-110' : 'group-all-hover:opacity-40'}`}>
                                            {activeDiseases.map(d => {
                                                const h = ((Number(m[d.id] || 0)) / maxVal) * 100;
                                                if (h <= 0) return null;
                                                return (
                                                    <div key={d.id} style={{ height: `${h}%`, backgroundColor: d.hex }}
                                                        className="w-full transition-all duration-300 shadow-sm first:rounded-t last:rounded-b"></div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {(i === 0 || i === data.length - 1 || (i % monthLabelStep === 0 && data.length - 1 - i >= monthLabelStep)) && (
                                        <span className={`absolute bottom-chart-label text-2xs-plus font-black whitespace-nowrap uppercase tracking-tighter transition-colors ${isHovered ? 'text-blue-400' : 'text-white/80'}`}>
                                            {monthShortLabel}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 pt-4 border-t border-white/5 shrink-0">
                    {HDC_DISEASES.map(d => (
                        <div key={d.id} className="flex items-center gap-2 group cursor-default">
                            <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: d.hex }}></div>
                            <span className="text-compact font-black text-white/80 uppercase tracking-widest group-hover:text-white transition-colors">{d.label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className="w-6 h-0.5 bg-rose-500 rounded-full shadow-lg"></div>
                        <span className="text-compact font-black text-rose-500/80 uppercase tracking-widest group-hover:text-rose-400 transition-colors"><PM25Text>ฝุ่น PM2.5</PM25Text></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component ---
const ThailandMap = dynamic(() => import('@/components/shared/ThailandMap'), {
    ssr: false,
    loading: () => <CloudLoader fullscreen={false} label="กำลังโหลดแผนที่สุขภาพ..." className="rounded-xl border border-white/30" />
});

const ddcColorScale = (val: number) => {
    if (val <= 10) return '#fee2e2';
    if (val <= 50) return '#fecaca';
    if (val <= 100) return '#fca5a5';
    if (val <= 200) return '#ef4444';
    return '#991b1b';
};

const ddcLegend = {
    title: 'จำนวนผู้ป่วย',
    unit: '',
    items: [
        { range: '0 - 10 ราย', color: '#fee2e2' },
        { range: '11 - 50 ราย', color: '#fecaca' },
        { range: '51 - 100 ราย', color: '#fca5a5' },
        { range: '101 - 200 ราย', color: '#ef4444' },
        { range: '201 ราย ขึ้นไป', color: '#991b1b' }
    ]
};

const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export default function DashboardHDC() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [options, setOptions] = useState<HDCOptions>({ 
        dates: [], regions: [], provinces: [], districts: [], subdistricts: [], diseases: [], diagnosisTypes: [], hierarchy: []
    });
    const [loading, setLoading] = useState(true);
    const [busyMessage, setBusyMessage] = useState<string | null>(null);
    const latestRequestId = useRef(0);
    const [filters, setFilters] = useState<HDCFilters>({ 
        startDate: '', endDate: '', regions: [], provinces: [], 
        districts: [], subdistricts: [], diseases: [], 
        diagnosisTypes: ['การวินิจฉัยโรคหลัก ร่วมกับ Z58.1'] 
    });

    useEffect(() => {
        getUserAction().then(setUser).catch((error) => {
            console.error('Unable to load dashboard user:', error);
            setUser(null);
        });
    }, []);

    useEffect(() => {
        if (user?.scope?.isProvince && user.scope.province) {
            setFilters(prev => ({ ...prev, provinces: [user.scope.province] }));
        } else if (user?.scope?.isRegion && user.scope.region) {
            const regionNum = user.scope.region.replace(/[^0-9]/g, '');
            if (regionNum) {
                const regionName = regionNum === '13' ? 'กรุงเทพมหานคร' : `เขตสุขภาพที่ ${regionNum}`;
                setFilters(prev => ({ ...prev, regions: [regionName] }));
            }
        }
    }, [user]);

    const baseProvinces = useMemo(() => {
        if (!options.hierarchy) return [];
        const provs = filters.regions.length === 0 
            ? options.provinces 
            : Array.from(new Set(options.hierarchy.filter(h => filters.regions.includes(h.region)).map(h => h.province)));
        return provs.sort((a, b) => a.localeCompare(b, 'th'));
    }, [filters.regions, options.provinces, options.hierarchy]);

    const provinceMapFilters = useMemo(() => ({
        provinces: filters.provinces,
        districts: [] as string[]
    }), [filters.provinces]);

    const handleRegionChange = useCallback((val: string[]) => {
        setFilters(prev => ({ ...prev, regions: val, provinces: [], districts: [], subdistricts: [] }));
    }, []);

    const handleProvinceChange = useCallback((val: string[]) => {
        setFilters(prev => ({ ...prev, provinces: val, districts: [], subdistricts: [] }));
    }, []);

    useEffect(() => {
        const now = new Date();
        const limitFullDate = now.toISOString().split('T')[0];

        getFilterOptions().then(opts => {
            if (!opts) {
                setBusyMessage(DASHBOARD_ERROR_MESSAGE);
                setLoading(false);
                return;
            }
            setBusyMessage(null);
            const filteredDates = opts.dates.filter(d => d <= limitFullDate).sort((a, b) => b.localeCompare(a));
            setOptions({ ...opts, dates: filteredDates });

            if (filteredDates.length) {
                const latestDate = new Date(filteredDates[0]);
                const year = latestDate.getFullYear();
                const month = latestDate.getMonth() + 1;
                const startYear = month >= 10 ? year : year - 1;
                setFilters(prev => ({ ...prev, startDate: `${startYear}-10-01`, endDate: filteredDates[0] }));
            } else {
                setBusyMessage('ไม่พบช่วงวันที่ที่มีข้อมูลสำหรับแสดงผล');
                setLoading(false);
            }
        }).catch(() => {
            setBusyMessage(DASHBOARD_ERROR_MESSAGE);
            setLoading(false);
        });
    }, []);

    const fetchData = useCallback(async (currentFilters: HDCFilters, scope: any, requestId: number) => {
        if (!currentFilters.startDate || !currentFilters.endDate) return;
        try {
            const res = await getDashboardData(currentFilters, scope);
            if (requestId === latestRequestId.current) {
                if (res) {
                    setData(res);
                    setBusyMessage(null);
                } else {
                    setBusyMessage(DASHBOARD_ERROR_MESSAGE);
                }
            }
        } catch (error) {
            if (requestId === latestRequestId.current) {
                console.error(error);
                setBusyMessage(DASHBOARD_ERROR_MESSAGE);
            }
        } finally {
            if (requestId === latestRequestId.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!filters.startDate || !filters.endDate) return;
        const requestId = ++latestRequestId.current;
        setLoading(true);
        setBusyMessage(null);
        const timeout = window.setTimeout(() => fetchData(filters, user?.scope, requestId), 350);
        return () => {
            window.clearTimeout(timeout);
            latestRequestId.current++;
        };
    }, [filters, fetchData, user]);

    return (
        <div className="min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden font-sans"
            style={{ backgroundImage: "url('/img/background-optimized.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
            {loading && <DashboardLoading />}

            <main aria-busy={loading} inert={loading} className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-screen flex flex-col gap-4">
                <DashboardNavbar
                    logos={[
                        { src: '/img/ddc-logo-optimized.png', alt: 'DDC Logo' },
                        { src: '/img/logo_hdc.jpg', alt: 'HDC Logo' },
                    ]}
                    title={<PM25Text>การเฝ้าระวังสถานการณ์ฝุ่น PM2.5 และผู้ป่วยโรคที่เกี่ยวข้องกับการรับสัมผัสฝุ่น PM2.5 ประเทศไทย</PM25Text>}
                    subtitle={
                        user?.role === 'admin_province' ? `ผู้ดูแลระบบระดับจังหวัด: ${user.workplaceProvince}` :
                        user?.role === 'admin_region' ? `ผู้ดูแลระบบระดับเขต: ${user.ddcRegion}` :
                        'ระบบคลังข้อมูลด้านการแพทย์และสุขภาพ (HDC)'
                    }
                    className="relative z-header"
                />
                <DashboardBusyAlert message={busyMessage} prominent />

                <div className="relative z-toolbar">
                    <FilterSection 
                        filters={filters} 
                        options={options} 
                        setFilters={setFilters} 
                        handleRegionChange={handleRegionChange}
                        handleProvinceChange={handleProvinceChange}
                        baseProvinces={baseProvinces}
                        thaiMonthsShort={THAI_MONTHS_SHORT} 
                    />
                </div>

                <div className="relative z-section-raised">
                    <StatCards data={data} loading={loading} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-dashboard gap-4 flex-1 min-h-0 relative z-section">
                    <MonthlyTrendChart data={data?.monthlyTrend || []} loading={loading} thaiMonthsFull={THAI_MONTHS_FULL} thaiMonthsShort={THAI_MONTHS_SHORT} />

                    <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 relative">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                                <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                                จำนวนผู้ป่วยรายจังหวัด
                            </h4>
                        </div>
                        <div className="flex-1 w-full min-h-map relative rounded-xl overflow-hidden border border-white/5 bg-slate-800/50">
                            <ThailandMap
                                data={data?.provinceAverages || {}} 
                                filters={provinceMapFilters}
                                getColor={ddcColorScale} 
                                legendConfig={ddcLegend} 
                                popupUnit="ราย"
                                renderPopup={(province, rawValue, popupUnit) => {
                                    const value = typeof rawValue === 'object' ? rawValue.value : 0;
                                    const rate = typeof rawValue === 'object' ? rawValue.rate : 0;
                                    return `
                                        <div class="font-sans p-6 min-w-60 bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl">
                                            <div class="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">${province}</div>
                                            <div class="space-y-3">
                                                <div class="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                                                    <span class="text-xs font-bold text-white/50 uppercase tracking-widest">จำนวนผู้ป่วย</span>
                                                    <span class="text-lg font-black text-white tabular-nums">${Math.round(value).toLocaleString()} <small class="text-xs opacity-40 font-bold">${popupUnit}</small></span>
                                                </div>
                                                <div class="flex items-center justify-between bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                                                    <span class="text-xs font-bold text-blue-400 uppercase tracking-widest">อัตราป่วย</span>
                                                    <span class="text-lg font-black text-blue-400 tabular-nums">${rate.toFixed(2)} <small class="text-xs opacity-60 font-bold">ต่อแสน</small></span>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                footer { display: none !important; }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
            `}} />
        </div>
    );
}
