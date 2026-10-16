import Link from 'next/link';
import { BadgeAlert, Eye, HeartPulse, Stethoscope, Wind } from 'lucide-react';
import PM25Mark, { PM25Text } from '@/components/PM25Mark';
import GuestNavbar from '@/components/GuestNavbar';

type Definition = {
    id: number;
    title: string;
    desc: string;
    items?: string[];
    link?: string;
    isAlert?: boolean;
};

const DEFINITIONS: Definition[] = [
    {
        id: 1,
        title: "โรคที่ประกาศตามพ.ร.บ. EnvOcc",
        desc: "หมายถึง โรคหรืออาการที่เกิดจากการรับสัมผัสฝุ่นละอองขนาดไม่เกิน 2.5 ไมครอนที่ประกาศในประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม พ.ศ. 2568",
        items: [
            "โรคปอดอุดกั้นเรื้อรังที่มีการกำเริบเฉียบพลัน (COPD Exacerbation)",
            "โรคหืดเฉียบพลัน (Acute asthma)",
            "โรคหัวใจขาดเลือดเฉียบพลัน (Acute ischemic heart diseases)",
            "กลุ่มโรคตาอักเสบ (Conjunctivitis / Keratoconjunctivitis)",
            "กลุ่มโรคผิวหนังอักเสบ (Eczema / Urticaria)"
        ],
        link: "https://ddc.moph.go.th/doed/pagecontent.php?page=1474&dept=doed"
    },
    {
        id: 2,
        title: "จังหวัดที่มีค่าฝุ่น PM2.5 เกินค่ามาตรฐาน (> 37.5 มคก./ลบ.ม.)",
        desc: "หมายถึง จังหวัดที่มีจำนวนวันที่มีค่าฝุ่น PM2.5 เกินค่ามาตรฐาน ติดต่อกันต่อเนื่องตั้งแต่ 1 วันขึ้นไป ตามช่วงเวลาที่เลือก"
    },
    {
        id: 3,
        title: "จังหวัดที่มีค่าฝุ่น PM2.5 ระดับสีแดง (> 75 มคก./ลบ.ม.)",
        desc: "หมายถึง จังหวัดที่มีจำนวนวันที่มีค่าฝุ่น PM2.5 สูงสุดแต่ละจังหวัด มากกว่า 75 มคก./ลบ.ม. ติดต่อกันต่อเนื่องตั้งแต่ 2 วันขึ้นไป",
        isAlert: true
    },
    {
        id: 4,
        title: "ข้อมูลจาก Health Data Center (HDC)",
        desc: "ข้อมูลการเฝ้าระวังโรคจากสถานพยาบาลทั่วประเทศ สำนักงานปลัดกระทรวงสาธารณสุข",
        link: "https://hdc.moph.go.th/center/public/standard-subcatalog/9c647c1f31ac73f4396c2cf987e7448a"
    },
    {
        id: 5,
        title: "ข้อมูลจาก Digital Disease Surveillance (DDS)",
        desc: "ข้อมูลการเฝ้าระวังโรคดิจิทัล กองระบาดวิทยา กรมควบคุมโรค",
        link: "https://dds-eservice.moph.go.th/login"
    },
    {
        id: 6,
        title: "ข้อมูลฝุ่นละออง PM2.5 (Air4Thai)",
        desc: "ข้อมูลการตรวจวัดรายชั่วโมงจากสถานีตรวจวัด 105 สถานี 77 จังหวัด กรมควบคุมมลพิษ",
        link: "http://air4thai.pcd.go.th/webV3/#/History"
    }
];

// --- Components ---
function ExternalLinkIcon() {
    return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
}

