import Link from 'next/link';
import { Activity, ArrowUpRight, Database, Download, Sparkles, UserRound } from 'lucide-react';

import BigDataDownload from '@/components/BigDataDownload';
import PM25Download from '@/components/PM25Download';
import { PM25Text } from '@/components/PM25Mark';
import { requireRoles } from '@/lib/auth';

export default async function UserMainPage() {
    const session = await requireRoles(['user']);

    return (
        <div className="auth-page">
            <section className="relative mb-8 overflow-hidden rounded-dashboard-card bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/70 md:p-9">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-600/40 via-transparent to-cyan-400/15" />
                <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[48px] border-white/5" />
                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 backdrop-blur">
                            <Sparkles className="size-3.5" />
                            พื้นที่ใช้งานของคุณ
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">สวัสดี, {session.name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">ติดตามสถานการณ์สุขภาพและสิ่งแวดล้อม พร้อมเข้าถึงชุดข้อมูลที่ได้รับอนุญาต</p>
                    </div>
                    <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-md md:block">
                        <p className="text-xs text-slate-300">บัญชีของคุณ</p>
                        <p className="mt-1 text-sm font-semibold">พร้อมใช้งาน <span className="ml-2 inline-block size-2 rounded-full bg-emerald-400" /></p>
                    </div>
                </div>
            </section>

            <div className="auth-page-header">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-menu-label text-blue-600">Explore data</p>
                    <h2 className="text-xl font-bold text-slate-900">เลือกพื้นที่ใช้งาน</h2>
                    <p className="auth-page-description">ดูข้อมูล วิเคราะห์สถานการณ์ หรือจัดการบัญชี</p>
                </div>
            </div>

            <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <QuickLink
                    href="/dashboard/pm25"
                    title="สถานการณ์ PM2.5"
                    description="ติดตามค่าฝุ่นรายพื้นที่และช่วงเวลา"
                    icon={<Activity className="size-5" />}
                    color="blue"
                />
                <QuickLink
                    href="/dashboard/hdc"
                    title="ข้อมูลผู้ป่วย HDC"
                    description="ดูแนวโน้มและสถิติผู้ป่วยจาก HDC"
                    icon={<Database className="size-5" />}
                    color="sky"
                />
                <QuickLink
                    href="/user/profile"
                    title="ข้อมูลส่วนตัว"
                    description="แก้ไขชื่อและเปลี่ยนรหัสผ่าน"
                    icon={<UserRound className="size-5" />}
                    color="violet"
                />
            </section>

            <section className="auth-surface overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/60 p-5 md:px-6">
                <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                        <Download className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">ดาวน์โหลดข้อมูล</h2>
                        <p className="text-sm text-slate-500">เลือกชุดข้อมูลและช่วงเวลาที่ต้องการ</p>
                    </div>
                </div>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 md:p-6 xl:grid-cols-2">
                    <PM25Download />
                    <BigDataDownload />
                </div>
            </section>
        </div>
    );
}

function QuickLink({
    href,
    title,
    description,
    icon,
    color,
}: {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'sky' | 'violet';
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',
        sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600',
        violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600',
    };

    return (
        <Link href={href} className="auth-surface group relative flex min-h-44 flex-col justify-between p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:text-white ${colors[color]}`}>
                {icon}
            </span>
            <span className="mt-7 flex items-end justify-between gap-3">
                <span>
                <span className="block font-bold text-slate-900"><PM25Text>{title}</PM25Text></span>
                <span className="mt-1 block text-sm leading-6 text-slate-500">{description}</span>
                </span>
                <ArrowUpRight className="mb-1 size-5 shrink-0 text-slate-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-blue-600" />
            </span>
        </Link>
    );
}
