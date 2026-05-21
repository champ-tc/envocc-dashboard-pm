import { requireRoles } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import BigDataDownload from '@/components/BigDataDownload';
import PM25Download from '@/components/PM25Download';

export default async function UserMainPage() {
    const session = await requireRoles(['user']);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
            <Navbar session={session} />
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">ยินดีต้อนรับ</h1>
                    <p className="text-slate-500 font-medium">สวัสดีคุณ {session.name} | ระบบฐานข้อมูลผู้ป่วยโรคที่เกิดจากการรับสัมผัสฝุ่น PM2.5</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-10 bg-linear-to-br from-white to-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                        เมนูการใช้งานสำหรับคุณ
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        <Link href="/dashboard/pm25" className="group p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col gap-4">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">หน้าข้อมูล PM2.5</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">ดูสถานการณ์ฝุ่นละออง PM2.5 รายจังหวัดและรายเขตสุขภาพ</p>
                            </div>
                        </Link>

                        <Link href="/dashboard/hdc" className="group p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col gap-4">
                            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">หน้าข้อมูล HDC</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">รายงานสถิติผู้ป่วยจากฐานข้อมูล Health Data Center (HDC)</p>
                            </div>
                        </Link>

                        <Link href="/user/profile" className="group p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col gap-4">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-600 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">ข้อมูลส่วนตัว</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">ดูและแก้ไขข้อมูลส่วนตัวของคุณ</p>
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-10 bg-linear-to-br from-white to-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                        ดาวน์โหลดข้อมูล (Data Export)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        <PM25Download />
                        <BigDataDownload />
                    </div>
                </div>
            </main>
        </div>
    );
}
