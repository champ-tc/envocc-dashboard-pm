import Link from 'next/link';
import { ArrowUpRight, Database, FileCheck2, Gauge, MapPinned, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

import { requireRoles } from '@/lib/auth';

const shortcuts = [
    { href: '/admin/requests', label: 'คำขอข้อมูล', description: 'ตรวจสอบและอนุมัติคำขอ', icon: FileCheck2, roles: ['admin', 'adminenvocc', 'admin_department', 'superadmin'] },
    { href: '/admin/users', label: 'ผู้ใช้งาน', description: 'จัดการสิทธิ์และสถานะบัญชี', icon: UsersRound, roles: ['superadmin'] },
    { href: '/admin/stations', label: 'สถานีตรวจวัด', description: 'จัดการข้อมูลสถานี Air4Thai', icon: MapPinned, roles: ['superadmin'] },
    { href: '/admin/pm25-hourly', label: 'ค่าฝุ่นรายชั่วโมง', description: 'ตรวจสอบและแก้ไขข้อมูล', icon: Gauge, roles: ['superadmin'] },
    { href: '/admin/dds-upload', label: 'ข้อมูล DDS', description: 'อัปโหลดไฟล์เข้าสู่ pipeline', icon: Database, roles: ['superadmin'] },
];

export default async function AdminPage() {
    const session = await requireRoles(['admin', 'adminenvocc', 'admin_department', 'superadmin']);
    const availableShortcuts = shortcuts.filter((item) => item.roles.includes(session.role || ''));
    const roleLabel = session.role === 'superadmin'
        ? 'ผู้ดูแลระบบสูงสุด'
        : session.role === 'admin_department'
            ? 'ผู้ดูแลระบบระดับกรม'
        : session.role === 'adminenvocc'
            ? 'ผู้ดูแล EnvOcc'
            : 'ผู้ดูแลระบบ';

    return (
        <div className="auth-page">
            <section className="relative mb-10 min-h-[180px] overflow-hidden rounded-dashboard-card bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 px-7 py-8 text-white shadow-2xl shadow-slate-300/50 sm:px-9 lg:px-12">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-blue-600/20 via-transparent to-sky-400/15" />
                <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border-[42px] border-sky-300/10" />
                <div className="pointer-events-none absolute bottom-0 right-1/3 h-24 w-48 bg-blue-500/15 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="mb-4 flex items-center gap-2.5">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-400/15 text-sky-200 ring-1 ring-inset ring-sky-300/20">
                                <Sparkles className="size-4" />
                            </span>
                            <span className="text-xs font-semibold text-sky-100">{roleLabel}</span>
                        </div>
                        <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                            ยินดีต้อนรับ, <span className="text-blue-200">{session.name}</span>
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">ศูนย์กลางสำหรับบริหารข้อมูลสุขภาพ สิ่งแวดล้อม และสิทธิ์การใช้งานในที่เดียว</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 backdrop-blur-md">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                            <ShieldCheck className="size-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-400">สถานะระบบ</p>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-emerald-400" /></span>พร้อมใช้งาน</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="auth-page-header">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-menu-label text-blue-600">Workspace</p>
                    <h2 className="text-xl font-bold text-slate-900">พื้นที่จัดการของคุณ</h2>
                    <p className="auth-page-description">เครื่องมือและข้อมูลตามสิทธิ์ของบัญชี</p>
                </div>
            </div>

            <section className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {availableShortcuts.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} prefetch={false} className="auth-surface group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-[20px] p-6 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 transition-colors group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-600">
                                <Icon className="size-5" />
                            </span>
                            <span className="mt-7 flex items-end justify-between gap-3">
                                <span>
                                <span className="block font-bold text-slate-900">{item.label}</span>
                                <span className="mt-1 block text-sm leading-6 text-slate-500">{item.description}</span>
                                </span>
                                <ArrowUpRight className="mb-1 size-5 shrink-0 text-slate-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-blue-600" />
                            </span>
                        </Link>
                    );
                })}
            </section>
        </div>
    );
}
