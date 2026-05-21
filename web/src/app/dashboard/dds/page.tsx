'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions, getCurrentUser, DDSOptions, DDSFilters, DDSDashboardData, MonthlyTrendData } from './actions';
import { DDS_DISEASES } from '@/lib/constants';

// --- Shared Components ---

// โหลด ThailandMap แบบ Dynamic เพื่อเลี่ยงปัญหา SSR
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

// Custom SingleSelect
function SingleSelect({ label, options, selected, onChange }: { label?: string, options: string[], selected: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];
    return (
        <div className="relative col-span-1">
            {label && <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>}
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

// Custom MultiSelect
function MultiSelect({ label, options, selected, onChange, placeholder = "ทั้งหมด", renderOption }: { label?: string, options: string[], selected: string[], onChange: (val: string[]) => void, placeholder?: string, renderOption?: (opt: string) => string }) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];
    const safeSelected = selected || [];
    const getDisplayText = (opt: string) => renderOption ? renderOption(opt) : opt;

    return (
        <div className="relative col-span-1 w-full">
            {label && <label className="block text-xs uppercase font-bold text-white/70 mb-2 ml-2 tracking-wider">{label}</label>}
            <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {safeSelected.length === 0 ? placeholder : (safeSelected.length === safeOptions.length ? 'ทั้งหมด' : safeSelected.map(getDisplayText).join(', '))}
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
                                <span className={`text-xs transition-colors ${safeSelected.includes(opt) ? 'font-extrabold text-blue-400' : 'font-bold text-white/70'}`}>{getDisplayText(opt)}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Custom DatePicker
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

// --- Main Page Component ---

const ddcColorScale = (val: number) => {
    if (val === 0) return 'rgba(255, 255, 255, 0.1)';
    if (val <= 10) return '#10b981';
    if (val <= 50) return '#60a5fa';
    if (val <= 100) return '#facc15';
    if (val <= 200) return '#f97316';
    return '#ef4444';
};

const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const DISEASE_CARDS = [
    { id: 'respiratory', label: 'กลุ่มโรคทางเดินหายใจ', dbValue: 'โรคระบบทางเดินหายใจ', color: 'rose' },
    { id: 'circulatory', label: 'กลุ่มโรคหัวใจและหลอดเลือด', dbValue: 'โรคระบบไหลเวียนเลือด', color: 'orange' },
    { id: 'skin', label: 'กลุ่มโรคผิวหนังอักเสบ', dbValue: 'โรคผิวหนังและเนื้อเยื่อใต้ผิวหนัง', color: 'emerald' },
    { id: 'eye', label: 'กลุ่มโรคตาอักเสบ', dbValue: 'โรคตารวมส่วนประกอบของตา', color: 'blue' },
    { id: 'health_status', label: 'กลุ่มโรคอื่นๆ', dbValue: 'ปัจจัยที่มีผลต่อสถานะสุขภาพ และการรับบริการสุขภาพ', color: 'purple' },
];

const DISEASE_ICD_OPTIONS: Record<string, string[]> = {
    'respiratory': ['J44', 'J45', 'J442'],
    'circulatory': ['I21', 'I22', 'I24'],
    'skin': ['L30.9', 'L50'],
    'eye': ['H10'],
    'health_status': ['Z58', 'Z581', 'Y97']
};

export default function DDSDashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<DDSDashboardData | null>(null);
    const [options, setOptions] = useState<DDSOptions>({
        dates: [], regions: [], provinces: [], diseases: [], icd10_codes: [],
        icd10_by_disease: {}, diagnosisTypes: [], hierarchy: []
    });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<DDSFilters>({
        startDate: '', endDate: '', regions: [], provinces: [], districts: [], subdistricts: [], diseases: [], icd10_codes: [],
        diagnosisType: 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1',
        groupedIcd10: { 'respiratory': [], 'circulatory': [], 'skin': [], 'eye': [], 'health_status': [] }
    });

    const [groupedIcd10, setGroupedIcd10] = useState<Record<string, string[]>>({
        'respiratory': [], 'circulatory': [], 'skin': [], 'eye': [], 'health_status': []
    });

    // STEP 0: Auth & Initial Options
    useEffect(() => {
        getCurrentUser().then(setUser);

        getFilterOptions().then(opts => {
            if (!opts || !opts.dates || opts.dates.length === 0) return;
            const sortedDates = [...opts.dates].sort((a, b) => b.localeCompare(a));
            setOptions({ ...opts, dates: sortedDates });

            if (sortedDates.length) {
                const latestDateStr = sortedDates[0];
                const latestDate = new Date(latestDateStr);
                const year = latestDate.getFullYear();
                const month = latestDate.getMonth() + 1;
                const startYear = month >= 10 ? year : year - 1;
                const startDate = `${startYear}-10-01`;

                setFilters(prev => ({ ...prev, startDate: startDate, endDate: latestDateStr }));
            }
        }).catch(console.error);
    }, []);

    // Handle User Scope
    useEffect(() => {
        if (user?.scope?.isProvince && user.scope.province) {
            setFilters(prev => ({ ...prev, provinces: [user.scope.province] }));
        } else if (user?.scope?.isRegion && user.scope.region) {
            const regionNum = user.scope.region.replace(/[^0-9]/g, '');
            if (regionNum) setFilters(prev => ({ ...prev, regions: [`เขตสุขภาพที่ ${regionNum}`] }));
        }
    }, [user]);

    // Data Fetching
    useEffect(() => {
        if (!filters.startDate || !filters.endDate) return;
        setLoading(true);
        const apiFilters = {
            ...filters,
            regions: filters.regions.length ? filters.regions : undefined,
            provinces: filters.provinces.length ? filters.provinces : undefined,
            districts: filters.districts.length ? filters.districts : undefined,
            subdistricts: filters.subdistricts.length ? filters.subdistricts : undefined,
            diseases: filters.diseases.length ? filters.diseases : undefined
        };
        getDashboardData(apiFilters).then((res) => {
            setData(res);
            setLoading(false);
        }).catch(console.error);
    }, [filters]);

    // Filtering Helpers
    const baseProvinces = useMemo(() => {
        if (filters.regions.length === 0) return (options.provinces || []).sort((a, b) => a.localeCompare(b, 'th'));
        return (Array.from(new Set(options.hierarchy?.filter((h) => filters.regions.includes(h.region)).map((h) => h.province))) as string[]).sort((a, b) => a.localeCompare(b, 'th'));
    }, [filters.regions, options.provinces, options.hierarchy]);

    const baseDistricts = useMemo(() => {
        if (filters.provinces.length === 0) return [];
        return (Array.from(new Set(options.hierarchy?.filter((h) => filters.provinces.includes(h.province)).map((h) => h.district))) as string[]).sort((a, b) => a.localeCompare(b, 'th'));
    }, [filters.provinces, options.hierarchy]);

    const baseSubdistricts = useMemo(() => {
        if (filters.districts.length === 0) return [];
        return (Array.from(new Set(options.hierarchy?.filter((h) => filters.districts.includes(h.district)).map((h) => h.subdistrict))) as string[]).sort((a, b) => a.localeCompare(b, 'th'));
    }, [filters.districts, options.hierarchy]);

    const handleGroupedIcd10Change = useCallback((groupId: string, val: string[]) => {
        setGroupedIcd10(prev => {
            const next = { ...prev, [groupId]: val };
            const allSelected = Object.values(next).flat();
            setFilters(f => ({ ...f, icd10_codes: allSelected, groupedIcd10: next, diagnosisType: 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ' }));
            return next;
        });
    }, []);

    const isDetailedView = filters.districts.length > 0;
    const ddcLegend = {
        title: 'ระดับความเสี่ยง',
        unit: isDetailedView ? 'ความหนาแน่นผู้ป่วย' : 'จำนวนผู้ป่วย',
        items: [
            { range: isDetailedView ? 'น้อยมาก' : '0 - 10 ราย', color: '#10b981' },
            { range: isDetailedView ? 'น้อย' : '11 - 50 ราย', color: '#60a5fa' },
            { range: isDetailedView ? 'ปานกลาง' : '51 - 100 ราย', color: '#facc15' },
            { range: isDetailedView ? 'สูง' : '101 - 200 ราย', color: '#f97316' },
            { range: isDetailedView ? 'สูงมาก' : '201 ราย ขึ้นไป', color: '#ef4444' }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden font-sans"
            style={{ backgroundImage: "url('/img/background.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>

            <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-screen flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 relative z-[60]">
                    <div className="flex items-center gap-4">
                        <div className="shrink-0 bg-white p-1.5 rounded-2xl shadow-2xl border border-white/50 ring-4 ring-white/10">
                            <Image src="/img/logo_ddc.png" alt="DDC Logo" width={50} height={50} className="rounded-xl object-contain" style={{ width: 'auto', height: 'auto' }} priority />
                        </div>
                        <div className="shrink-0 bg-white p-1.5 rounded-2xl shadow-2xl border border-white/50 ring-4 ring-white/10">
                            <Image src="/img/logo_doe.jpg" alt="DOE Logo" width={50} height={50} style={{ width: 'auto', height: 'auto' }} className="rounded-xl object-contain" priority />
                        </div>
                        <div className="flex flex-col">
                            <h5 className="text-lg md:text-xl font-extrabold text-white leading-tight drop-shadow-md">การเฝ้าระวังสถานการณ์ฝุ่น PM2.5 และผู้ป่วยโรคที่เกี่ยวข้อง</h5>
                            <p className="text-xs md:text-xs font-bold text-blue-200 uppercase tracking-widest opacity-80">
                                {user?.role === 'admin_province' ? `จังหวัด: ${user.workplaceProvince}` : user?.role === 'admin_region' ? `เขต: ${user.ddcRegion}` : 'ผู้ดูแลระบบส่วนกลาง'}
                            </p>
                        </div>
                    </div>
                    <Link href="/" className="bg-white/10 hover:bg-white/20 transition-all p-3.5 rounded-2xl border border-white/10 group shadow-lg self-end md:self-auto">
                        <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </Link>
                </div>

                {/* Filters */}
                <div className="relative z-[50]">
                    <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 items-end shrink-0 ring-1 ring-white/10">
                        <CustomDatePicker label="จากเดือน" options={options.dates} value={filters.startDate} onChange={(v) => setFilters(f => ({ ...f, startDate: v }))} thaiMonths={THAI_MONTHS_SHORT} />
                        <CustomDatePicker label="ถึงเดือน" options={options.dates} value={filters.endDate} onChange={(v) => setFilters(f => ({ ...f, endDate: v }))} thaiMonths={THAI_MONTHS_SHORT} />
                        <MultiSelect label="เขตสุขภาพ" options={options.regions} selected={filters.regions} onChange={(val) => setFilters(f => ({ ...f, regions: val, provinces: [], districts: [], subdistricts: [] }))} />
                        <MultiSelect label="จังหวัด" options={baseProvinces} selected={filters.provinces} onChange={(val) => setFilters(f => ({ ...f, provinces: val, districts: [], subdistricts: [] }))} />
                        <MultiSelect label="อำเภอ/เขต" options={baseDistricts} selected={filters.districts} onChange={(val) => setFilters(f => ({ ...f, districts: val, subdistricts: [] }))} />
                        <MultiSelect label="ตำบล/แขวง" options={baseSubdistricts} selected={filters.subdistricts} onChange={(val) => setFilters(f => ({ ...f, subdistricts: val }))} />
                        <SingleSelect label="ประเภทวินิจฉัย" options={options.diagnosisTypes} selected={filters.diagnosisType} onChange={(val) => setFilters(f => ({ ...f, diagnosisType: val, icd10_codes: Object.values(groupedIcd10).flat() }))} />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-4 relative z-[30]">
                    {/* Top Row: General Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-linear-to-br from-blue-600/90 to-sky-500/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/30 min-h-32 flex flex-col justify-between group overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="text-sm font-black text-blue-100/80 uppercase tracking-widest mb-1">จำนวนผู้ป่วยทั้งหมด</div>
                            <div className="text-4xl font-black text-white tracking-tighter tabular-nums my-2 flex items-end gap-3 drop-shadow-lg">
                                {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-xl"></div> : data?.totalPatients?.toLocaleString()}
                                <div className="text-sm font-bold text-white/50 uppercase mb-1.5">ราย</div>
                            </div>
                            <div className="text-[10px] font-bold text-white/90 uppercase mt-auto bg-white/10 p-2.5 rounded-2xl border border-white/20 backdrop-blur-sm line-clamp-2">
                                นับตามรายบุคคล (Unique Patients)
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 min-h-32 flex flex-col justify-between group overflow-hidden relative ring-1 ring-white/5">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="text-sm font-black text-white/60 uppercase tracking-widest mb-1">จำนวนการวินิจฉัยทั้งหมด (ครั้ง)</div>
                            <div className="text-4xl font-black text-blue-400 tracking-tighter tabular-nums my-2 flex items-end gap-3">
                                {loading ? <div className="h-10 w-32 bg-white/10 animate-pulse rounded-xl"></div> : data?.totalVisits?.toLocaleString()}
                                <div className="text-sm font-bold text-white/30 uppercase mb-1.5">ครั้ง</div>
                            </div>
                            <div className="text-[10px] font-bold text-white/40 uppercase mt-auto bg-white/5 p-2.5 rounded-2xl border border-white/5 line-clamp-2">
                                รวมทุกรายการวินิจฉัยที่ตรงเงื่อนไข
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Disease Group Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 shrink-0">
                        {DISEASE_CARDS.map((card, i) => {
                            const stat = data?.top5DiseaseStats?.find((s) => s.id === card.id) || { value: 0 };
                            
                            // Determine options based on diagnosisType
                            let cardOptions: string[] = [];
                            if (filters.diagnosisType === 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ') {
                                // Show all available codes from DB for this disease type
                                cardOptions = options.icd10_by_disease?.[card.dbValue] || [];
                            } else {
                                // Show only allowed codes for this disease group
                                const baseCodes = DISEASE_ICD_OPTIONS[card.id] || [];
                                if (filters.diagnosisType === 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1') {
                                    // Filter out Y97 if it exists in health_status
                                    cardOptions = baseCodes.filter(c => c !== 'Y97');
                                } else {
                                    // For Z58.1+Y97, show all baseCodes (which includes Y97 in health_status)
                                    cardOptions = baseCodes;
                                }
                            }

                            return (
                                <div key={i} className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/20 min-h-32 flex flex-col justify-between relative hover:z-[60] group ring-1 ring-white/5 transition-all hover:bg-white/15">
                                    <div className="text-[11px] font-bold text-white/80 uppercase tracking-tight mb-2 leading-tight" title={card.label}>{card.label}</div>
                                    <div className="text-2xl font-extrabold text-white tracking-tight tabular-nums flex items-end gap-2 mb-3">
                                        {loading ? <div className="h-8 w-20 bg-white/10 animate-pulse rounded-lg"></div> : stat.value?.toLocaleString()}
                                        <div className="w-1.5 h-6 rounded-full mb-1 shadow-lg" style={{ backgroundColor: card.color === 'rose' ? '#f43f5e' : (card.color === 'orange' ? '#f97316' : (card.color === 'emerald' ? '#10b981' : (card.color === 'blue' ? '#3b82f6' : '#a855f7'))) }}></div>
                                    </div>
                                    <div className="mt-auto relative z-20 w-full">
                                        <MultiSelect 
                                            options={cardOptions} 
                                            selected={groupedIcd10[card.id] || []} 
                                            onChange={(val) => handleGroupedIcd10Change(card.id, val)} 
                                            placeholder={filters.diagnosisType === 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ' ? 'เลือกทั้งหมด' : 'แสดงทั้งหมด'} 
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.1fr] gap-4 flex-1 min-h-0 relative z-[20]">
                    {/* Monthly Trend Chart */}
                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative overflow-visible min-h-[400px] lg:min-h-0">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 uppercase"><div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg"></div>แนวโน้มจำนวนผู้ป่วยรายเดือน</h4>
                        </div>
                        <div className="flex-1 relative flex flex-col justify-end px-14 min-h-0">
                            <div className="absolute left-14 top-0 bottom-0 w-px bg-white/20 z-20"><div className="absolute top-[-25px] left-0 text-[10px] font-black text-white/40 uppercase">จำนวนผู้ป่วย (ราย)</div></div>
                            <div className="absolute right-14 top-0 bottom-0 w-px bg-white/20 z-20"><div className="absolute top-[-25px] right-0 text-[10px] font-black text-rose-500/60 uppercase text-right">เฉลี่ย PM2.5 (µg/m³)</div></div>
                            {!loading && data?.monthlyTrend && data.monthlyTrend.length > 0 && (() => {
                                const maxVal = Math.max(...data.monthlyTrend.map(x => x.total || 0), 1);
                                const pm25Max = Math.max(...data.monthlyTrend.map(x => x.avg_pm25 || 0), 50);
                                return (
                                    <>
                                        <div className="absolute left-7 top-0 bottom-0 flex flex-col justify-between items-end py-1 text-[9px] font-bold text-white/40 tabular-nums">
                                            {[...Array(5)].map((_, i) => <span key={i}>{Math.round(maxVal * (1 - i / 4)).toLocaleString()}</span>)}
                                        </div>
                                        <div className="absolute right-7 top-0 bottom-0 flex flex-col justify-between items-start py-1 text-[9px] font-bold text-rose-500/60 tabular-nums">
                                            {[...Array(5)].map((_, i) => <span key={i}>{Math.round(pm25Max * (1 - i / 4)).toLocaleString()}</span>)}
                                        </div>
                                        <div className="absolute inset-x-14 inset-y-0 flex flex-col justify-between opacity-20">{[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white/10"></div>)}</div>
                                        <div className="flex-1 relative">
                                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-30 pointer-events-none overflow-visible">
                                                <polyline points={data.monthlyTrend.map((m, i) => `${(i + 0.5) * (100 / data.monthlyTrend.length)},${100 - (pm25Max > 0 ? (m.avg_pm25 / pm25Max) * 100 : 0)}`).join(' ')} fill="none" stroke="#f43f5e" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex items-end justify-between gap-0.5 relative h-full w-full overflow-visible">
                                                {data.monthlyTrend.map((m, i) => {
                                                    const parts = m.month?.split('-');
                                                    const monthLabel = parts && parts.length >= 2 ? `${THAI_MONTHS_FULL[parseInt(parts[1]) - 1]} ${(parseInt(parts[0]) + 543).toString().slice(-2)}` : m.month;
                                                    const monthShortLabel = parts && parts.length >= 2 ? `${THAI_MONTHS_SHORT[parseInt(parts[1]) - 1]} ${(parseInt(parts[0]) + 543).toString().slice(-2)}` : m.month;
                                                    const yPm25 = pm25Max > 0 ? (m.avg_pm25 / pm25Max) * 100 : 0;
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center group h-full relative z-10 hover:z-[60]">
                                                            <div className="flex-1 w-full flex items-end justify-center relative">
                                                                <div className="absolute w-2 h-2 bg-rose-500 rounded-full z-40 shadow-sm transition-all group-hover:scale-150 group-hover:bg-white group-hover:ring-4 group-hover:ring-rose-500/30" style={{ bottom: `${yPm25}%`, left: '50%', transform: 'translate(-50%, 50%)' }}></div>
                                                                <div className={`absolute top-[-3.5rem] ${i < data.monthlyTrend.length / 2 ? 'left-0' : 'right-0'} bg-slate-900/98 backdrop-blur-3xl text-white p-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-[500] pointer-events-none shadow-2xl min-w-[300px] border border-white/20`}>
                                                                    <div className="font-black mb-2 border-b border-white/10 pb-2 flex justify-between items-center">
                                                                        <div className="flex flex-col"><span className="text-[10px] text-blue-400 uppercase">สถิติเดือน</span><span className="text-sm">{monthLabel}</span></div>
                                                                        <div className="text-right"><div className="text-[9px] text-rose-400 uppercase">PM2.5</div><span className="text-xl text-rose-500 font-black">{m.avg_pm25 || 0}</span></div>
                                                                    </div>
                                                                    {DDS_DISEASES.map(d => (m[d.id] as number) > 0 && (
                                                                        <div key={d.id} className="flex justify-between items-center bg-white/5 p-1.5 rounded-xl mb-1">
                                                                            <span className="text-[10px] text-white/90 truncate">{d.shortLabel || d.label}</span>
                                                                            <b className="text-[10px] text-white">{(m[d.id] as number || 0).toLocaleString()} ราย</b>
                                                                        </div>
                                                                    ))}
                                                                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center"><span className="text-[10px] text-white/40 uppercase">ผู้ป่วยรวม</span><span className="text-xl text-blue-400 font-black">{(m.total || 0).toLocaleString()}</span></div>
                                                                </div>
                                                                <div className="w-full flex flex-col justify-end h-full max-w-6 transition-all duration-500 group-hover:scale-x-110">
                                                                    {DDS_DISEASES.map(d => <div key={d.id} style={{ height: `${((Number(m[d.id] || 0)) / maxVal) * 100}%`, backgroundColor: d.hex }} className="w-full opacity-60 group-hover:opacity-100 shadow-sm first:rounded-t last:rounded-b"></div>)}
                                                                </div>
                                                            </div>
                                                            <span className="absolute bottom-[-28px] text-[9px] font-extrabold text-white/70 whitespace-nowrap">{monthShortLabel}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-10 shrink-0">
                            {DDS_DISEASES.map(d => <div key={d.id} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.hex }}></div><span className="text-[10px] font-extrabold text-white/70">{d.shortLabel || d.label}</span></div>)}
                            <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-rose-500 rounded-full"></div><span className="text-[10px] font-extrabold text-rose-400 uppercase">ค่าเฉลี่ย PM2.5</span></div>
                        </div>
                    </div>

                    {/* Thailand Map Section */}
                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 uppercase"><div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>สถิติผู้ป่วยราย{isDetailedView ? 'ตำบล' : 'จังหวัด'}</h4>
                            <div className="bg-blue-500/10 text-blue-400 px-5 py-2 rounded-full text-xs font-extrabold border border-blue-500/20 uppercase tracking-widest">{isDetailedView ? data?.stations?.length : Object.keys(data?.provinceAverages || {}).length} พื้นที่</div>
                        </div>
                        <div className="flex-1 w-full min-h-[500px] relative rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 bg-slate-800/50">
                            <ThailandMap
                                data={isDetailedView ? (data?.subdistrictAverages || {}) : (data?.provinceAverages || {})}
                                stations={data?.stations || []}
                                filters={filters}
                                getColor={ddcColorScale}
                                legendConfig={ddcLegend}
                                popupUnit="ราย"
                                renderPopup={(area, rawValue, popupUnit) => {
                                    const valObj = typeof rawValue === 'object' ? rawValue : { value: 0, rate: 0, pm25: 0 };
                                    return `
                                        <div class="font-sans p-6 min-w-60 bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl">
                                            <div class="text-sm font-black text-blue-400 uppercase mb-4 border-b border-white/10 pb-2">${area}</div>
                                            <div class="space-y-3">
                                                <div class="flex items-center justify-between bg-white/5 p-4 rounded-2xl"><span>จำนวนผู้ป่วย</span><span class="text-lg font-black">${Math.round(valObj.value).toLocaleString()} ${popupUnit}</span></div>
                                                <div class="flex items-center justify-between bg-blue-500/10 p-4 rounded-2xl"><span>อัตราป่วย</span><span class="text-lg font-black text-blue-400">${valObj.rate.toFixed(2)} ต่อแสน</span></div>
                                                ${area.includes('-') && valObj.pm25 ? `<div class="flex items-center justify-between bg-rose-500/10 p-4 rounded-2xl"><span>PM2.5</span><span class="text-lg font-black text-rose-400">${valObj.pm25.toFixed(1)} µg</span></div>` : ''}
                                            </div>
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
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}
