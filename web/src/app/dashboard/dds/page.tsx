'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDashboardData, getFilterOptions, getCurrentUser, DDSOptions, DDSFilters, DDSDashboardData, MonthlyTrendData } from './actions';
import { DDS_DISEASES } from '@/lib/constants';
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';
import DashboardBusyAlert from '@/components/dashboard/DashboardBusyAlert';
import DashboardLoading from '@/components/dashboard/DashboardLoading';
import DashboardDatePicker from '@/components/shared/DashboardDatePicker';
import { PM25Text } from '@/components/PM25Mark';
import CloudLoader from '@/components/CloudLoader';
import { Check, ChevronDown } from 'lucide-react';

const DASHBOARD_ERROR_MESSAGE = 'ระบบประมวลผลข้อมูลไม่สำเร็จ กรุณากดลองใหม่ หากยังพบปัญหาโปรดแจ้งผู้ดูแลระบบ';

// --- Shared Components ---

// โหลด ThailandMap แบบ Dynamic เพื่อเลี่ยงปัญหา SSR
const ThailandMap = dynamic(() => import('@/components/shared/ThailandMap'), {
    ssr: false,
    loading: () => <CloudLoader fullscreen={false} label="กำลังโหลดแผนที่สุขภาพ..." className="rounded-xl border border-white/30" />
});