function DiseaseIcon({ index }: { index: number }) {
    const styles = ['bg-blue-100 text-blue-600', 'bg-teal-100 text-teal-600', 'bg-rose-100 text-rose-600', 'bg-violet-100 text-violet-600', 'bg-amber-100 text-amber-600'];
    const Icon = [Stethoscope, Wind, HeartPulse, Eye, BadgeAlert][index % 5];
    return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles[index % styles.length]}`} aria-hidden="true"><Icon className="h-5 w-5" strokeWidth={1.8} /></span>;
}

function ThresholdGraphic({ red = false }: { red?: boolean }) {
    const color = red ? 'text-red-500' : 'text-orange-500';
    const ring = red ? 'border-red-100' : 'border-orange-100';
    const stroke = red ? '#ef4444' : '#f97316';
    return <div className={`relative flex min-h-56 items-center justify-center overflow-hidden rounded-3xl border ${red ? 'border-red-100/50 bg-red-50/50' : 'border-orange-100/50 bg-orange-50/50'} p-6`}>
        <div className={`absolute ${red ? 'bottom-0 right-0 bg-red-200' : 'left-0 top-0 bg-orange-200'} h-40 w-40 rounded-full opacity-30 blur-3xl`} />
        <div className={`relative flex h-40 w-40 items-center justify-center rounded-full border-8 bg-white shadow-sm ${ring}`}>
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeWidth="8" strokeDasharray="289" strokeDashoffset="100" /></svg>
            <div className="text-center"><div className={`typo-metric ${color}`}>&gt;{red ? '75' : '37.5'}</div><div className={`typo-caption ${red ? 'text-red-400' : 'text-orange-400'}`}>มคก./ลบ.ม.</div></div>
        </div>
    </div>;
}

function SourceGraphic({ kind }: { kind: 'hdc' | 'dds' | 'air' }) {
    if (kind === 'hdc') return <div className="flex h-48 items-center justify-center bg-indigo-50/60"><div className="flex flex-col items-center"><div className="space-y-0.5"><div className="h-7 w-24 rounded-t-lg bg-indigo-500" /><div className="h-7 w-24 bg-indigo-500" /><div className="h-7 w-24 rounded-b-lg bg-indigo-500" /></div><span className="typo-caption mt-3 text-indigo-700">HDC SERVER</span></div></div>;
    if (kind === 'dds') return <div className="flex h-48 items-center justify-center bg-emerald-50/60"><div className="flex h-28 w-40 items-end gap-2 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">{[1, 2, 4, 3, 2].map((height, index) => <span key={index} className="flex-1 rounded-t bg-emerald-400" style={{ height: `${height * 20}%` }} />)}</div></div>;
    return <div className="flex h-48 items-center justify-center bg-cyan-50/60"><svg className="h-16 w-16 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 014-4h1a5 5 0 019.58-1.5A3.5 3.5 0 0118 16H7a4 4 0 01-4-1zM8 20h.01M12 20h.01M16 20h.01" /></svg></div>;
}

function DefinitionBlock({ def }: { def: Definition }) {
    return (
        <div className="card card-border bg-white shadow-sm transition-all duration-300 hover:shadow-lg group">
            <div className="card-body p-5 md:p-6">
                <h4 className="typo-section card-title items-start gap-3 mb-1 text-slate-800">
                    <span className="typo-label badge badge-sm h-8 w-8 shrink-0 rounded-full border-none bg-linear-to-br from-blue-600 to-sky-500 p-0 text-white shadow-sm">
                        {def.id}
                    </span>
                    <PM25Text>{def.title}</PM25Text>
                </h4>
                <div className="pl-10">
                    <p className="typo-body-sm mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-slate-600"><PM25Text>{def.desc}</PM25Text></p>
                    {def.items && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {def.items.map((item, index) => (
                                <div key={item} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm">
                                    <DiseaseIcon index={index} />
                                    <span className="typo-body-sm text-slate-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {def.link && (
                        <div className="card-actions mt-4">
                            <a
                                href={def.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="typo-label btn btn-sm btn-outline rounded-full shadow-xs border-blue-500 text-blue-600 hover:bg-linear-to-br hover:from-blue-600 hover:to-sky-500 hover:text-white hover:border-none">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                ดูข้อมูลเพิ่มเติม
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Main Page ---
export default function HomePage() {
    return (
        <div className="typo-body min-h-screen flex flex-col items-center text-slate-900 relative overflow-hidden selection:bg-blue-100"
            style={{ backgroundImage: "url('/img/background-optimized.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>

            <div className="absolute inset-0 bg-white/20 z-0" />
            <GuestNavbar />

            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 z-0">
                <div className="typo-body w-data-table h-dashboard-map bg-linear-to-tr from-blue-200/20 to-white/5 rounded-full blur-hero-orb opacity-40" />
            </div>

            <div className="z-10 text-center space-y-8 md:space-y-12 px-4 max-w-5xl mx-auto mt-24 md:mt-32">
                {/* Hero Section */}
                <header className="space-y-4">
                    <h1 className="text-6xl text-white drop-shadow-lg uppercase">
                        <PM25Mark /> Patient Database <br className="hidden sm:block" />
                        <span className="typo-title block mt-2 opacity-90 capitalize">
                            ระบบฐานข้อมูลผู้ป่วยจากฝุ่นละอองขนาดไม่เกิน 2.5 ไมครอน (<PM25Mark />)
                        </span>
                    </h1>

                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/login" className="typo-body btn btn-lg rounded-full px-12 shadow-xl shadow-blue-500/20 hover:scale-105 transition-all w-full sm:w-auto bg-linear-to-br from-blue-600 to-sky-500 border-none text-white hover:shadow-blue-500/40">
                            เข้าสู่ระบบ (Login)
                        </Link>
                        <Link href="/register" className="typo-body btn btn-lg btn-outline bg-white/90 rounded-full px-12 shadow-md hover:-translate-y-0.5 transition-all w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                            สมัครสมาชิกใหม่
                        </Link>
                    </div>
                </header>

                {/* PM2.5 Information Section */}
                <section className="text-left card bg-white/90 backdrop-blur-xl rounded-auth-card border border-slate-100 shadow-2xl overflow-hidden">
                    <div className="card-body p-6 md:p-12">
                        <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-100">
                            <div className="bg-linear-to-br from-blue-600 to-sky-500 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-500/20">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="typo-section card-title text-slate-800">คำนิยามที่ควรรู้</h3>
                        </div>

                        <div className="space-y-10">
                            <DefinitionBlock def={DEFINITIONS[0]} />

                            <div className="grid grid-cols-1 items-center gap-10 border-t border-slate-100 pt-10 lg:grid-cols-2 lg:gap-16">
                                <div>
                                    <div className="flex items-center gap-4 mb-4"><span className="typo-label badge badge-sm h-8 w-8 rounded-full border-none bg-blue-100 p-0 text-blue-600">2</span><h4 className="typo-subtitle text-slate-800"><PM25Text>{DEFINITIONS[1].title}</PM25Text></h4></div>
                                    <span className="typo-label badge badge-warning mb-4">&gt; 37.5 มคก./ลบ.ม.</span>
                                    <p className="typo-body-sm text-slate-600"><PM25Text>{DEFINITIONS[1].desc}</PM25Text></p>
                                </div>
                                <ThresholdGraphic />
                            </div>

                            <div className="grid grid-cols-1 items-center gap-10 border-t border-slate-100 pt-10 lg:grid-cols-2 lg:gap-16">
                                <ThresholdGraphic red />
                                <div>
                                    <div className="flex items-center gap-4 mb-4"><span className="typo-label badge badge-sm h-8 w-8 rounded-full border-none bg-blue-100 p-0 text-blue-600">3</span><h4 className="typo-subtitle text-slate-800"><PM25Text>{DEFINITIONS[2].title}</PM25Text></h4></div>
                                    <span className="typo-label badge badge-error mb-4">&gt; 75 มคก./ลบ.ม.</span>
                                    <p className="typo-body-sm text-slate-600"><PM25Text>{DEFINITIONS[2].desc}</PM25Text></p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-10">
                                <div className="mb-8 text-center"><h4 className="typo-subtitle text-slate-800">แหล่งข้อมูลอ้างอิง</h4><p className="typo-body-sm mt-2 text-slate-500">ระบบฐานข้อมูลเชื่อมโยงจากหน่วยงานต่างๆ</p></div>
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                    {(['hdc', 'dds', 'air'] as const).map((kind, index) => { const def = DEFINITIONS[index + 3]; return <div key={def.id} className="card card-border overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-lg">
                                        <SourceGraphic kind={kind} />
                                        <div className="card-body p-6"><h4 className="typo-section flex items-start gap-3 text-slate-800"><span className="typo-label badge badge-sm h-6 w-6 shrink-0 rounded-full border-none bg-blue-100 p-0 text-blue-600">{def.id}</span><PM25Text>{def.title}</PM25Text></h4><p className="typo-body-sm flex-1 text-slate-600"><PM25Text>{def.desc}</PM25Text></p>{def.link && <a href={def.link} target="_blank" rel="noopener noreferrer" className="typo-label btn btn-sm btn-outline mt-3 w-full rounded-xl border-slate-200 text-blue-600 hover:bg-blue-50"><ExternalLinkIcon />ดูข้อมูลเพิ่มเติม</a>}</div>
                                    </div>; })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="mt-20 pb-12">
                    <div className="card card-border mx-auto w-fit max-w-[calc(100vw-2rem)] rounded-full border border-white/20 bg-slate-950/75 text-white shadow-lg shadow-slate-950/25 backdrop-blur-md">
                        <div className="overflow-x-auto px-5 py-2 md:px-7">
                            <p className="typo-caption whitespace-nowrap text-center text-white/85">
                                โดย กลุ่มเฝ้าระวังและตอบโต้ภาวะฉุกเฉิน กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม กรมควบคุมโรค
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
