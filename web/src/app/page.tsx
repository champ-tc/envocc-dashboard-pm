import Link from 'next/link';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import Image from 'next/image';
import GuestNavbar from '@/components/GuestNavbar';
import { getTopDustProvinces } from './dashboard/pm25/actions';

// --- Constants & Data ---
const DEFINITIONS = [
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
        ]
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
        desc: "ข้อมูลการเฝ้าระวังโรคดิจิทัล กองระบาดวิทยา กรมควบคุมโรค"
    },
    {
        id: 6,
        title: "ข้อมูลฝุ่นละออง PM2.5 (Air4Thai)",
        desc: "ข้อมูลการตรวจวัดรายชั่วโมงจากสถานีตรวจวัด 105 สถานี 77 จังหวัด กรมควบคุมมลพิษ"
    }
];

// --- Components ---
function StatCard({ item }: { item: { rank: number, name: string, count: number } }) {
    const rankColors = [
        'bg-amber-100 text-amber-600',
        'bg-slate-200 text-slate-600',
        'bg-orange-100 text-orange-600',
        'bg-blue-50 text-blue-600'
    ];
    return (
        <div className="bg-white/60 backdrop-blur-sm border border-slate-100 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3 shadow-inner ${rankColors[item.rank - 1] || rankColors[3]}`}>
                #{item.rank}
            </div>
            <div className="font-semibold text-slate-700 text-[13px] mb-1 leading-tight">{item.name}</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{item.count.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">มคก./ลบ.ม.</div>
        </div>
    );
}

function DefinitionBlock({ def }: { def: typeof DEFINITIONS[0] }) {
    return (
        <div className="bg-slate-50/60 rounded-2xl p-5 border border-slate-100/80 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40 transition-all duration-300 group">
            <h4 className={`font-bold flex items-start gap-3 mb-3 text-lg ${def.isAlert ? 'text-red-600' : 'text-slate-800'}`}>
                <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-0.5 group-hover:bg-opacity-100 transition-colors duration-300 shadow-sm ${def.isAlert ? 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    {def.id}
                </span>
                {def.title}
            </h4>
            <div className="pl-10">
                <p className="text-slate-600 text-[15px] leading-relaxed mb-4">{def.desc}</p>
                {def.items && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {def.items.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                                <svg className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                            </div>
                        ))}
                    </div>
                )}
                {def.link && (
                    <a target="_blank" href={def.link} rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-1 text-sky-600 hover:text-white hover:bg-sky-500 font-medium bg-sky-50 px-4 py-1.5 rounded-full transition-all text-sm border border-sky-100 shadow-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        ดูข้อมูลเพิ่มเติม
                    </a>
                )}
            </div>
        </div>
    );
}

// --- Main Page ---
export default async function HomePage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    let isLoggedIn = false;
    let role = '';

    if (token) {
        try {
            const secretKey = process.env.JWT_SECRET || 'my-super-secret';
            const SECRET = new TextEncoder().encode(secretKey);
            const { payload } = await jwtVerify(token, SECRET);
            isLoggedIn = true;
            role = payload.role as string;
        } catch { /* Token Invalid */ }
    }

    // Fetch Top 5 Provinces by PM2.5 using Server Action
    const topData = await getTopDustProvinces();
    const topProvinces = topData?.topProvinces || [];
    const latestUpdateDate = topData?.latestUpdateDate || '';

    return (
        <div className="min-h-screen flex flex-col items-center text-slate-900 relative overflow-hidden font-sans selection:bg-blue-200"
            style={{ backgroundImage: "url('/img/background.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            
            <div className="absolute inset-0 bg-white/10 z-0" />
            <GuestNavbar />

            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 z-0">
                <div className="w-[800px] h-[600px] bg-linear-to-tr from-blue-200/20 to-sky-100/10 rounded-full blur-[100px] opacity-40" />
            </div>
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 z-0">
                <div className="w-[600px] h-[500px] bg-linear-to-tr from-sky-100/20 to-blue-50/10 rounded-full blur-[80px] opacity-30" />
            </div>

            <div className="z-10 text-center space-y-8 md:space-y-12 px-4 max-w-5xl mx-auto mt-24 md:mt-32">
                {/* Hero Section */}
                <header className="space-y-4">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-lg leading-tight tracking-tight uppercase">
                        PM2.5 Patient Database <br className="hidden sm:block" /> 
                        <span className="text-xl sm:text-2xl md:text-3xl block mt-2 font-bold opacity-90 capitalize">ระบบฐานข้อมูลผู้ป่วยจากฝุ่นละอองขนาดเล็ก</span>
                    </h1>
                    
                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {isLoggedIn ? (
                            <Link href={(role === 'admin' || role === 'superadmin') ? '/admin' : '/user'}
                                className="w-full sm:w-auto px-12 py-4 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-full font-bold transition-all shadow-xl shadow-blue-500/30 hover:scale-105">
                                เข้าสู่หน้า Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href="/login"
                                    className="w-full sm:w-auto px-12 py-4 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-full font-bold transition-all shadow-xl shadow-blue-500/30 hover:scale-105">
                                    เข้าสู่ระบบ (Login)
                                </Link>
                                <Link href="/register"
                                    className="w-full sm:w-auto px-12 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-full font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                    สมัครสมาชิกใหม่
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                {/* Top 5 Summary Section */}
                <section className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-6 md:p-10 border border-white">
                    <div className="flex flex-col items-center justify-center mb-8 gap-1">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                            <div className="w-2 h-8 bg-rose-500 rounded-full shadow-lg shadow-rose-200" />
                            5 อันดับจังหวัดที่มีค่าฝุ่นสูงสุด
                        </h2>
                        {latestUpdateDate && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ข้อมูลล่าสุดวันที่: {latestUpdateDate}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {topProvinces.length > 0 ? (
                            topProvinces.map((item) => <StatCard key={item.rank} item={item} />)
                        ) : (
                            <div className="col-span-full py-12 text-slate-400 font-bold italic">กำลังโหลดข้อมูลสถานการณ์ฝุ่น...</div>
                        )}
                    </div>
                </section>

                {/* PM2.5 Information Section */}
                <section className="text-left bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-12 border border-white shadow-2xl">
                    <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-200/50">
                        <div className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-200">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">คำนิยามที่ควรรู้</h3>
                    </div>

                    <div className="space-y-6">
                        {DEFINITIONS.map((def) => <DefinitionBlock key={def.id} def={def} />)}
                    </div>
                </section>

                <footer className="mt-20 pb-12">
                    <p className="text-sm font-bold text-slate-500/70 tracking-widest uppercase">
                        โดย กลุ่มเฝ้าระวังและตอบโต้ภาวะฉุกเฉิน กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม กรมควบคุมโรค
                    </p>
                </footer>
            </div>
        </div>
    );
}
