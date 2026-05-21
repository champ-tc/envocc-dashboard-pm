'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions, getUserAction } from './actions';
import type { HDCFilters, HDCOptions, DashboardData, HierarchyItem, MonthlyTrendData } from './actions';
import { HDC_DISEASES } from '@/lib/constants';

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
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-[200] mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
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
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-[200] mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
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
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-[200] mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-96 overflow-y-auto p-5 flex flex-col gap-6 ring-1 ring-white/20 scrollbar-hide">
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
    handleDistrictChange: (val: string[]) => void;
    handleSubdistrictChange: (val: string[]) => void;
    baseProvinces: string[];
    baseDistricts: string[];
    baseSubdistricts: string[];
    thaiMonthsShort: string[];
}

function FilterSection({ 
    filters, 
    options, 
    setFilters, 
    handleRegionChange,
    handleProvinceChange,
    handleDistrictChange,
    handleSubdistrictChange,
    baseProvinces,
    baseDistricts,
    baseSubdistricts,
    thaiMonthsShort 
}: FilterProps) {
    return (
        <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-4 items-end shrink-0 ring-1 ring-white/10 relative z-40">
            <CustomDatePicker 
                label="จากเดือน" 
                options={options?.dates || []} 
                value={filters.startDate} 
                onChange={(v: string) => setFilters((f: HDCFilters) => ({ ...f, startDate: v }))} 
                thaiMonths={thaiMonthsShort} 
            />
            <CustomDatePicker 
                label="ถึงเดือน" 
                options={options?.dates || []} 
                value={filters.endDate} 
                onChange={(v: string) => setFilters((f: HDCFilters) => ({ ...f, endDate: v }))} 
                thaiMonths={thaiMonthsShort} 
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
                label="อำเภอ/เขต" 
                options={baseDistricts} 
                selected={filters.districts} 
                onChange={handleDistrictChange} 
            />
            <MultiSelect 
                label="ตำบล/แขวง" 
                options={baseSubdistricts} 
                selected={filters.subdistricts} 
                onChange={handleSubdistrictChange} 
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
                        <span>จำนวนผู้ป่วยทั้งหมด</span>
                        <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
                        {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg"></div> : data?.totalPatients?.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-white/50 uppercase tracking-widest">ราย (สะสมจากฐานข้อมูลทั้งหมด)</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20 transition-all group flex flex-col justify-between ring-1 ring-white/10">
                    <div className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1 flex justify-between items-center">
                        <span>จำนวนการวินิจฉัยทั้งหมด (ครั้ง)</span>
                        <svg className="w-5 h-5 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
                        {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg"></div> : data?.totalDiagnoses?.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest italic">ตามเงื่อนไขตัวกรองที่เลือก</div>
                </div>
            </div>

            {/* Bottom Row: Disease Group Stats */}
            <div className="flex items-center gap-3 mb-1 mt-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">สถิติแยกตามกลุ่มโรค (Top 5)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {top5Sorted.map((stat, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-lg p-4 rounded-3xl shadow-xl border border-white/10 transition-all group ring-1 ring-white/5 min-h-24 flex flex-col justify-between hover:bg-white/10">
                        <div className="text-[10px] font-bold text-white/50 uppercase tracking-tight mb-1 leading-tight line-clamp-2" title={stat.label}>
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

    return (
        <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative transition-all duration-300 overflow-visible min-h-[400px] lg:min-h-0">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                    <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                    แนวโน้มจำนวนผู้ป่วยรายเดือน
                </h4>
            </div>

            <div className="flex-1 relative flex flex-col justify-end px-12 min-h-0 overflow-visible">
                <div className="absolute left-12 top-0 bottom-0 w-px bg-white/10 z-20">
                    <div className="absolute top-[-25px] left-0 text-[10px] font-black text-white/30 uppercase tracking-wider whitespace-nowrap">
                        จำนวนผู้ป่วย (ราย)
                    </div>
                </div>

                <div className="absolute right-12 top-0 bottom-0 w-px bg-white/10 z-20">
                    <div className="absolute top-[-25px] right-0 text-[10px] font-black text-rose-500/40 uppercase tracking-wider whitespace-nowrap text-right">
                        เฉลี่ยฝุ่น PM2.5 (µg/m³)
                    </div>
                </div>

                {!loading && data?.length > 0 && (() => {
                    const maxVal = Math.max(...data.map(x => x.total || 0), 1) * 1.1;
                    const pm25Max = Math.max(...data.map(x => x.avg_pm25 || 0), 50) * 1.1;
                    return (
                        <>
                            <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-between items-end py-1 text-[9px] font-bold text-white/20 tabular-nums pointer-events-none z-30">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i}>{Math.round(maxVal * (1 - i / 4)).toLocaleString()}</span>
                                ))}
                            </div>
                            <div className="absolute right-4 top-0 bottom-0 flex flex-col justify-between items-start py-1 text-[9px] font-bold text-rose-500/30 tabular-nums pointer-events-none z-30">
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
                                        <circle key={i} cx={x} cy={y} r="1" fill="#f43f5e" vectorEffect="non-scaling-stroke" className={`transition-all duration-300 ${hoveredIdx === i ? 'r-[3] fill-white' : ''}`} />
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
                                <div key={i} className={`flex-1 flex flex-col items-center group h-full relative min-w-0 transition-all duration-300 ${isHovered ? 'z-[100]' : 'z-10'}`}
                                     onMouseEnter={() => setHoveredIdx(i)}
                                     onMouseLeave={() => setHoveredIdx(null)}>
                                    
                                    <div className={`absolute inset-0 bg-white/5 pointer-events-none transition-opacity rounded-xl ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

                                    <div className="flex-1 w-full flex items-end justify-center relative z-10 pb-1">
                                        <div className={`fixed-top-tooltip absolute top-[-3.5rem] ${i < data.length / 2 ? 'left-0' : 'right-0'} bg-slate-900/98 backdrop-blur-3xl text-white p-4 rounded-3xl transition-all duration-300 pointer-events-none shadow-[0_30px_70px_rgba(0,0,0,0.8)] min-w-[340px] border border-white/20 ring-1 ring-white/10 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                            <div className="font-black mb-3 border-b border-white/10 pb-2 flex justify-between items-center shrink-0">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-blue-400 uppercase tracking-widest mb-0.5 font-bold">สถิติระบาดวิทยา</span>
                                                    <span className="text-lg text-white leading-none font-black">{monthLabel}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] text-rose-400 uppercase tracking-widest mb-0.5 font-bold">เฉลี่ยฝุ่น PM2.5</div>
                                                    <span className="text-2xl text-rose-500 font-black tabular-nums leading-none">{m.avg_pm25 || 0} <small className="text-[10px] opacity-40 font-bold">µg/m³</small></span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                                {activeDiseases.map(d => (
                                                    <div key={d.id} className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5 transition-colors">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.hex }}></div>
                                                            <span className="text-[10px] text-white/80 font-bold leading-tight truncate">{d.label}</span>
                                                        </div>
                                                        <div className="flex items-baseline gap-1 shrink-0 ml-1">
                                                            <b className="font-black tabular-nums text-xs text-white">{(m[d.id] || 0).toLocaleString()}</b>
                                                            <span className="text-[7px] text-white/30 font-bold uppercase">ราย</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">ผู้ป่วยสะสมรวม</span>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl text-blue-400 font-black tabular-nums drop-shadow-[0_0_15px_rgba(96,165,250,0.4)]">{(m.total || 0).toLocaleString()}</span>
                                                    <span className="text-[9px] text-blue-400/50 font-bold uppercase">ราย</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`w-full flex flex-col justify-end h-full max-w-[20px] transition-all duration-300 ${isHovered ? 'scale-x-125 brightness-110' : 'group-all-hover:opacity-40'}`}>
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
                                    <span className={`absolute bottom-[-28px] text-[9px] font-black whitespace-nowrap uppercase tracking-tighter transition-colors ${isHovered ? 'text-blue-400' : 'text-white/30'}`}>{monthShortLabel}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 pt-4 border-t border-white/5 shrink-0">
                    {HDC_DISEASES.map(d => (
                        <div key={d.id} className="flex items-center gap-2 group cursor-default">
                            <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: d.hex }}></div>
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">{d.shortLabel}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className="w-6 h-0.5 bg-rose-500 rounded-full shadow-lg"></div>
                        <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest group-hover:text-rose-400 transition-colors">ฝุ่น PM2.5</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component ---
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

const ddcColorScale = (val: number) => {
    if (val === 0) return 'rgba(255, 255, 255, 0.1)';
    if (val <= 10) return '#10b981';
    if (val <= 50) return '#60a5fa';
    if (val <= 100) return '#facc15';
    if (val <= 200) return '#f97316';
    return '#ef4444';
};

const ddcLegend = {
    title: 'ระดับความเสี่ยง',
    unit: 'จำนวนผู้ป่วย',
    items: [
        { range: '0 - 10 ราย', color: '#10b981' },
        { range: '11 - 50 ราย', color: '#60a5fa' },
        { range: '51 - 100 ราย', color: '#facc15' },
        { range: '101 - 200 ราย', color: '#f97316' },
        { range: '201 ราย ขึ้นไป', color: '#ef4444' }
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
    const [filters, setFilters] = useState<HDCFilters>({ 
        startDate: '', endDate: '', regions: [], provinces: [], 
        districts: [], subdistricts: [], diseases: [], 
        diagnosisTypes: ['การวินิจฉัยโรคหลัก ร่วมกับ Z58.1'] 
    });

    useEffect(() => {
        getUserAction().then(setUser);
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

    const baseDistricts = useMemo(() => {
        if (!options.hierarchy) return [];
        const dists = filters.provinces.length === 0 
            ? options.districts 
            : Array.from(new Set(options.hierarchy.filter(h => filters.provinces.includes(h.province)).map(h => h.district)));
        return dists.sort((a, b) => a.localeCompare(b, 'th'));
    }, [filters.provinces, options.districts, options.hierarchy]);

    const baseSubdistricts = useMemo(() => {
        if (!options.hierarchy) return [];
        const subs = filters.districts.length === 0 
            ? options.subdistricts 
            : Array.from(new Set(options.hierarchy.filter(h => filters.districts.includes(h.district)).map(h => h.subdistrict)));
        return subs.sort((a, b) => a.localeCompare(b, 'th'));
    }, [filters.districts, options.subdistricts, options.hierarchy]);

    const handleRegionChange = useCallback((val: string[]) => {
        setFilters(prev => ({ ...prev, regions: val, provinces: [], districts: [], subdistricts: [] }));
    }, []);

    const handleProvinceChange = useCallback((val: string[]) => {
        setFilters(prev => ({ ...prev, provinces: val, districts: [], subdistricts: [] }));
    }, []);

    const handleDistrictChange = useCallback((val: string[]) => {
        setFilters(prev => ({ ...prev, districts: val, subdistricts: [] }));
    }, []);

    const handleSubdistrictChange = useCallback((val: string[]) => {
        setFilters(prev => ({ ...prev, subdistricts: val }));
    }, []);

    useEffect(() => {
        const now = new Date();
        const limitFullDate = now.toISOString().split('T')[0];

        getFilterOptions().then(opts => {
            if (!opts) return;
            const filteredDates = opts.dates.filter(d => d <= limitFullDate).sort((a, b) => b.localeCompare(a));
            setOptions({ ...opts, dates: filteredDates });

            if (filteredDates.length) {
                const latestDate = new Date(filteredDates[0]);
                const year = latestDate.getFullYear();
                const month = latestDate.getMonth() + 1;
                const startYear = month >= 10 ? year : year - 1;
                setFilters(prev => ({ ...prev, startDate: `${startYear}-10-01`, endDate: filteredDates[0] }));
            }
        });
    }, []);

    const fetchData = useCallback(async (currentFilters: HDCFilters, scope: any) => {
        if (!currentFilters.startDate || !currentFilters.endDate) return;
        setLoading(true);
        try {
            const res = await getDashboardData(currentFilters, scope);
            setData(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(filters, user?.scope);
    }, [filters, fetchData, user]);

    return (
        <div className="min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden font-sans"
            style={{ backgroundImage: "url('/img/background.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>

            <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-screen flex flex-col gap-4">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 relative z-[60]">
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 bg-white p-1.5 rounded-2xl shadow-2xl border border-white/50 ring-4 ring-white/10">
                            <Image src="/img/logo_ddc.png" alt="DDC Logo" width={50} height={50} className="rounded-xl object-contain" style={{ width: 'auto', height: 'auto' }} priority />
                        </div>
                        <div className="shrink-0 bg-white p-1.5 rounded-2xl shadow-2xl border border-white/50 ring-4 ring-white/10">
                            <Image src="/img/logo_hdc.jpg" alt="HDC Logo" width={50} height={50} className="rounded-xl object-contain" style={{ width: 'auto', height: 'auto' }} priority />
                        </div>
                        <div className="flex flex-col text-white">
                            <h5 className="text-lg md:text-xl font-extrabold leading-tight">การเฝ้าระวังสถานการณ์ฝุ่น PM2.5 และผู้ป่วยที่เกี่ยวข้อง</h5>
                            <p className="text-xs font-bold text-blue-200 uppercase tracking-widest opacity-80">
                                {user?.role === 'admin_province' ? `ผู้ดูแลระบบระดับจังหวัด: ${user.workplaceProvince}` : 
                                 user?.role === 'admin_region' ? `ผู้ดูแลระบบระดับเขต: ${user.ddcRegion}` : 
                                 'ผู้ดูแลระบบส่วนกลาง'}
                            </p>
                        </div>
                    </div>
                    <Link href="/" className="bg-white/10 hover:bg-white/20 transition-all p-3.5 rounded-2xl border border-white/10 shadow-lg self-end md:self-auto">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </Link>
                </header>

                <div className="relative z-[50]">
                    <FilterSection 
                        filters={filters} 
                        options={options} 
                        setFilters={setFilters} 
                        handleRegionChange={handleRegionChange}
                        handleProvinceChange={handleProvinceChange}
                        handleDistrictChange={handleDistrictChange}
                        handleSubdistrictChange={handleSubdistrictChange}
                        baseProvinces={baseProvinces}
                        baseDistricts={baseDistricts}
                        baseSubdistricts={baseSubdistricts}
                        thaiMonthsShort={THAI_MONTHS_SHORT} 
                    />
                </div>

                <div className="relative z-[30]">
                    <StatCards data={data} loading={loading} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.1fr] gap-4 flex-1 min-h-0 relative z-[20]">
                    <MonthlyTrendChart data={data?.monthlyTrend || []} loading={loading} thaiMonthsFull={THAI_MONTHS_FULL} thaiMonthsShort={THAI_MONTHS_SHORT} />

                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 relative">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 tracking-tight uppercase">
                                <div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>
                                สถิติผู้ป่วยรายจังหวัด
                            </h4>
                        </div>
                        <div className="flex-1 w-full min-h-[500px] relative rounded-xl overflow-hidden border border-white/5 bg-slate-800/50">
                            <ThailandMap
                                data={data?.provinceAverages || {}} 
                                filters={filters} 
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