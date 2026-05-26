import Link from 'next/link';
import GuestNavbar from '@/components/GuestNavbar';

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
function DefinitionBlock({ def }: { def: typeof DEFINITIONS[0] }) {
    return (
        <div className="card bg-white/70 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
            <div className="card-body p-5 md:p-6">
                <h4 className={`card-title items-start gap-3 mb-1 text-lg ${def.isAlert ? 'text-red-500' : 'text-slate-800'}`}>
                    <span className={`badge badge-sm h-7 w-7 p-0 font-bold border-none text-white ${def.isAlert ? 'bg-red-500' : 'bg-linear-to-br from-blue-600 to-sky-500'}`}>
                        {def.id}
                    </span>
                    {def.title}
                </h4>
                <div className="pl-10">
                    <p className="text-slate-600 text-[15px] leading-relaxed mb-4">{def.desc}</p>
                    {def.items && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            {def.items.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-xs hover:border-blue-300 transition-colors">
                                    <svg className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {def.link && (
                        <div className="card-actions mt-4">
                            <a target="_blank" href={def.link} rel="noopener noreferrer" 
                                className="btn btn-sm btn-outline rounded-full font-medium shadow-xs border-blue-500 text-blue-600 hover:bg-linear-to-br hover:from-blue-600 hover:to-sky-500 hover:text-white hover:border-none">
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
export default async function HomePage() {
    return (
        <div className="min-h-screen flex flex-col items-center text-slate-900 relative overflow-hidden font-sans selection:bg-blue-100"
            style={{ backgroundImage: "url('/img/background.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            
            <div className="absolute inset-0 bg-white/20 z-0" />
            <GuestNavbar />

            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 z-0">
                <div className="w-[800px] h-[600px] bg-linear-to-tr from-blue-200/20 to-white/5 rounded-full blur-[100px] opacity-40" />
            </div>

            <div className="z-10 text-center space-y-8 md:space-y-12 px-4 max-w-5xl mx-auto mt-24 md:mt-32">
                {/* Hero Section */}
                <header className="space-y-4">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-lg leading-tight tracking-tight uppercase">
                        PM2.5 Patient Database <br className="hidden sm:block" /> 
                        <span className="text-xl sm:text-2xl md:text-3xl block mt-2 font-bold opacity-90 capitalize">ระบบฐานข้อมูลผู้ป่วยจากฝุ่นละอองขนาดเล็ก</span>
                    </h1>
                    
                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/login" className="btn btn-lg rounded-full px-12 shadow-xl shadow-blue-500/20 hover:scale-105 transition-all w-full sm:w-auto bg-linear-to-br from-blue-600 to-sky-500 border-none text-white hover:shadow-blue-500/40">
                            เข้าสู่ระบบ (Login)
                        </Link>
                        <Link href="/register" className="btn btn-lg btn-outline bg-white/90 rounded-full px-12 shadow-md hover:-translate-y-0.5 transition-all w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                            สมัครสมาชิกใหม่
                        </Link>
                    </div>
                </header>

                {/* PM2.5 Information Section */}
                <section className="text-left card bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                    <div className="card-body p-6 md:p-12">
                        <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-100">
                            <div className="bg-linear-to-br from-blue-600 to-sky-500 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-500/20">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="card-title text-3xl font-black tracking-tight text-slate-800">คำนิยามที่ควรรู้</h3>
                        </div>

                        <div className="space-y-6">
                            {DEFINITIONS.map((def) => <DefinitionBlock key={def.id} def={def} />)}
                        </div>
                    </div>
                </section>

                <footer className="mt-20 pb-12">
                    <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">
                        โดย กลุ่มเฝ้าระวังและตอบโต้ภาวะฉุกเฉิน กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม กรมควบคุมโรค
                    </p>
                </footer>
            </div>
        </div>
    );
}