// Custom SingleSelect
function SingleSelect({ label, options, selected, onChange }: { label?: string, options: string[], selected: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const safeOptions = options || [];
    return (
        <div className="relative col-span-1">
            {label && <label className="typo-caption block uppercase text-white/70 mb-2 ml-2">{label}</label>}
            <div onClick={() => setIsOpen(!isOpen)} className="typo-caption w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {selected || 'กรุณาเลือก'}
                </div>
                <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} strokeWidth={2.5} />
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
                                <span className={`typo-caption transition-colors ${selected === opt ? 'text-blue-400' : 'text-white/70'}`}>{opt}</span>
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
            {label && <label className="typo-caption block uppercase text-white/70 mb-2 ml-2">{label}</label>}
            <div onClick={() => setIsOpen(!isOpen)} className="typo-caption w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {safeSelected.length === 0 ? placeholder : (safeSelected.length === safeOptions.length ? 'ทั้งหมด' : safeSelected.map(getDisplayText).join(', '))}
                </div>
                <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} strokeWidth={2.5} />
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => { setIsOpen(false); setSearchText(''); }}></div>
                    <div className="absolute z-dropdown mt-3 w-full min-w-60 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5 ring-1 ring-white/20 scrollbar-hide">
                        <div className="relative">
                            <input
                                type="search"
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                placeholder={label === 'จังหวัด' ? 'ค้นหาจังหวัด' : searchPlaceholder}
                                aria-label={label === 'จังหวัด' ? 'ค้นหาจังหวัด' : searchPlaceholder}
                                className="typo-caption input input-sm w-full rounded-2xl border-white/10 bg-white/10 pr-9 text-white placeholder:text-white/35 focus:border-blue-400 focus:outline-none"
                            />
                            {searchText && <button type="button" aria-label="ล้างคำค้นหา" onClick={(event) => { event.stopPropagation(); setSearchText(''); }} className="typo-label btn btn-ghost btn-xs btn-circle absolute right-1.5 top-1/2 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white">×</button>}
                        </div>
                        <div onClick={() => { if (safeSelected.length === safeOptions.length) onChange([]); else onChange([...safeOptions]); setIsOpen(false); setSearchText(''); }} className="flex items-center gap-3 p-3.5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all border-b border-white/5 mb-1 group">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.length === safeOptions.length ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50' : 'border-white/20 group-hover:border-white/40'}`}>
                                {safeSelected.length === safeOptions.length && <Check aria-hidden="true" className="size-4 text-white" strokeWidth={4} />}
                            </div>
                            <span className="typo-caption text-white">เลือกทั้งหมด</span>
                        </div>
                        {filteredOptions.map((opt: string) => (
                            <div key={opt} onClick={() => { if (safeSelected.includes(opt)) onChange(safeSelected.filter((s: string) => s !== opt)); else onChange([...safeSelected, opt]); setIsOpen(false); setSearchText(''); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-all group">
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${safeSelected.includes(opt) ? 'bg-blue-500 border-blue-400 shadow-md shadow-blue-500/30' : 'border-white/10 group-hover:border-white/30'}`}>
                                    {safeSelected.includes(opt) && <Check aria-hidden="true" className="size-3.5 text-white" strokeWidth={4} />}
                                </div>
                                <span className={`typo-caption transition-colors ${safeSelected.includes(opt) ? 'text-blue-400' : 'text-white/70'}`}>{getDisplayText(opt)}</span>
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="typo-caption px-3 py-4 text-center text-white/40">
                                {label === 'จังหวัด' ? 'ไม่พบจังหวัดที่ค้นหา' : 'ไม่พบรายการที่ค้นหา'}
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
            <label className="typo-caption block uppercase text-white/70 mb-2 ml-2">{label}</label>
            <div onClick={() => setIsOpen(!isOpen)} className="typo-caption w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white py-3.5 px-5 outline-none cursor-pointer flex justify-between items-center min-h-12 hover:bg-white/20 transition-all shadow-sm ring-1 ring-white/10">
                <div className="truncate max-w-36">
                    {formatDate(value)}
                </div>
                <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : 'text-white/40'}`} strokeWidth={2.5} />
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-dropdown mt-3 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-h-96 overflow-y-auto p-5 flex flex-col gap-6 ring-1 ring-white/20 scrollbar-hide">
                        {years.map(year => (
                            <div key={year} className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 px-2">
                                    <span className="typo-label text-blue-400 tabular-nums">พ.ศ. {parseInt(year) + 543}</span>
                                    <div className="h-px flex-1 bg-white/10"></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {groupedDates[year].sort((a: string, b: string) => b.localeCompare(a)).map((opt: string) => {
                                        const parts = opt.split('-');
                                        const mName = thaiMonths[parseInt(parts[1]) - 1];
                                        const isActive = value === opt;
                                        return (
                                            <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }}
                                                className={`typo-caption flex items-center justify-center p-2.5 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}>
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

// Shared sequential palette: low counts are light, high counts are dark.
const DDS_MAP_COLORS = ['#fee2e2', '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d'];

const ddcColorScale = (val: number) => {
    if (val === 0) return 'rgba(255, 255, 255, 0.1)';
    if (val <= 10) return DDS_MAP_COLORS[0];
    if (val <= 50) return DDS_MAP_COLORS[1];
    if (val <= 100) return DDS_MAP_COLORS[2];
    if (val <= 200) return DDS_MAP_COLORS[3];
    return DDS_MAP_COLORS[4];
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
            if (!opts || !opts.dates || opts.dates.length === 0) {
                setBusyMessage('ไม่พบช่วงวันที่ที่มีข้อมูลสำหรับแสดงผล');
                setLoading(false);
                return;
            }
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
        setLoading(true);
        setBusyMessage(null);
        const timeout = window.setTimeout(async () => {
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

        return () => {
            window.clearTimeout(timeout);
            latestRequestId.current++;
        };
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

    const showSubdistricts = filters.districts.length > 0;
    const isAllProvinces = filters.provinces.length >= 70 && filters.districts.length === 0;
    const isAreaBreakdownView = (filters.provinces.length > 0 || filters.districts.length > 0) && !isAllProvinces;
    const isDetailedView = isAreaBreakdownView;
    const mapData = isAreaBreakdownView
        ? (showSubdistricts ? (data?.subdistrictAverages || {}) : (data?.districtAverages || {}))
        : (data?.provinceAverages || {});
    const mapAreaCount = isAreaBreakdownView
        ? Object.keys(mapData).length
        : Object.keys(data?.provinceAverages || {}).length;
    const mapFilters = filters;
    const ddcLegend = {
        title: 'จำนวนผู้ป่วย',
        unit: '',
        items: [
            { range: isDetailedView ? 'น้อยมาก' : '0 - 10 ราย', color: DDS_MAP_COLORS[0] },
            { range: isDetailedView ? 'น้อย' : '11 - 50 ราย', color: DDS_MAP_COLORS[1] },
            { range: isDetailedView ? 'ปานกลาง' : '51 - 100 ราย', color: DDS_MAP_COLORS[2] },
            { range: isDetailedView ? 'สูง' : '101 - 200 ราย', color: DDS_MAP_COLORS[3] },
            { range: isDetailedView ? 'สูงมาก' : '201 ราย ขึ้นไป', color: DDS_MAP_COLORS[4] }
        ]
    };

    return (
        <div className="typo-body min-h-screen bg-slate-900 relative selection:bg-blue-500/30 overflow-x-hidden"
            style={{ backgroundImage: "url('/img/background-optimized.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
            {loading && <DashboardLoading />}

            <main aria-busy={loading} inert={loading} className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-screen flex flex-col gap-4">
                <DashboardNavbar
                    logos={[
                        { src: '/img/ddc-logo-optimized.png', alt: 'DDC Logo' },
                        { src: '/img/logo_doe.jpg', alt: 'DOE Logo' },
                    ]}
                    title={<PM25Text>การเฝ้าระวังสถานการณ์ฝุ่น PM2.5 และผู้ป่วยโรคที่เกี่ยวข้องกับการรับสัมผัสฝุ่น PM2.5 ประเทศไทย</PM25Text>}
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
                            <div className="typo-label text-blue-100/80 uppercase mb-1">จำนวนผู้ป่วยการวินิจฉัยโรคทั้งหมด</div>
                            <div className="typo-metric text-white tabular-nums my-2 flex items-end gap-3 drop-shadow-lg">
                                {loading ? <div className="h-10 w-32 bg-white/20 animate-pulse rounded-xl"></div> : data?.totalPatients?.toLocaleString()}
                                <div className="typo-label text-white/50 uppercase mb-1.5">ราย</div>
                            </div>
                            <div className="typo-chart text-white/90 uppercase mt-auto bg-white/10 p-2.5 rounded-2xl border border-white/20 backdrop-blur-sm line-clamp-2">
                                นับตามรายบุคคลที่ตรงตามตัวกรองการวินิจฉัย (Unique Patients)
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 min-h-32 flex flex-col justify-between group overflow-hidden relative ring-1 ring-white/5">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="typo-label text-white/60 uppercase mb-1">จำนวนการวินิจฉัยทั้งหมด</div>
                            <div className="typo-metric text-blue-400 tabular-nums my-2 flex items-end gap-3">
                                {loading ? <div className="h-10 w-32 bg-white/10 animate-pulse rounded-xl"></div> : data?.totalVisits?.toLocaleString()}
                                <div className="typo-label text-white/30 uppercase mb-1.5">ครั้ง</div>
                            </div>
                            <div className="typo-chart text-white/40 uppercase mt-auto bg-white/5 p-2.5 rounded-2xl border border-white/5 line-clamp-2">
                                รวมทุกรายการที่ตรงตามตัวกรองการวินิจฉัย
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
                                    <div className="typo-chart text-white/80 uppercase mb-2" title={card.label}>{card.label}</div>
                                    <div className="typo-metric text-white tabular-nums flex items-end gap-2 mb-3">
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
                    <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative overflow-visible min-h-chart lg:min-h-0">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 shrink-0">
                            <h4 className="typo-section text-white flex items-center gap-4 uppercase"><div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg"></div><PM25Text>จำนวนผู้ป่วยโรคที่เกี่ยวข้องกับการรับสัมผัสฝุ่น PM2.5 และค่าเฉลี่ยฝุ่น PM2.5 รายเดือน</PM25Text></h4>
                            {options.dates[0] && (
                                <div className="typo-caption badge badge-warning badge-outline px-4 py-3">
                                    ข้อมูลล่าสุดในระบบ: {formatThaiMonthYear(options.dates[0])}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 relative flex flex-col justify-end px-14 min-h-0">
                            <div className="absolute left-14 top-0 bottom-0 w-px bg-white/20 z-20" />
                            <div className="absolute right-14 top-0 bottom-0 w-px bg-white/20 z-20" />
                            <div className="typo-chart absolute left-14 top-0 z-20 -translate-y-full pb-2 text-white/80 whitespace-nowrap">จำนวนผู้ป่วย (ราย)</div>
                            <div className="typo-chart absolute right-14 top-0 z-20 -translate-y-full pb-2 text-rose-400/70 text-right whitespace-nowrap"><PM25Text>ค่าเฉลี่ยฝุ่น PM2.5 (มคก./ลบ.ม.)</PM25Text></div>
                            {!loading && data?.monthlyTrend && data.monthlyTrend.length > 0 && (() => {
                                const maxVal = Math.max(...data.monthlyTrend.map(x => x.total || 0), 1);
                                const pm25Max = Math.max(...data.monthlyTrend.map(x => x.avg_pm25 || 0), 50);
                                return (
                                    <>
                                        <div className="typo-chart absolute left-7 top-0 bottom-0 flex flex-col justify-between items-end py-1 text-white/80 tabular-nums">
                                            {[...Array(5)].map((_, i) => <span key={i}>{Math.round(maxVal * (1 - i / 4)).toLocaleString()}</span>)}
                                        </div>
                                        <div className="typo-chart absolute right-7 top-0 bottom-0 flex flex-col justify-between items-start py-1 text-rose-500/60 tabular-nums">
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
                                                                    <div className="typo-label mb-2 border-b border-white/10 pb-2 flex justify-between items-center">
                                                                        <div className="flex flex-col"><span className="typo-chart text-blue-400 uppercase">สถิติเดือน</span><span className="typo-body-sm">{monthLabel}</span></div>
                                                                        <div className="text-right"><div className="typo-chart text-rose-400 uppercase"><PM25Text>PM2.5</PM25Text></div><span className="typo-subtitle text-rose-500">{m.avg_pm25 || 0}</span></div>
                                                                    </div>
                                                                    {DDS_DISEASES.map(d => (m[d.id] as number) > 0 && (
                                                                        <div key={d.id} className="flex justify-between items-center bg-white/5 p-1.5 rounded-xl mb-1">
                                                                            <span className="typo-chart text-white/90 truncate">{DISEASE_CARD_LABELS[d.id] || d.label}</span>
                                                                            <b className="typo-chart text-white">{(m[d.id] as number || 0).toLocaleString()} ราย</b>
                                                                        </div>
                                                                    ))}
                                                                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center"><span className="typo-chart text-white/80 uppercase">ผู้ป่วยรวม</span><span className="typo-subtitle text-blue-400">{(m.total || 0).toLocaleString()}</span></div>
                                                                </div>
                                                                <div className="w-full flex flex-col justify-end h-full max-w-6 transition-all duration-500 group-hover:scale-x-110">
                                                                    {DDS_DISEASES.map(d => <div key={d.id} style={{ height: `${((Number(m[d.id] || 0)) / maxVal) * 100}%`, backgroundColor: d.hex }} className="w-full opacity-60 group-hover:opacity-100 shadow-sm first:rounded-t last:rounded-b"></div>)}
                                                                </div>
                                                            </div>
                                                            <span className="typo-chart absolute bottom-chart-label text-white/70 whitespace-nowrap">{monthShortLabel}</span>
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
                            {DDS_DISEASES.map(d => <div key={d.id} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.hex }}></div><span className="typo-chart text-white/70">{DISEASE_CARD_LABELS[d.id] || d.label}</span></div>)}
                            <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-rose-500 rounded-full"></div><span className="typo-chart text-rose-400 uppercase"><PM25Text>ค่าเฉลี่ย PM2.5</PM25Text></span></div>
                        </div>
                    </div>

                    {/* Thailand Map Section */}
                    <div className="bg-slate-700 p-6 rounded-3xl border border-white/10 shadow-3xl flex flex-col h-full ring-1 ring-white/10 min-w-0 relative">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <h4 className="typo-section text-white flex items-center gap-4 uppercase"><div className="w-2.5 h-8 bg-linear-to-b from-blue-500 to-sky-400 rounded-full shadow-lg shadow-blue-500/40"></div>จำนวนผู้ป่วยรายภูมิภาค</h4>
                            <div className="typo-caption bg-blue-500/10 text-blue-400 px-5 py-2 rounded-full border border-blue-500/20 uppercase">{mapAreaCount} พื้นที่</div>
                        </div>
                        <div className="flex-1 w-full min-h-map relative rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 bg-slate-800/50">
                            <ThailandMap
                                data={mapData}
                                stations={data?.stations || []}
                                filters={mapFilters}
                                focusSelectedSubdistricts
                                visibleProvinces={!isAreaBreakdownView && filters.regions.length > 0 ? baseProvinces : undefined}
                                getColor={ddcColorScale}
                                legendConfig={ddcLegend}
                                popupUnit="ราย"
                                renderPopup={(area, rawValue, popupUnit) => {
                                    const valObj = typeof rawValue === 'object' ? rawValue : { value: 0, rate: 0, pm25: 0 };
                                    return `
                                        <div class="typo-body p-6 min-w-60 bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl">
                                            <div class="typo-label text-blue-400 uppercase mb-4 border-b border-white/10 pb-2">${area}</div>
                                            <div class="space-y-3">
                                                <div class="flex items-center justify-between bg-white/5 p-4 rounded-2xl"><span>จำนวนผู้ป่วย</span><span class="typo-section ">${Math.round(valObj.value).toLocaleString()} ${popupUnit}</span></div>
                                                ${!isAreaBreakdownView ? `<div class="flex items-center justify-between bg-blue-500/10 p-4 rounded-2xl"><span>อัตราป่วย</span><span class="typo-section text-blue-400">${valObj.rate.toFixed(2)} ต่อแสน</span></div>` : ''}
                                                ${area.includes('-') && valObj.pm25 ? `<div class="flex items-center justify-between bg-rose-500/10 p-4 rounded-2xl"><span>PM<span class="pm25-subscript">2.5</span></span><span class="typo-section text-rose-400">${valObj.pm25.toFixed(1)} มคก./ลบ.ม.</span></div>` : ''}
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
