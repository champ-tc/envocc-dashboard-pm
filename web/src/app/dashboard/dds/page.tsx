'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions, getCurrentUser, DDSOptions, DDSFilters, DDSDashboardData, MonthlyTrendData } from './actions';
import { DDS_DISEASES } from '@/lib/constants';
import DashboardNavbar from '../_components/DashboardNavbar';
import DashboardBusyAlert from '../_components/DashboardBusyAlert';
import DashboardDatePicker from '@/components/shared/DashboardDatePicker';

const DASHBOARD_ERROR_MESSAGE = 'ระบบประมวลผลข้อมูลไม่สำเร็จ กรุณากดลองใหม่ หากยังพบปัญหาโปรดแจ้งผู้ดูแลระบบ';

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

// Custom MultiSelect
function MultiSelect({ label, options, selected, onChange, placeholder = "ทั้งหมด", renderOption, searchPlaceholder = "ค้นหา" }: { label?: string, options: string[], selected: string[], onChange: (val: string[]) => void, placeholder?: string, renderOption?: (opt: string) => string, searchPlaceholder?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const safeOptions = options || [];
    const safeSelected = selected || [];
    const getDisplayText = (opt: string) => renderOption ? renderOption(opt) : opt;
    const normalizedSearch = searchText.trim().toLowerCase();
    const filteredOptions = normalizedSearch
        ? safeOptions.filter((opt: string) => {
            const displayText = getDisplayText(opt).toLowerCase();
            return opt.toLowerCase().includes(normalizedSearch) || displayText.includes(normalizedSearch);
        })
        : safeOptions;

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchText('');
            }
        };

        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative col-span-1 w-full">
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
                    <div className="fixed inset-0 z-overlay" onClick={() => { setIsOpen(false); setSearchText(''); }}></div>
                    <div className="absolute z-dropdown mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
                        <input
                            type="search"
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            placeholder={searchPlaceholder}
                            className="input input-sm w-full rounded-2xl border-white/10 bg-white/10 text-xs font-bold text-white placeholder:text-white/35 focus:border-blue-400 focus:outline-none"
                        />
                        <div onClick={() => { if (safeSelected.length === safeOptions.length) onChange([]); else onChange([...safeOptions]); setIsOpen(false); setSearchText(''); }} className="flex items-center gap-3 p-3.5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all border-b border-white/5 mb-1 group">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.length === safeOptions.length ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50' : 'border-white/20 group-hover:border-white/40'}`}>
                                {safeSelected.length === safeOptions.length && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-white">เลือกทั้งหมด</span>
                        </div>
                        {filteredOptions.map((opt: string) => (
                            <div key={opt} onClick={() => { if (safeSelected.includes(opt)) onChange(safeSelected.filter((s: string) => s !== opt)); else onChange([...safeSelected, opt]); setIsOpen(false); setSearchText(''); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-all group">
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.includes(opt) ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/30' : 'border-white/10 group-hover:border-white/30'}`}>
                                    {safeSelected.includes(opt) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={`text-xs transition-colors ${safeSelected.includes(opt) ? 'font-extrabold text-blue-400' : 'font-bold text-white/70'}`}>{getDisplayText(opt)}</span>
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs font-bold text-white/40">
                                ไม่พบรหัสที่ค้นหา
                            </div>
                        )}
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

const formatThaiMonthYear = (dateStr: string) => {
    const [year, month] = dateStr.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) return dateStr;
    return `${THAI_MONTHS_FULL[month - 1]} ${year + 543}`;
};

const DISEASE_CARDS = [
    { id: 'respiratory', label: 'กลุ่มโรคทางเดินหายใจ', dbValue: 'โรคระบบทางเดินหายใจ', color: 'rose' },
    { id: 'circulatory', label: 'กลุ่มโรคหัวใจและหลอดเลือด', dbValue: 'โรคระบบไหลเวียนเลือด', color: 'orange' },
    { id: 'skin', label: 'กลุ่มโรคผิวหนังอักเสบ', dbValue: 'โรคผิวหนังและเนื้อเยื่อใต้ผิวหนัง', color: 'emerald' },
    { id: 'eye', label: 'กลุ่มโรคตาอักเสบ', dbValue: 'โรคตารวมส่วนประกอบของตา', color: 'blue' },
    { id: 'health_status', label: 'กลุ่มโรคอื่นๆ', dbValue: 'ปัจจัยที่มีผลต่อสถานะสุขภาพ และการรับบริการสุขภาพ', color: 'purple' },
];

const DISEASE_CARD_LABELS = Object.fromEntries(
    DISEASE_CARDS.map(card => [card.id, card.label]),
) as Record<string, string>;

const DISEASE_ICD_OPTIONS: Record<string, string[]> = {
    'respiratory': ['J44', 'J45', 'J442'],
    'circulatory': ['I21', 'I22', 'I24'],
    'skin': ['L30.9', 'L50'],
    'eye': ['H10'],
    'health_status': ['Z581', 'Y97']
};

const ENVOCC_WITH_Z581_TYPE = 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1';
const CUSTOM_Z581_TYPE = 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ';

const getDiagnosisCodes = (groupId: string, diagnosisType: string) => {
    const baseCodes = DISEASE_ICD_OPTIONS[groupId] || [];
    if (diagnosisType === ENVOCC_WITH_Z581_TYPE) {
        return groupId === 'health_status'
            ? baseCodes.filter(c => c === 'Z581')
            : baseCodes.filter(c => c !== 'Y97');
    }
    return baseCodes;
};

export default function DDSDashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<DDSDashboardData | null>(null);
    const [options, setOptions] = useState<DDSOptions>({
        dates: [], regions: [], provinces: [], diseases: [], icd10_codes: [],
        icd10_by_disease: {}, diagnosisTypes: [], hierarchy: []
    });
    const [loading, setLoading] = useState(true);
    const [busyMessage, setBusyMessage] = useState<string | null>(null);
    const latestRequestId = useRef(0);

    const initialGroupedIcd10 = DISEASE_CARDS.reduce((acc, card) => {
        acc[card.id] = getDiagnosisCodes(card.id, ENVOCC_WITH_Z581_TYPE);
        return acc;
    }, {} as Record<string, string[]>);

    const [filters, setFilters] = useState<DDSFilters>({
        startDate: '', endDate: '', regions: [], provinces: [], districts: [], subdistricts: [], diseases: [], icd10_codes: Object.values(initialGroupedIcd10).flat(),
        diagnosisType: 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1',
        groupedIcd10: initialGroupedIcd10
    });

    const [groupedIcd10, setGroupedIcd10] = useState<Record<string, string[]>>(initialGroupedIcd10);

    // STEP 0: Auth & Initial Options
    useEffect(() => {
        getCurrentUser().then(setUser).catch((error) => {
            console.error('Unable to load dashboard user:', error);
            setUser(null);
        });

        getFilterOptions().then(opts => {
            setBusyMessage(null);
            if (!opts || !opts.dates || opts.dates.length === 0) return;
            const sortedDates = [...opts.dates].sort((a, b) => b.localeCompare(a));
            setOptions({ ...opts, dates: sortedDates });

            if (sortedDates.length) {
                const latestDateStr = sortedDates[0];
                const [year, month] = latestDateStr.split('-').map(Number);
                const startYear = month >= 10 ? year : year - 1;
                const startDate = `${startYear}-10`;

                setFilters(prev => ({ ...prev, startDate: startDate, endDate: latestDateStr }));
            }
        }).catch(() => {
            setBusyMessage(DASHBOARD_ERROR_MESSAGE);
            setLoading(false);
        });
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
        const requestId = ++latestRequestId.current;
        const timeout = window.setTimeout(async () => {
            setLoading(true);
            const apiFilters = {
                ...filters,
                regions: filters.regions.length ? filters.regions : undefined,
                provinces: filters.provinces.length ? filters.provinces : undefined,
                districts: filters.districts.length ? filters.districts : undefined,
                subdistricts: filters.subdistricts.length ? filters.subdistricts : undefined,
                diseases: filters.diseases.length ? filters.diseases : undefined
            };
            try {
                const res = await getDashboardData(apiFilters);
                if (requestId === latestRequestId.current) {
                    setData(res);
                    setBusyMessage(null);
                }
            } catch (error) {
                if (requestId === latestRequestId.current) {
                    console.error(error);
                    setBusyMessage(DASHBOARD_ERROR_MESSAGE);
                }
            } finally {
                if (requestId === latestRequestId.current) setLoading(false);
            }
        }, 350);

        return () => window.clearTimeout(timeout);
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

    const hasSubdistrictData = Object.keys(data?.subdistrictAverages || {}).length > 0;
    const isAreaBreakdownView = filters.provinces.length > 0 || filters.districts.length > 0;
    const isDetailedView = isAreaBreakdownView;
    const mapData = isAreaBreakdownView
        ? (hasSubdistrictData ? (data?.subdistrictAverages || {}) : (data?.districtAverages || {}))
        : (data?.provinceAverages || {});
    const mapAreaCount = isAreaBreakdownView
        ? Object.keys(mapData).length
        : Object.keys(data?.provinceAverages || {}).length;
    const mapFilters = isAreaBreakdownView && !hasSubdistrictData
        ? { ...filters, districts: filters.districts.length > 0 ? filters.districts : baseDistricts }
        : filters;
    const ddcLegend = {
        title: 'จำนวนผู้ป่วย',
        unit: '',
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
                <DashboardNavbar
                    logos={[
                        { src: '/img/ddc-logo.png', alt: 'DDC Logo' },
                        { src: '/img/logo_doe.jpg', alt: 'DOE Logo' },
                    ]}
                    title="การเฝ้าระวังสถานการณ์ฝุ่น PM2.5 และผู้ป่วยโรคที่เกี่ยวข้องกับการรับสัมผัสฝุ่น PM2.5 ประเทศไทย"
                    subtitle={
                        user?.role === 'admin_province' ? `จังหวัด: ${user.workplaceProvince}` :
                        user?.role === 'admin_region' ? `เขต: ${user.ddcRegion}` :
                        'ระบบเฝ้าระวังทางระบาดวิทยา Digital Disease Surveillance (DDS)'
                    }
                    className="relative z-header"
                    titleClassName="drop-shadow-md"
                />
                <DashboardBusyAlert message={busyMessage} />

                {/* Filters */}
                <div className="relative z-toolbar">
                    <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 items-end shrink-0 ring-1 ring-white/10">
                        <DashboardDatePicker label="จากเดือน" options={options.dates} value={filters.startDate} onChange={(v) => setFilters(f => ({ ...f, startDate: v }))} />
                        <DashboardDatePicker label="ถึงเดือน" options={options.dates} value={filters.endDate} onChange={(v) => setFilters(f => ({ ...f, endDate: v }))} />
                        <MultiSelect label="เขตสุขภาพ" options={options.regions} selected={filters.regions} onChange={(val) => setFilters(f => ({ ...f, regions: val, provinces: [], districts: [], subdistricts: [] }))} />
                        <MultiSelect label="จังหวัด" options={baseProvinces} selected={filters.provinces} onChange={(val) => setFilters(f => ({ ...f, provinces: val, districts: [], subdistricts: [] }))} />
                        <MultiSelect label="อำเภอ/เขต" options={baseDistricts} selected={filters.districts} onChange={(val) => setFilters(f => ({ ...f, districts: val, subdistricts: [] }))} />
                        <MultiSelect label="ตำบล/แขวง" options={baseSubdistricts} selected={filters.subdistricts} onChange={(val) => setFilters(f => ({ ...f, subdistricts: val }))} />
                        <SingleSelect label="ประเภทวินิจฉัย" options={options.diagnosisTypes} selected={filters.diagnosisType} onChange={(val) => {
                            const nextGrouped = DISEASE_CARDS.reduce((acc, card) => {
                                acc[card.id] = val === CUSTOM_Z581_TYPE
                                    ? [...(options.icd10_by_disease?.[card.dbValue] || [])]
                                    : getDiagnosisCodes(card.id, val);
                                return acc;
                            }, {} as Record<string, string[]>);
                            setGroupedIcd10(nextGrouped);
                            setFilters(f => ({ ...f, diagnosisType: val, icd10_codes: Object.values(nextGrouped).flat(), groupedIcd10: nextGrouped }));
                        }} />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-4 relative z-section-raised">
                    {/* Top Row: General Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-linear-to-br from-blue-600/90 to-sky-500/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/30 min-h-32 flex flex-col justify-between group overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="text-sm font-black text-blue-100/80 uppercase tracking-widest mb-1">จำนวนผู้ป่วยทั้งหมด</div>
                            <div className="text-4xl font-black text-white tracking-tighter tabular-nums my-2 flex items-end gap-3 drop-shadow-lg">
                                {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-xl"></div> : data?.totalPatients?.toLocaleString()}
                                <div className="text-sm font-bold text-white/50 uppercase mb-1.5">ราย</div>
                            </div>
                            <div className="text-compact font-bold text-white/90 uppercase mt-auto bg-white/10 p-2.5 rounded-2xl border border-white/20 backdrop-blur-sm line-clamp-2">
                                นับตามรายบุคคล (Unique Patients)
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 min-h-32 flex flex-col justify-between group overflow-hidden relative ring-1 ring-white/5">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="text-sm font-black text-white/60 uppercase tracking-widest mb-1">จำนวนการวินิจฉัยทั้งหมด</div>
                            <div className="text-4xl font-black text-blue-400 tracking-tighter tabular-nums my-2 flex items-end gap-3">
                                {loading ? <div className="h-10 w-32 bg-white/10 animate-pulse rounded-xl"></div> : data?.totalVisits?.toLocaleString()}
                                <div className="text-sm font-bold text-white/30 uppercase mb-1.5">ครั้ง</div>
                            </div>
                            <div className="text-compact font-bold text-white/40 uppercase mt-auto bg-white/5 p-2.5 rounded-2xl border border-white/5 line-clamp-2">
                                รวมทุกรายการวินิจฉัยที่ตรงตามตัวกรองประเภทการวินิจฉัย
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Disease Group Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 shrink-0">
                        {DISEASE_CARDS.map((card, i) => {
                            const stat = data?.top5DiseaseStats?.find((s) => s.id === card.id) || { value: 0 };

                            // Determine options based on diagnosisType
                            let cardOptions: string[] = [];
                            if (filters.diagnosisType === CUSTOM_Z581_TYPE) {
                                // Show all available codes from DB for this disease type
                                cardOptions = options.icd10_by_disease?.[card.dbValue] || [];
                            } else {
                                // Show only allowed codes for this disease group
                                cardOptions = getDiagnosisCodes(card.id, filters.diagnosisType);
                            }

                            return (
                                <div key={i} className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/20 min-h-32 flex flex-col justify-between relative hover:z-header group ring-1 ring-white/5 transition-all hover:bg-white/15">
                                    <div className="text-compact-plus font-bold text-white/80 uppercase tracking-tight mb-2 leading-tight" title={card.label}>{card.label}</div>
                                    <div className="text-2xl font-extrabold text-white tracking-tight tabular-nums flex items-end gap-2 mb-3">
                                        {loading ? <div className="h-8 w-20 bg-white/10 animate-pulse rounded-lg"></div> : stat.value?.toLocaleString()}
                                        <div className="w-1.5 h-6 rounded-full mb-1 shadow-lg" style={{ backgroundColor: card.color === 'rose' ? '#f43f5e' : (card.color === 'orange' ? '#f97316' : (card.color === 'emerald' ? '#10b981' : (card.color === 'blue' ? '#3b82f6' : '#a855f7'))) }}></div>
                                    </div>
                                    <div className="mt-auto relative z-20 w-full">
                                        <MultiSelect
                                            options={cardOptions}
                                            selected={groupedIcd10[card.id] || []}
                                            onChange={(val) => handleGroupedIcd10Change(card.id, val)}
                                            placeholder={filters.diagnosisType === CUSTOM_Z581_TYPE ? 'เลือกทั้งหมด' : 'แสดงทั้งหมด'}
                                            searchPlaceholder="ค้นหารหัสโรค"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-dashboard gap-4 flex-1 min-h-0 relative z-section">
                    {/* Monthly Trend Chart */}
                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative overflow-visible min-h-chart lg:min-h-0">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 uppercase"><div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg"></div>จำนวนผู้ป่วยโรคที่เกี่ยวข้องกับการรับสัมผัสฝุ่น PM2.5 และค่าเฉลี่ยฝุ่น PM2.5 รายเดือน</h4>
                            {options.dates[0] && (
                                <div className="badge badge-warning badge-outline px-4 py-3 text-xs font-bold">
                                    ข้อมูลล่าสุดในระบบ: {formatThaiMonthYear(options.dates[0])}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 relative flex flex-col justify-end px-14 min-h-0">
                            <div className="absolute left-14 top-0 bottom-0 w-px bg-white/20 z-20" />
                            <div className="absolute right-14 top-0 bottom-0 w-px bg-white/20 z-20" />
                            <div className="absolute left-14 top-0 z-20 -translate-y-full pb-2 text-compact font-black text-white/50 whitespace-nowrap">จำนวนผู้ป่วย (ราย)</div>
                            <div className="absolute right-14 top-0 z-20 -translate-y-full pb-2 text-compact font-black text-rose-400/70 text-right whitespace-nowrap">ค่าเฉลี่ยฝุ่น PM2.5 (มคก./ลบ.ม.)</div>
                            {!loading && data?.monthlyTrend && data.monthlyTrend.length > 0 && (() => {
                                const maxVal = Math.max(...data.monthlyTrend.map(x => x.total || 0), 1);
                                const pm25Max = Math.max(...data.monthlyTrend.map(x => x.avg_pm25 || 0), 50);
                                return (
                                    <>
                                        <div className="absolute left-7 top-0 bottom-0 flex flex-col justify-between items-end py-1 text-2xs-plus font-bold text-white/40 tabular-nums">
                                            {[...Array(5)].map((_, i) => <span key={i}>{Math.round(maxVal * (1 - i / 4)).toLocaleString()}</span>)}
                                        </div>
                                        <div className="absolute right-7 top-0 bottom-0 flex flex-col justify-between items-start py-1 text-2xs-plus font-bold text-rose-500/60 tabular-nums">
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
                                                        <div key={i} className="flex-1 flex flex-col items-center group h-full relative z-10 hover:z-header">
                                                            <div className="flex-1 w-full flex items-end justify-center relative">
                                                                <div className="absolute w-2 h-2 bg-rose-500 rounded-full z-40 shadow-sm transition-all group-hover:scale-150 group-hover:bg-white group-hover:ring-4 group-hover:ring-rose-500/30" style={{ bottom: `${yPm25}%`, left: '50%', transform: 'translate(-50%, 50%)' }}></div>
                                                                <div className={`absolute top-chart-tooltip ${i < data.monthlyTrend.length / 2 ? 'left-0' : 'right-0'} bg-slate-900/98 backdrop-blur-3xl text-white p-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-map-overlay pointer-events-none shadow-2xl min-w-tooltip-sm border border-white/20`}>
                                                                    <div className="font-black mb-2 border-b border-white/10 pb-2 flex justify-between items-center">
                                                                        <div className="flex flex-col"><span className="text-compact text-blue-400 uppercase">สถิติเดือน</span><span className="text-sm">{monthLabel}</span></div>
                                                                        <div className="text-right"><div className="text-2xs-plus text-rose-400 uppercase">PM2.5</div><span className="text-xl text-rose-500 font-black">{m.avg_pm25 || 0}</span></div>
                                                                    </div>
                                                                    {DDS_DISEASES.map(d => (m[d.id] as number) > 0 && (
                                                                        <div key={d.id} className="flex justify-between items-center bg-white/5 p-1.5 rounded-xl mb-1">
                                                                            <span className="text-compact text-white/90 truncate">{DISEASE_CARD_LABELS[d.id] || d.label}</span>
                                                                            <b className="text-compact text-white">{(m[d.id] as number || 0).toLocaleString()} ราย</b>
                                                                        </div>
                                                                    ))}
                                                                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center"><span className="text-compact text-white/40 uppercase">ผู้ป่วยรวม</span><span className="text-xl text-blue-400 font-black">{(m.total || 0).toLocaleString()}</span></div>
                                                                </div>
                                                                <div className="w-full flex flex-col justify-end h-full max-w-6 transition-all duration-500 group-hover:scale-x-110">
                                                                    {DDS_DISEASES.map(d => <div key={d.id} style={{ height: `${((Number(m[d.id] || 0)) / maxVal) * 100}%`, backgroundColor: d.hex }} className="w-full opacity-60 group-hover:opacity-100 shadow-sm first:rounded-t last:rounded-b"></div>)}
                                                                </div>
                                                            </div>
                                                            <span className="absolute bottom-chart-label text-2xs-plus font-extrabold text-white/70 whitespace-nowrap">{monthShortLabel}</span>
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
                            {DDS_DISEASES.map(d => <div key={d.id} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.hex }}></div><span className="text-compact font-extrabold text-white/70">{DISEASE_CARD_LABELS[d.id] || d.label}</span></div>)}
                            <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-rose-500 rounded-full"></div><span className="text-compact font-extrabold text-rose-400 uppercase">ค่าเฉลี่ย PM2.5</span></div>
                        </div>
                    </div>

                    {/* Thailand Map Section */}
                    <div className="bg-slate-900/60 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="font-extrabold text-lg text-white flex items-center gap-4 uppercase"><div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>จำนวนผู้ป่วยรายภูมิภาค</h4>
                            <div className="bg-blue-500/10 text-blue-400 px-5 py-2 rounded-full text-xs font-extrabold border border-blue-500/20 uppercase tracking-widest">{mapAreaCount} พื้นที่</div>
                        </div>
                        <div className="flex-1 w-full min-h-map relative rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 bg-slate-800/50">
                            <ThailandMap
                                data={mapData}
                                stations={data?.stations || []}
                                filters={mapFilters}
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
                                                ${area.includes('-') && valObj.pm25 ? `<div class="flex items-center justify-between bg-rose-500/10 p-4 rounded-2xl"><span>PM2.5</span><span class="text-lg font-black text-rose-400">${valObj.pm25.toFixed(1)} มคก./ลบ.ม.</span></div>` : ''}
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
