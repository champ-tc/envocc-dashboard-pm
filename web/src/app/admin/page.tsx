import Link from 'next/link';
import { Database, FileCheck2, Gauge, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';

import { requireRoles } from '@/lib/auth';

const shortcuts = [
    { href: '/admin/requests', label: 'คำขอข้อมูล', description: 'ตรวจสอบและอนุมัติคำขอ', icon: FileCheck2, roles: ['admin', 'superadmin'] },
    { href: '/admin/users', label: 'ผู้ใช้งาน', description: 'จัดการสิทธิ์และสถานะบัญชี', icon: UsersRound, roles: ['superadmin'] },
    { href: '/admin/stations', label: 'สถานีตรวจวัด', description: 'จัดการข้อมูลสถานี Air4Thai', icon: MapPinned, roles: ['superadmin'] },
    { href: '/admin/pm25-hourly', label: 'ค่าฝุ่นรายชั่วโมง', description: 'ตรวจสอบและแก้ไขข้อมูล', icon: Gauge, roles: ['superadmin'] },
    { href: '/admin/dds-upload', label: 'ข้อมูล DDS', description: 'อัปโหลดไฟล์เข้าสู่ pipeline', icon: Database, roles: ['superadmin'] },
];

export default async function AdminPage() {
    const session = await requireRoles(['admin', 'superadmin']);
    const availableShortcuts = shortcuts.filter((item) => item.roles.includes(session.role || ''));
    const roleLabel = session.role === 'superadmin' ? 'ผู้ดูแลระบบสูงสุด' : 'ผู้ดูแลระบบ';

    return (
        <div className="auth-page">
            <section className="mb-6 overflow-hidden rounded-[2rem] bg-linear-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl shadow-slate-300/40 md:p-8">
                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
                            <ShieldCheck className="size-4" />
                            {roleLabel}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">สวัสดีคุณ {session.name}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">จัดการผู้ใช้งาน ชุดข้อมูล และการทำงานของระบบจากเมนูด้านล่าง</p>
                    </div>
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-2xl font-bold ring-1 ring-white/15">
                        {session.name.charAt(0).toUpperCase()}
                    </div>
                </div>
            </section>

            <div className="auth-page-header">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">เมนูที่ใช้บ่อย</h2>
                    <p className="auth-page-description">เข้าถึงงานหลักตามสิทธิ์ของบัญชีคุณ</p>
                </div>
            </div>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {availableShortcuts.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} className="auth-surface group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                <Icon className="size-5" />
                            </span>
                            <span>
                                <span className="block font-bold text-slate-900">{item.label}</span>
                                <span className="mt-1 block text-sm leading-6 text-slate-500">{item.description}</span>
                            </span>
                        </Link>
                    );
                })}
            </section>
        </div>
    );
}
