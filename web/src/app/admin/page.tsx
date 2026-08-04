import Link from 'next/link';
import { ArrowUpRight, Database, FileCheck2, Gauge, MapPinned, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

import { requireRoles } from '@/lib/auth';

const shortcuts = [
    { href: '/admin/requests', label: 'คำขอข้อมูล', description: 'ตรวจสอบและอนุมัติคำขอ', icon: FileCheck2, roles: ['admin', 'adminenvocc', 'superadmin'] },
    { href: '/admin/users', label: 'ผู้ใช้งาน', description: 'จัดการสิทธิ์และสถานะบัญชี', icon: UsersRound, roles: ['superadmin'] },
    { href: '/admin/stations', label: 'สถานีตรวจวัด', description: 'จัดการข้อมูลสถานี Air4Thai', icon: MapPinned, roles: ['superadmin'] },
    { href: '/admin/pm25-hourly', label: 'ค่าฝุ่นรายชั่วโมง', description: 'ตรวจสอบและแก้ไขข้อมูล', icon: Gauge, roles: ['superadmin'] },
    { href: '/admin/dds-upload', label: 'ข้อมูล DDS', description: 'อัปโหลดไฟล์เข้าสู่ pipeline', icon: Database, roles: ['superadmin'] },
];

export default async function AdminPage() {
    const session = await requireRoles(['admin', 'adminenvocc', 'superadmin']);
    const availableShortcuts = shortcuts.filter((item) => item.roles.includes(session.role || ''));
    const roleLabel = session.role === 'superadmin'
        ? 'ผู้ดูแลระบบสูงสุด'
        : session.role === 'adminenvocc'
            ? 'ผู้ดูแล EnvOcc'
            : 'ผู้ดูแลระบบ';

    return (
        <div className="auth-page">
            <section className="relative mb-8 overflow-hidden rounded-dashboard-card bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/70 md:p-9">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-600/35 via-transparent to-sky-400/15" />
                <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[48px] border-white/5" />
                <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 bg-blue-500/20 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 backdrop-blur">
                            <Sparkles className="size-3.5" />
                            {roleLabel}
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">ยินดีต้อนรับ, {session.name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">ศูนย์กลางสำหรับบริหารข้อมูลสุขภาพ สิ่งแวดล้อม และสิทธิ์การใช้งานในที่เดียว</p>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                            <ShieldCheck className="size-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-300">สถานะระบบ</p>
                            <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-emerald-400" /> พร้อมใช้งาน</p>
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

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {availableShortcuts.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} prefetch={false} className="auth-surface group relative flex min-h-40 flex-col justify-between overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
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
